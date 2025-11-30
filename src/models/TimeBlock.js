const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const TimeBlock = sequelize.define('TimeBlock', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    startTime: {
        type: DataTypes.TIME,
        allowNull: false,
        validate: {
            isValidTime(value) {
                const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/;
                if (!timeRegex.test(value)) {
                    throw new Error('Formato de hora inválido. Use HH:MM:SS');
                }
            }
        }
    },
    endTime: {
        type: DataTypes.TIME,
        allowNull: false,
        validate: {
            isValidTime(value) {
                const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/;
                if (!timeRegex.test(value)) {
                    throw new Error('Formato de hora inválido. Use HH:MM:SS');
                }
            },
            isAfterStart(value) {
                if (value <= this.startTime) {
                    throw new Error('endTime debe ser después de startTime');
                }
            }
        }
    },
    recurringDays: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
        validate: {
            isValidDaysArray(value) {
                if (!Array.isArray(value)) {
                    throw new Error('recurringDays debe ser un array');
                }
                const invalidDays = value.filter(day => day < 0 || day > 6);
                if (invalidDays.length > 0) {
                    throw new Error(`Días inválidos: ${invalidDays.join(', ')}. Use 0-6 (Domingo-Sábado)`);
                }
            }
        }
    },
    description: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    tableName: 'time_blocks',
    timestamps: true,
    hooks: {
        beforeValidate: (timeBlock) => {
            if (timeBlock.recurringDays && Array.isArray(timeBlock.recurringDays)) {
                timeBlock.recurringDays = [...new Set(timeBlock.recurringDays)].sort();
            }
        }
    }
});

TimeBlock.associate = function (models) {
    TimeBlock.belongsTo(models.User, { foreignKey: 'userId' });
};

module.exports = TimeBlock;