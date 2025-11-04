const { Routine, Task, sequelize } = require('../models');
const { Op } = require('sequelize');

const routineController = {
    // Crear nueva rutina
    createRoutine: async (req, res) => {
        try {
            const {
                name,
                daysOfWeek,
                startTime,
                duration,
                conflictPolicy = 'skip'
            } = req.body;

            // Validar días de la semana
            if (!Array.isArray(daysOfWeek) || daysOfWeek.length === 0) {
                return res.status(400).json({ error: 'Debe especificar al menos un día de la semana' });
            }

            const routine = await Routine.create({
                userId: req.user.id,
                name,
                daysOfWeek,
                startTime,
                duration,
                conflictPolicy,
                isActive: true
            });

            // Generar próximas ocurrencias
            await generateRoutineOccurrences(routine, req.user.id);

            res.status(201).json({
                message: 'Rutina creada exitosamente',
                routine
            });
        } catch (error) {
            res.status(500).json({ error: 'Error creando rutina: ' + error.message });
        }
    },

    // Obtener todas las rutinas del usuario
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

    // Generar ocurrencias para una rutina
    generateOccurrences: async (req, res) => {
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

            const generatedTasks = await generateRoutineOccurrences(routine, req.user.id);

            res.json({
                message: 'Ocurrencias generadas exitosamente',
                generatedTasks,
                count: generatedTasks.length
            });
        } catch (error) {
            res.status(500).json({ error: 'Error generando ocurrencias: ' + error.message });
        }
    },

    // Actualizar rutina
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

    // Eliminar rutina
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

    // Pausar/Reactivar rutina
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

// Función auxiliar para generar ocurrencias de rutina
async function generateRoutineOccurrences(routine, userId) {
    const generatedTasks = [];
    const now = new Date();
    const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    for (let day = 0; day < 14; day++) {
        const currentDate = new Date(now.getTime() + day * 24 * 60 * 60 * 1000);
        const dayOfWeek = currentDate.getDay(); // 0 = Domingo, 1 = Lunes, etc.

        if (routine.daysOfWeek.includes(dayOfWeek)) {
            const [hours, minutes] = routine.startTime.split(':');
            const startTime = new Date(currentDate);
            startTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

            const endTime = new Date(startTime.getTime() + routine.duration * 60000);

            // Solo generar si está en el futuro
            if (startTime > now && startTime <= twoWeeksFromNow) {
                try {
                    const task = await Task.create({
                        userId,
                        title: routine.name,
                        startTime,
                        endTime,
                        allowOverlap: false, // Por defecto no permitir solapamiento en rutinas
                        status: 'pending',
                        originRoutineId: routine.id
                    });

                    generatedTasks.push(task);
                } catch (error) {
                    // Manejar conflicto según la política
                    if (routine.conflictPolicy === 'push') {
                        // Implementar lógica para encontrar siguiente horario disponible
                        console.log('Implementar lógica push para conflicto');
                    }
                    // Para 'skip' simplemente no creamos la tarea
                    console.log(`Conflicto en ${startTime}, política: ${routine.conflictPolicy}`);
                }
            }
        }
    }

    return generatedTasks;
}

module.exports = routineController;