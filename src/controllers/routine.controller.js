const { Routine, Task, TimeBlock, sequelize } = require('../models');
const { Op } = require('sequelize');

const routineController = {
    createRoutine: async (req, res) => {
        const transaction = await sequelize.transaction();
        try {
            const {
                name,
                daysOfWeek,
                startTime,
                duration,
                conflictPolicy = 'skip',
                generateInitialTasks = true
            } = req.body;

            if (!Array.isArray(daysOfWeek) || daysOfWeek.length === 0) {
                await transaction.rollback();
                return res.status(400).json({ error: 'Debe especificar al menos un día de la semana' });
            }

            const invalidDays = daysOfWeek.filter(day => day < 0 || day > 6);
            if (invalidDays.length > 0) {
                await transaction.rollback();
                return res.status(400).json({ error: `Días inválidos: ${invalidDays.join(', ')}. Use 0-6 (Domingo-Sábado)` });
            }

            const routine = await Routine.create({
                userId: req.user.id,
                name,
                daysOfWeek,
                startTime,
                duration,
                conflictPolicy,
                isActive: true
            }, { transaction });

            let generatedTasks = [];
            if (generateInitialTasks) {
                generatedTasks = await generateRoutineOccurrences(routine, req.user.id, transaction);
            }

            await transaction.commit();

            res.status(201).json({
                message: 'Rutina creada exitosamente',
                routine,
                generatedTasks: {
                    count: generatedTasks.length,
                    tasks: generatedTasks
                }
            });
        } catch (error) {
            await transaction.rollback();
            res.status(500).json({ error: 'Error creando rutina: ' + error.message });
        }
    },


    getUserRoutines: async (req, res) => {
        try {
            const routines = await Routine.findAll({
                where: { userId: req.user.id },
                include: [{
                    model: Task,
                    as: 'generatedTasks',
                    attributes: ['id', 'title', 'startTime', 'status']
                }],
                order: [['createdAt', 'DESC']]
            });

            res.json({ routines });
        } catch (error) {
            res.status(500).json({ error: 'Error obteniendo rutinas: ' + error.message });
        }
    },

    getRoutineWithTasks: async (req, res) => {
        try {
            const routine = await Routine.findOne({
                where: {
                    id: req.params.id,
                    userId: req.user.id
                },
                include: [{
                    model: Task,
                    as: 'generatedTasks',
                    attributes: ['id', 'title', 'startTime', 'endTime', 'status'],
                    order: [['startTime', 'ASC']]
                }]
            });

            if (!routine) {
                return res.status(404).json({ error: 'Rutina no encontrada' });
            }

            res.json({ routine });
        } catch (error) {
            res.status(500).json({ error: 'Error obteniendo rutina: ' + error.message });
        }
    },

    generateOccurrences: async (req, res) => {
        const transaction = await sequelize.transaction();
        try {
            const routine = await Routine.findOne({
                where: {
                    id: req.params.id,
                    userId: req.user.id
                },
                transaction
            });

            if (!routine) {
                await transaction.rollback();
                return res.status(404).json({ error: 'Rutina no encontrada' });
            }

            const generatedTasks = await generateRoutineOccurrences(routine, req.user.id, transaction);
            await transaction.commit();

            res.json({
                message: 'Ocurrencias generadas exitosamente',
                generatedTasks: {
                    count: generatedTasks.length,
                    tasks: generatedTasks
                }
            });
        } catch (error) {
            await transaction.rollback();
            res.status(500).json({ error: 'Error generando ocurrencias: ' + error.message });
        }
    },

    updateRoutine: async (req, res) => {
        try {
            const routine = await Routine.findOne({
                where: {
                    id: req.params.id,
                    userId: req.user.id
                }
            });

            if (!routine) {
                return res.status(404).json({ error: 'Rutina no encontrada' });
            }

            await routine.update(req.body);

            res.json({
                message: 'Rutina actualizada exitosamente',
                routine
            });
        } catch (error) {
            res.status(500).json({ error: 'Error actualizando rutina: ' + error.message });
        }
    },

    deleteRoutine: async (req, res) => {
        try {
            const routine = await Routine.findOne({
                where: {
                    id: req.params.id,
                    userId: req.user.id
                }
            });

            if (!routine) {
                return res.status(404).json({ error: 'Rutina no encontrada' });
            }

            await routine.destroy();

            res.json({ message: 'Rutina eliminada exitosamente' });
        } catch (error) {
            res.status(500).json({ error: 'Error eliminando rutina: ' + error.message });
        }
    },

    toggleRoutine: async (req, res) => {
        try {
            const routine = await Routine.findOne({
                where: {
                    id: req.params.id,
                    userId: req.user.id
                }
            });

            if (!routine) {
                return res.status(404).json({ error: 'Rutina no encontrada' });
            }

            await routine.update({ isActive: !routine.isActive });

            res.json({
                message: `Rutina ${routine.isActive ? 'activada' : 'pausada'} exitosamente`,
                routine
            });
        } catch (error) {
            res.status(500).json({ error: 'Error cambiando estado de rutina: ' + error.message });
        }
    }
};

async function generateRoutineOccurrences(routine, userId, transaction = null) {
    const generatedTasks = [];
    const now = new Date();
    const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    const options = transaction ? { transaction } : {};

    for (let day = 0; day < 14; day++) {
        const currentDate = new Date(now.getTime() + day * 24 * 60 * 60 * 1000);
        const dayOfWeek = currentDate.getDay();

        if (routine.daysOfWeek.includes(dayOfWeek)) {
            const [hours, minutes] = routine.startTime.split(':');
            const startTime = new Date(currentDate);
            startTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

            const endTime = new Date(startTime.getTime() + routine.duration * 60000);

            // Solo generar si está en el futuro y no existe ya
            if (startTime > now && startTime <= twoWeeksFromNow) {
                try {
                    // Verificar si ya existe una tarea para este horario y rutina
                    const existingTask = await Task.findOne({
                        where: {
                            userId,
                            originRoutineId: routine.id,
                            startTime: {
                                [Op.between]: [
                                    new Date(startTime.getTime() - 60000), // 1 minuto antes
                                    new Date(startTime.getTime() + 60000)  // 1 minuto después
                                ]
                            }
                        },
                        ...options
                    });

                    if (!existingTask) {
                        // Verificar conflicto con bloques de tiempo
                        const conflictingTimeBlock = await TimeBlock.findOne({
                            where: {
                                userId,
                                recurringDays: {
                                    [Op.overlap]: [dayOfWeek]
                                },
                                [Op.or]: [
                                    {
                                        startTime: { [Op.lte]: routine.startTime },
                                        endTime: { [Op.gt]: routine.startTime }
                                    },
                                    {
                                        startTime: { [Op.lt]: endTime.toTimeString().slice(0, 8) },
                                        endTime: { [Op.gte]: endTime.toTimeString().slice(0, 8) }
                                    }
                                ]
                            },
                            ...options
                        });

                        if (conflictingTimeBlock && routine.conflictPolicy === 'skip') {
                            continue; // Saltar esta ocurrencia
                        }

                        const task = await Task.create({
                            userId,
                            title: routine.name,
                            startTime,
                            endTime,
                            allowOverlap: false,
                            status: 'pending',
                            originRoutineId: routine.id
                        }, options);

                        generatedTasks.push(task);
                    }
                } catch (error) {
                    console.log(`Error generando tarea para ${startTime}:`, error.message);
                    // Continuar con la siguiente ocurrencia
                }
            }
        }
    }

    return generatedTasks;
}

module.exports = routineController;