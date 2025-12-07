const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Budget = sequelize.define('Budget', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: true,
            len: [1, 100]
        }
    },
    amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        validate: {
            isDecimal: true,
            min: 0.01
        }
    },
    category: {
        type: DataTypes.ENUM(
            'food', 'transport', 'housing', 'utilities', 'entertainment',
            'shopping', 'health', 'education', 'savings', 'other'
        ),
        allowNull: false
    },
    period: {
        type: DataTypes.ENUM('daily', 'weekly', 'monthly', 'yearly'),
        defaultValue: 'monthly'
    },
    startDate: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    endDate: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    spentAmount: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0,
        validate: {
            isDecimal: true
        }
    },
    remainingAmount: {
        type: DataTypes.VIRTUAL,
        get() {
            const spent = parseFloat(this.spentAmount) || 0;
            const total = parseFloat(this.amount) || 0;
            return total - spent;
        }
    }
}, {
    tableName: 'budgets',
    timestamps: true,
    hooks: {
        afterUpdate: async (budget) => {
            if (budget.changed('spentAmount')) {
                budget.changed('spentAmount', false); // Resetear flag
            }
        }
    }
});

Budget.associate = function (models) {
    Budget.belongsTo(models.User, { foreignKey: 'userId' });
    Budget.belongsTo(models.FinanceAccount, { foreignKey: 'accountId' });
    Budget.hasMany(models.Transaction, { foreignKey: 'budgetId' });
};

module.exports = Budget;