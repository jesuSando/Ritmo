const { FinanceAccount, Transaction, Budget, sequelize } = require('../models');
const { Op } = require('sequelize');

const financeController = {
    createAccount: async (req, res) => {
        try {
            const { name, type, currency, initialBalance } = req.body;

            const account = await FinanceAccount.create({
                userId: req.user.id,
                name,
                type,
                currency,
                initialBalance: initialBalance || 0,
                currentBalance: initialBalance || 0
            });

            res.status(201).json({
                message: 'Cuenta creada exitosamente',
                account
            });
        } catch (error) {
            res.status(500).json({ error: 'Error creando cuenta: ' + error.message });
        }
    },

    getAccounts: async (req, res) => {
        try {
            const accounts = await FinanceAccount.findAll({
                where: { userId: req.user.id },
                include: [{
                    model: Transaction,
                    as: 'transactions',
                    limit: 5,
                    order: [['date', 'DESC']]
                }],
                order: [['createdAt', 'DESC']]
            });

            const totalBalance = accounts.reduce((sum, acc) => {
                return sum + parseFloat(acc.currentBalance);
            }, 0);

            res.json({
                accounts,
                summary: {
                    totalAccounts: accounts.length,
                    totalBalance,
                    activeAccounts: accounts.filter(a => a.isActive).length
                }
            });
        } catch (error) {
            res.status(500).json({ error: 'Error obteniendo cuentas: ' + error.message });
        }
    },

    createTransaction: async (req, res) => {
        const transaction = await sequelize.transaction();
        try {
            const { accountId, amount, type, category, description, date, budgetId } = req.body;

            const account = await FinanceAccount.findOne({
                where: { id: accountId, userId: req.user.id },
                transaction
            });

            if (!account) {
                await transaction.rollback();
                return res.status(404).json({ error: 'Cuenta no encontrada' });
            }

            // Verificar saldo para gastos
            if (type === 'expense') {
                if (parseFloat(account.currentBalance) < parseFloat(amount)) {
                    await transaction.rollback();
                    return res.status(400).json({
                        error: 'Saldo insuficiente',
                        currentBalance: account.currentBalance,
                        required: amount
                    });
                }
            }

            const newTransaction = await Transaction.create({
                userId: req.user.id,
                accountId,
                amount,
                type,
                category,
                description,
                date: date || new Date(),
                budgetId
            }, { transaction });

            if (type === 'transfer') {
                const { toAccountId } = req.body;
                if (!toAccountId) {
                    await transaction.rollback();
                    return res.status(400).json({ error: 'toAccountId es requerido para transferencias' });
                }

                const toAccount = await FinanceAccount.findOne({
                    where: { id: toAccountId, userId: req.user.id },
                    transaction
                });

                if (!toAccount) {
                    await transaction.rollback();
                    return res.status(404).json({ error: 'Cuenta destino no encontrada' });
                }

                await Transaction.create({
                    userId: req.user.id,
                    accountId: toAccountId,
                    amount,
                    type: 'income',
                    category: 'other_income',
                    description: `Transferencia de ${account.name}`,
                    date: date || new Date(),
                    isConfirmed: true
                }, { transaction });

                await account.decrement('currentBalance', {
                    by: amount,
                    transaction
                });

                await toAccount.increment('currentBalance', {
                    by: amount,
                    transaction
                });
            }

            if (budgetId && type === 'expense') {
                const budget = await Budget.findOne({
                    where: { id: budgetId, userId: req.user.id },
                    transaction
                });

                if (budget) {
                    await budget.increment('spentAmount', {
                        by: amount,
                        transaction
                    });
                }
            }

            await transaction.commit();

            res.status(201).json({
                message: 'Transacción creada exitosamente',
                transaction: newTransaction
            });
        } catch (error) {
            await transaction.rollback();
            res.status(500).json({ error: 'Error creando transacción: ' + error.message });
        }
    },

    getTransactions: async (req, res) => {
        try {
            const {
                startDate,
                endDate,
                type,
                category,
                accountId,
                page = 1,
                limit = 20
            } = req.query;

            const whereClause = { userId: req.user.id };
            const offset = (page - 1) * limit;

            // Filtros
            if (startDate && endDate) {
                whereClause.date = {
                    [Op.between]: [new Date(startDate), new Date(endDate)]
                };
            }

            if (type) whereClause.type = type;
            if (category) whereClause.category = category;
            if (accountId) whereClause.accountId = accountId;

            const { count, rows: transactions } = await Transaction.findAndCountAll({
                where: whereClause,
                include: [
                    {
                        model: FinanceAccount,
                        attributes: ['id', 'name', 'type']
                    },
                    {
                        model: Budget,
                        as: 'budget',
                        attributes: ['id', 'name', 'category']
                    }
                ],
                order: [['date', 'DESC'], ['createdAt', 'DESC']],
                limit: parseInt(limit),
                offset: parseInt(offset)
            });

            // Calcular totales
            const totals = await Transaction.findAll({
                where: whereClause,
                attributes: [
                    'type',
                    [sequelize.fn('SUM', sequelize.col('amount')), 'total']
                ],
                group: ['type']
            });

            res.json({
                transactions,
                pagination: {
                    total: count,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(count / limit)
                },
                totals: totals.reduce((acc, curr) => {
                    acc[curr.type] = parseFloat(curr.dataValues.total) || 0;
                    return acc;
                }, { income: 0, expense: 0, transfer: 0 })
            });
        } catch (error) {
            res.status(500).json({ error: 'Error obteniendo transacciones: ' + error.message });
        }
    },

    createBudget: async (req, res) => {
        try {
            const { name, amount, category, period, startDate, endDate, accountId } = req.body;

            const budget = await Budget.create({
                userId: req.user.id,
                accountId,
                name,
                amount,
                category,
                period,
                startDate,
                endDate
            });

            res.status(201).json({
                message: 'Presupuesto creado exitosamente',
                budget
            });
        } catch (error) {
            res.status(500).json({ error: 'Error creando presupuesto: ' + error.message });
        }
    },

    getBudgets: async (req, res) => {
        try {
            const { period, isActive } = req.query;

            const whereClause = { userId: req.user.id };
            if (period) whereClause.period = period;
            if (isActive !== undefined) whereClause.isActive = isActive === 'true';

            const budgets = await Budget.findAll({
                where: whereClause,
                include: [{
                    model: FinanceAccount,
                    attributes: ['id', 'name']
                }],
                order: [['startDate', 'DESC']]
            });

            const totalBudget = budgets.reduce((sum, b) => sum + parseFloat(b.amount), 0);
            const totalSpent = budgets.reduce((sum, b) => sum + parseFloat(b.spentAmount), 0);

            res.json({
                budgets,
                summary: {
                    totalBudgets: budgets.length,
                    totalBudget,
                    totalSpent,
                    remaining: totalBudget - totalSpent
                }
            });
        } catch (error) {
            res.status(500).json({ error: 'Error obteniendo presupuestos: ' + error.message });
        }
    },

    getBudgetProgress: async (req, res) => {
        try {
            const budget = await Budget.findOne({
                where: {
                    id: req.params.id,
                    userId: req.user.id
                },
                include: [{
                    model: Transaction,
                    attributes: ['id', 'amount', 'description', 'date']
                }]
            });

            if (!budget) {
                return res.status(404).json({ error: 'Presupuesto no encontrado' });
            }

            const now = new Date();
            const start = new Date(budget.startDate);
            const end = budget.endDate ? new Date(budget.endDate) : now;

            const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
            const elapsedDays = Math.ceil((now - start) / (1000 * 60 * 60 * 24));

            let expectedSpent = 0;
            switch (budget.period) {
                case 'daily':
                    expectedSpent = budget.amount * elapsedDays;
                    break;
                case 'weekly':
                    expectedSpent = (budget.amount / 7) * elapsedDays;
                    break;
                case 'monthly':
                    expectedSpent = (budget.amount / 30) * elapsedDays;
                    break;
                case 'yearly':
                    expectedSpent = (budget.amount / 365) * elapsedDays;
                    break;
            }

            res.json({
                budget,
                progress: {
                    spentAmount: parseFloat(budget.spentAmount),
                    remainingAmount: budget.remainingAmount,
                    percentage: (parseFloat(budget.spentAmount) / parseFloat(budget.amount)) * 100,
                    expectedSpent,
                    isOverBudget: parseFloat(budget.spentAmount) > parseFloat(budget.amount),
                    days: {
                        total: totalDays,
                        elapsed: Math.min(elapsedDays, totalDays),
                        remaining: Math.max(0, totalDays - elapsedDays)
                    }
                }
            });
        } catch (error) {
            res.status(500).json({ error: 'Error obteniendo progreso: ' + error.message });
        }
    },

    getFinanceStats: async (req, res) => {
        try {
            const { startDate, endDate } = req.query;

            const dateFilter = {};
            if (startDate && endDate) {
                dateFilter.date = {
                    [Op.between]: [new Date(startDate), new Date(endDate)]
                };
            } else {
                // Último mes por defecto
                const lastMonth = new Date();
                lastMonth.setMonth(lastMonth.getMonth() - 1);
                dateFilter.date = { [Op.gte]: lastMonth };
            }

            const incomeVsExpense = await Transaction.findAll({
                where: {
                    userId: req.user.id,
                    type: { [Op.in]: ['income', 'expense'] },
                    ...dateFilter
                },
                attributes: [
                    'type',
                    [sequelize.fn('SUM', sequelize.col('amount')), 'total']
                ],
                group: ['type']
            });

            const expensesByCategory = await Transaction.findAll({
                where: {
                    userId: req.user.id,
                    type: 'expense',
                    ...dateFilter
                },
                attributes: [
                    'category',
                    [sequelize.fn('SUM', sequelize.col('amount')), 'total'],
                    [sequelize.fn('COUNT', sequelize.col('id')), 'count']
                ],
                group: ['category'],
                order: [[sequelize.fn('SUM', sequelize.col('amount')), 'DESC']]
            });

            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

            const monthlyBalance = await Transaction.findAll({
                where: {
                    userId: req.user.id,
                    date: { [Op.gte]: sixMonthsAgo }
                },
                attributes: [
                    [sequelize.fn('DATE_FORMAT', sequelize.col('date'), '%Y-%m'), 'month'],
                    'type',
                    [sequelize.fn('SUM', sequelize.col('amount')), 'total']
                ],
                group: ['month', 'type'],
                order: [['month', 'ASC']]
            });

            const activeBudgets = await Budget.findAll({
                where: {
                    userId: req.user.id,
                    isActive: true,
                    startDate: { [Op.lte]: new Date() },
                    [Op.or]: [
                        { endDate: null },
                        { endDate: { [Op.gte]: new Date() } }
                    ]
                },
                attributes: ['id', 'name', 'category', 'amount', 'spentAmount']
            });

            res.json({
                period: { startDate: dateFilter.date[Op.gte], endDate: new Date() },
                summary: {
                    totalIncome: incomeVsExpense.find(i => i.type === 'income')?.total || 0,
                    totalExpense: incomeVsExpense.find(i => i.type === 'expense')?.total || 0,
                    netBalance: (incomeVsExpense.find(i => i.type === 'income')?.total || 0) -
                        (incomeVsExpense.find(i => i.type === 'expense')?.total || 0)
                },
                expensesByCategory,
                monthlyBalance,
                activeBudgets,
                accounts: await FinanceAccount.count({ where: { userId: req.user.id } }),
                transactions: await Transaction.count({
                    where: { userId: req.user.id, ...dateFilter }
                })
            });
        } catch (error) {
            res.status(500).json({ error: 'Error obteniendo estadísticas: ' + error.message });
        }
    }
};

// Funciones auxiliares
async function getUpcomingBills(userId) {
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    return await Transaction.findAll({
        where: {
            userId,
            type: 'expense',
            date: { [Op.between]: [today, nextWeek] },
            isConfirmed: false
        },
        include: [{
            model: FinanceAccount,
            attributes: ['id', 'name']
        }],
        order: [['date', 'ASC']],
        limit: 5
    });
}

async function getMonthlyTotal(userId, type) {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const result = await Transaction.findOne({
        where: {
            userId,
            type,
            date: { [Op.between]: [firstDay, lastDay] }
        },
        attributes: [
            [sequelize.fn('SUM', sequelize.col('amount')), 'total']
        ]
    });

    return parseFloat(result?.dataValues.total) || 0;
}

module.exports = financeController;