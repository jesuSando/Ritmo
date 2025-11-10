const { Task, Routine, sequelize } = require('../models');
const { Op, fn, col, literal } = require('sequelize');

const statsController = {
    getUserStats: async (req, res) => {
        try {
            const userId = req.user.id;

            const taskStats = await Task.findAll({
                where: { userId },
                attributes: [
                    'status',
                    [fn('COUNT', col('id')), 'count']
                ],
                group: ['status'],
                raw: true
            });

            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            const completionTrend = await Task.findAll({
                where: {
                    userId,
                    status: 'completed',
                    updatedAt: { [Op.gte]: sevenDaysAgo }
                },
                attributes: [
                    [fn('DATE', col('updatedAt')), 'date'],
                    [fn('COUNT', col('id')), 'completedCount']
                ],
                group: [fn('DATE', col('updatedAt'))],
                order: [[fn('DATE', col('updatedAt')), 'ASC']],
                raw: true
            });

            // Rutinas activas
            const activeRoutines = await Routine.count({
                where: {
                    userId,
                    isActive: true
                }
            });

            // Próximas tareas
            const upcomingTasks = await Task.count({
                where: {
                    userId,
                    status: 'pending',
                    startTime: { [Op.gte]: new Date() }
                }
            });

            // Tareas vencidas
            const overdueTasks = await Task.count({
                where: {
                    userId,
                    status: 'pending',
                    endTime: { [Op.lt]: new Date() }
                }
            });

            res.json({
                taskStats: taskStats.reduce((acc, stat) => {
                    acc[stat.status] = parseInt(stat.count);
                    return acc;
                }, {}),
                completionTrend,
                routines: {
                    active: activeRoutines,
                    total: await Routine.count({ where: { userId } })
                },
                tasks: {
                    upcoming: upcomingTasks,
                    overdue: overdueTasks,
                    total: await Task.count({ where: { userId } })
                }
            });
        } catch (error) {
            res.status(500).json({ error: 'Error obteniendo estadísticas: ' + error.message });
        }
    },

    getProductivity: async (req, res) => {
        try {
            const { period = 'week' } = req.query; // week, month, year
            const userId = req.user.id;

            let dateRange;
            const now = new Date();

            switch (period) {
                case 'week':
                    dateRange = new Date(now.setDate(now.getDate() - 7));
                    break;
                case 'month':
                    dateRange = new Date(now.setMonth(now.getMonth() - 1));
                    break;
                case 'year':
                    dateRange = new Date(now.setFullYear(now.getFullYear() - 1));
                    break;
                default:
                    dateRange = new Date(now.setDate(now.getDate() - 7));
            }

            const productivity = await Task.findAll({
                where: {
                    userId,
                    updatedAt: { [Op.gte]: dateRange }
                },
                attributes: [
                    [fn('DATE', col('updatedAt')), 'date'],
                    [fn('COUNT', col('id')), 'totalTasks'],
                    [literal(`COUNT(CASE WHEN status = 'completed' THEN 1 END)`), 'completedTasks'],
                    [literal(`COUNT(CASE WHEN status = 'discarded' THEN 1 END)`), 'discardedTasks']
                ],
                group: [fn('DATE', col('updatedAt'))],
                order: [[fn('DATE', col('updatedAt')), 'ASC']],
                raw: true
            });

            res.json({
                period,
                dateRange,
                productivity
            });
        } catch (error) {
            res.status(500).json({ error: 'Error obteniendo productividad: ' + error.message });
        }
    }
};

module.exports = statsController;