const { Task, TaskDependency, Routine, sequelize } = require('../models');
const { Op } = require('sequelize');

const taskController = {
    // Crear nueva tarea
    createTask: async (req, res) => {
        const transaction = await sequelize.transaction();
        try {
            const {
                title,
                description,
                startTime,
                endTime,
                allowOverlap = false,
                priority = 'medium',
                dependencies = []
            } = req.body;

            // Validar solapamiento si no permite overlap
            if (!allowOverlap) {
                const overlappingTask = await Task.findOne({
                    where: {
                        userId: req.user.id,
                        status: 'pending',
                        [Op.or]: [
                            {
                                startTime: { [Op.between]: [startTime, endTime] }
                            },
                            {
                                endTime: { [Op.between]: [startTime, endTime] }
                            },
                            {
                                [Op.and]: [
                                    { startTime: { [Op.lte]: startTime } },
                                    { endTime: { [Op.gte]: endTime } }
                                ]
                            }
                        ]
                    },
                    transaction
                });

                if (overlappingTask) {
                    await transaction.rollback();
                    return res.status(400).json({
                        error: 'Conflicto de horario con otra tarea',
                        conflictingTask: overlappingTask
                    });
                }
            }

            // Crear tarea
            const task = await Task.create({
                userId: req.user.id,
                title,
                description,
                startTime,
                endTime,
                allowOverlap,
                priority,
                status: 'pending'
            }, { transaction });

            // Manejar dependencias si existen
            if (dependencies.length > 0) {
                const dependencyRecords = dependencies.map(depId => ({
                    taskId: task.id,
                    dependsOnTaskId: depId
                }));
                await TaskDependency.bulkCreate(dependencyRecords, { transaction });
            }

            await transaction.commit();

            // Cargar tarea con dependencias
            const taskWithDeps = await Task.findByPk(task.id, {
                include: [
                    {
                        model: Task,
                        as: 'dependencies',
                        through: { attributes: [] }
                    }
                ]
            });

            res.status(201).json({
                message: 'Tarea creada exitosamente',
                task: taskWithDeps
            });
        } catch (error) {
            await transaction.rollback();
            res.status(500).json({ error: 'Error creando tarea: ' + error.message });
        }
    },

    // Obtener todas las tareas del usuario
    getUserTasks: async (req, res) => {
        try {
            const { status, startDate, endDate } = req.query;

            const whereClause = { userId: req.user.id };

            // Filtrar por status si se proporciona
            if (status) {
                whereClause.status = status;
            }

            // Filtrar por rango de fechas si se proporciona
            if (startDate && endDate) {
                whereClause.startTime = {
                    [Op.between]: [new Date(startDate), new Date(endDate)]
                };
            }

            const tasks = await Task.findAll({
                where: whereClause,
                include: [
                    {
                        model: Task,
                        as: 'dependencies',
                        through: { attributes: [] }
                    },
                    {
                        model: Routine,
                        as: 'originRoutine',
                        attributes: ['id', 'name']
                    }
                ],
                order: [['startTime', 'ASC']]
            });

            res.json({ tasks });
        } catch (error) {
            res.status(500).json({ error: 'Error obteniendo tareas: ' + error.message });
        }
    },

    // Obtener tarea por ID
    getTaskById: async (req, res) => {
        try {
            const task = await Task.findOne({
                where: {
                    id: req.params.id,
                    userId: req.user.id
                },
                include: [
                    {
                        model: Task,
                        as: 'dependencies',
                        through: { attributes: [] }
                    },
                    {
                        model: Task,
                        as: 'dependentTasks',
                        through: { attributes: [] }
                    }
                ]
            });

            if (!task) {
                return res.status(404).json({ error: 'Tarea no encontrada' });
            }

            res.json({ task });
        } catch (error) {
            res.status(500).json({ error: 'Error obteniendo tarea: ' + error.message });
        }
    },

    // Actualizar tarea
    updateTask: async (req, res) => {
        const transaction = await sequelize.transaction();
        try {
            const task = await Task.findOne({
                where: {
                    id: req.params.id,
                    userId: req.user.id
                }
            });

            if (!task) {
                await transaction.rollback();
                return res.status(404).json({ error: 'Tarea no encontrada' });
            }

            // Validar que no se complete una tarea con dependencias pendientes
            if (req.body.status === 'completed') {
                const pendingDependencies = await TaskDependency.findAll({
                    where: { taskId: task.id },
                    include: [{
                        model: Task,
                        as: 'dependsOnTask',
                        where: { status: { [Op.ne]: 'completed' } }
                    }]
                }, { transaction });

                if (pendingDependencies.length > 0) {
                    await transaction.rollback();
                    return res.status(400).json({
                        error: 'No se puede completar la tarea. Hay dependencias pendientes.',
                        pendingDependencies
                    });
                }
            }

            await task.update(req.body, { transaction });
            await transaction.commit();

            res.json({
                message: 'Tarea actualizada exitosamente',
                task
            });
        } catch (error) {
            await transaction.rollback();
            res.status(500).json({ error: 'Error actualizando tarea: ' + error.message });
        }
    },

    // Eliminar tarea
    deleteTask: async (req, res) => {
        const transaction = await sequelize.transaction();
        try {
            const task = await Task.findOne({
                where: {
                    id: req.params.id,
                    userId: req.user.id
                }
            });

            if (!task) {
                await transaction.rollback();
                return res.status(404).json({ error: 'Tarea no encontrada' });
            }

            // Eliminar dependencias relacionadas
            await TaskDependency.destroy({
                where: {
                    [Op.or]: [
                        { taskId: task.id },
                        { dependsOnTaskId: task.id }
                    ]
                },
                transaction
            });

            await task.destroy({ transaction });
            await transaction.commit();

            res.json({ message: 'Tarea eliminada exitosamente' });
        } catch (error) {
            await transaction.rollback();
            res.status(500).json({ error: 'Error eliminando tarea: ' + error.message });
        }
    },

    // Descartar tarea
    discardTask: async (req, res) => {
        try {
            const task = await Task.findOne({
                where: {
                    id: req.params.id,
                    userId: req.user.id
                }
            });

            if (!task) {
                return res.status(404).json({ error: 'Tarea no encontrada' });
            }

            await task.update({ status: 'discarded' });

            res.json({
                message: 'Tarea descartada exitosamente',
                task
            });
        } catch (error) {
            res.status(500).json({ error: 'Error descartando tarea: ' + error.message });
        }
    },

    // Obtener próximas tareas (para futuro sistema de notificaciones)
    getUpcomingTasks: async (req, res) => {
        try {
            const { range = 60 } = req.query; // minutos por defecto
            const now = new Date();
            const rangeEnd = new Date(now.getTime() + range * 60000);

            const tasks = await Task.findAll({
                where: {
                    userId: req.user.id,
                    status: 'pending',
                    startTime: {
                        [Op.between]: [now, rangeEnd]
                    }
                },
                order: [['startTime', 'ASC']]
            });

            res.json({ tasks });
        } catch (error) {
            res.status(500).json({ error: 'Error obteniendo próximas tareas: ' + error.message });
        }
    }
};

module.exports = taskController;