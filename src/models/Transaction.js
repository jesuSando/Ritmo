const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Transaction = sequelize.define('Transaction', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        validate: {
            isDecimal: true,
            min: 0.01
        }
    },
    type: {
        type: DataTypes.ENUM('income', 'expense', 'transfer'),
        allowNull: false
    },
    category: {
        type: DataTypes.ENUM(
            'salary', 'freelance', 'investment', 'other_income',
            'food', 'transport', 'housing', 'utilities', 'entertainment',
            'shopping', 'health', 'education', 'savings', 'other_expense'
        ),
        defaultValue: 'other_expense'
    },
    description: {
        type: DataTypes.STRING,
        allowNull: true
    },
    date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    isRecurring: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    recurrencePattern: {
        type: DataTypes.JSON,
        allowNull: true
    },
    isConfirmed: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    tableName: 'transactions',
    timestamps: true,
    hooks: {
        afterCreate: async (transaction, options) => {
            await updateAccountBalance(transaction, options);
        },
        afterUpdate: async (transaction, options) => {
            if (transaction.changed('amount') || transaction.changed('type') || transaction.changed('isConfirmed')) {
                await updateAccountBalance(transaction, options);
            }
        },
        afterDestroy: async (transaction, options) => {
            await revertAccountBalance(transaction, options);
        }
    }
});

async function updateAccountBalance(transaction, options) {
    const { FinanceAccount  } = require('./index');
    const account = await FinanceAccount .findByPk(transaction.accountId, { transaction: options?.transaction });

    if (!account) return;

    let balanceChange = parseFloat(transaction.amount);

    if (transaction.isConfirmed) {
        if (transaction.type === 'expense') {
            balanceChange = -balanceChange;
        } else if (transaction.type === 'transfer') {
            return;
        }

        await account.increment('currentBalance', {
            by: balanceChange,
            transaction: options?.transaction
        });
    }
}

async function revertAccountBalance(transaction, options) {
    const { FinanceAccount  } = require('./index');
    const account = await FinanceAccount .findByPk(transaction.accountId, { transaction: options?.transaction });

    if (!account || !transaction.isConfirmed) return;

    let balanceChange = parseFloat(transaction.amount);

    if (transaction.type === 'expense') {
        balanceChange = -balanceChange;
    }

    // Revertir el cambio
    await account.decrement('currentBalance', {
        by: balanceChange,
        transaction: options?.transaction
    });
}

Transaction.associate = function (models) {
    Transaction.belongsTo(models.User, { foreignKey: 'userId' });
    Transaction.belongsTo(models.FinanceAccount, { foreignKey: 'accountId' });
    Transaction.belongsTo(models.Budget, { foreignKey: 'budgetId', as: 'budget' });
};

module.exports = Transaction;