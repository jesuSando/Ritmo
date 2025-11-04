const { Task, TaskDependency, Routine, sequelize } = require('../models');
const { Op } = require('sequelize');

const taskController = {
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

            if (dependencies && dependencies.length > 0) {
                const existingDependencies = await Task.findAll({
                    where: {
                        id: dependencies,
                        userId: req.user.id
                    },
                    transaction
                });

                if (existingDependencies.length !== dependencies.length) {
                    await transaction.rollback();
                    return res.status(400).json({
                        error: 'Algunas tareas dependientes no existen o no te pertenecen',
                        invalidDependencies: dependencies.filter(depId =>
                            !existingDependencies.find(task => task.id === depId)
                        )
                    });
                }

                const validDependencies = dependencies.filter(depId =>
                    depId !== task.id // Evitar dependencia consigo misma
                );

                if (validDependencies.length > 0) {
                    const dependencyRecords = validDependencies.map(depId => ({
                        taskId: task.id,
                        dependsOnTaskId: depId
                    }));

                    await TaskDependency.bulkCreate(dependencyRecords, { transaction });
                }
            }

            await transaction.commit();

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
            console.error('Error creando tarea:', error);
            res.status(500).json({ error: 'Error creando tarea: ' + error.message });
        }
    },

    getUserTasks: async (req, res) => {
        try {
            const { status, startDate, endDate } = req.query;

            const whereClause = { userId: req.user.id };

            if (status) {
                whereClause.status = status;
            }

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

            if (req.body.status === 'completed') {
                const pendingDependencies = await task.getDependencies({
                    where: { status: { [Op.ne]: 'completed' } },
                    transaction
                });

                if (pendingDependencies.length > 0) {
                    await transaction.rollback();
                    return res.status(400).json({
                        error: 'No se puede completar la tarea. Hay dependencias pendientes.',
                        pendingDependencies: pendingDependencies.map(t => ({ id: t.id, title: t.title }))
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
    },

    addDependency: async (req, res) => {
        const transaction = await sequelize.transaction();
        try {
            const { dependsOnTaskId } = req.body;
            const taskId = req.params.id;

            const [task, dependsOnTask] = await Promise.all([
                Task.findOne({ where: { id: taskId, userId: req.user.id } }),
                Task.findOne({ where: { id: dependsOnTaskId, userId: req.user.id } })
            ]);

            if (!task || !dependsOnTask) {
                await transaction.rollback();
                return res.status(404).json({ error: 'Tarea no encontrada' });
            }

            if (taskId === dependsOnTaskId) {
                await transaction.rollback();
                return res.status(400).json({ error: 'Una tarea no puede depender de sí misma' });
            }

            const existingDependency = await TaskDependency.findOne({
                where: { taskId, dependsOnTaskId },
                transaction
            });

            if (existingDependency) {
                await transaction.rollback();
                return res.status(400).json({ error: 'La dependencia ya existe' });
            }

            await TaskDependency.create({
                taskId,
                dependsOnTaskId
            }, { transaction });

            await transaction.commit();

            res.json({
                message: 'Dependencia agregada exitosamente',
                dependency: {
                    taskId,
                    dependsOnTaskId
                }
            });
        } catch (error) {
            await transaction.rollback();
            res.status(500).json({ error: 'Error agregando dependencia: ' + error.message });
        }
    }
};

module.exports = taskController;