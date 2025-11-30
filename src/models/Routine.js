const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Routine = sequelize.define('Routine', {
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
            len: [1, 255]
        }
    },
    daysOfWeek: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
        validate: {
            isValidDaysArray(value) {
                if (!Array.isArray(value) || value.length === 0) {
                    throw new Error('Debe especificar al menos un día de la semana');
                }
                const invalidDays = value.filter(day => day < 0 || day > 6);
                if (invalidDays.length > 0) {
                    throw new Error(`Días inválidos: ${invalidDays.join(', ')}. Use 0-6 (Domingo-Sábado)`);
                }
            }
        }
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
    duration: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: 1,
            max: 1440 // Máximo 24 horas
        }
    },
    conflictPolicy: {
        type: DataTypes.ENUM('skip', 'push', 'notify', 'force'),
        defaultValue: 'skip'
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    tableName: 'routines',
    timestamps: true
});


Routine.associate = function (models) {
    Routine.belongsTo(models.User, { foreignKey: 'userId' });
    Routine.hasMany(models.Task, {
        foreignKey: 'originRoutineId',
        as: 'generatedTasks'
    });
};

module.exports = Routine;