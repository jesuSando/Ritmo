const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const FinanceAccount = sequelize.define('FinanceAccount', {
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
    type: {
        type: DataTypes.ENUM('cash', 'bank_account', 'credit_card', 'digital_wallet', 'savings'),
        defaultValue: 'bank_account'
    },
    currency: {
        type: DataTypes.ENUM('CLP', 'USD', 'UF'),
        defaultValue: 'CLP'
    },
    initialBalance: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0,
        validate: {
            isDecimal: true
        }
    },
    currentBalance: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0,
        validate: {
            isDecimal: true
        }
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    tableName: 'finance_accounts',
    timestamps: true,
    hooks: {
        afterCreate: async (account) => {
            await account.update({ currentBalance: account.initialBalance });
        }
    }
});

FinanceAccount.associate = function (models) {
    FinanceAccount.belongsTo(models.User, { foreignKey: 'userId' });
    FinanceAccount.hasMany(models.Transaction, { foreignKey: 'accountId', as: 'transactions' });
    FinanceAccount.hasMany(models.Budget, { foreignKey: 'accountId' });
};

module.exports = FinanceAccount;