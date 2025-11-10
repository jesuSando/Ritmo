const { TimeBlock, sequelize } = require('../models');
const { Op } = require('sequelize');

const timeBlockController = {
    createTimeBlock: async (req, res) => {
        try {
            const { startTime, endTime, recurringDays, description } = req.body;

            if (new Date(endTime) <= new Date(startTime)) {
                return res.status(400).json({ error: 'La hora de fin debe ser después de la hora de inicio' });
            }

            const timeBlock = await TimeBlock.create({
                userId: req.user.id,
                startTime,
                endTime,
                recurringDays: recurringDays || [],
                description
            });

            res.status(201).json({
                message: 'Bloque de tiempo creado exitosamente',
                timeBlock
            });
        } catch (error) {
            res.status(500).json({ error: 'Error creando bloque de tiempo: ' + error.message });
        }
    },

    getUserTimeBlocks: async (req, res) => {
        try {
            const timeBlocks = await TimeBlock.findAll({
                where: { userId: req.user.id },
                order: [['startTime', 'ASC']]
            });

            res.json({ timeBlocks });
        } catch (error) {
            res.status(500).json({ error: 'Error obteniendo bloques de tiempo: ' + error.message });
        }
    },

    checkAvailability: async (req, res) => {
        try {
            const { startTime, endTime, date } = req.query;

            if (!startTime || !endTime) {
                return res.status(400).json({ error: 'startTime y endTime son requeridos' });
            }

            const targetDate = date ? new Date(date) : new Date();
            const dayOfWeek = targetDate.getDay();

            const conflictingBlocks = await TimeBlock.findAll({
                where: {
                    userId: req.user.id,
                    recurringDays: {
                        [Op.overlap]: [dayOfWeek] // Bloques que incluyen este día
                    },
                    [Op.or]: [
                        {
                            startTime: { [Op.lte]: startTime },
                            endTime: { [Op.gt]: startTime }
                        },
                        {
                            startTime: { [Op.lt]: endTime },
                            endTime: { [Op.gte]: endTime }
                        },
                        {
                            startTime: { [Op.gte]: startTime },
                            endTime: { [Op.lte]: endTime }
                        }
                    ]
                }
            });

            const isAvailable = conflictingBlocks.length === 0;

            res.json({
                isAvailable,
                requestedTime: { startTime, endTime, date: targetDate },
                conflictingBlocks: isAvailable ? [] : conflictingBlocks
            });
        } catch (error) {
            res.status(500).json({ error: 'Error verificando disponibilidad: ' + error.message });
        }
    },

    updateTimeBlock: async (req, res) => {
        try {
            const timeBlock = await TimeBlock.findOne({
                where: {
                    id: req.params.id,
                    userId: req.user.id
                }
            });

            if (!timeBlock) {
                return res.status(404).json({ error: 'Bloque de tiempo no encontrado' });
            }

            await timeBlock.update(req.body);

            res.json({
                message: 'Bloque de tiempo actualizado exitosamente',
                timeBlock
            });
        } catch (error) {
            res.status(500).json({ error: 'Error actualizando bloque de tiempo: ' + error.message });
        }
    },

    deleteTimeBlock: async (req, res) => {
        try {
            const timeBlock = await TimeBlock.findOne({
                where: {
                    id: req.params.id,
                    userId: req.user.id
                }
            });

            if (!timeBlock) {
                return res.status(404).json({ error: 'Bloque de tiempo no encontrado' });
            }

            await timeBlock.destroy();

            res.json({ message: 'Bloque de tiempo eliminado exitosamente' });
        } catch (error) {
            res.status(500).json({ error: 'Error eliminando bloque de tiempo: ' + error.message });
        }
    }
};

module.exports = timeBlockController;