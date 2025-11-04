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
        defaultValue: []
    },
    startTime: {
        type: DataTypes.TIME,
        allowNull: false
    },
    duration: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: 1
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