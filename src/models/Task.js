const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Task = sequelize.define('Task', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: true,
            len: [1, 255]
        }
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    startTime: {
        type: DataTypes.DATE,
        allowNull: false
    },
    endTime: {
        type: DataTypes.DATE,
        allowNull: false
    },
    allowOverlap: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    status: {
        type: DataTypes.ENUM('pending', 'completed', 'discarded'),
        defaultValue: 'pending'
    },
    priority: {
        type: DataTypes.ENUM('low', 'medium', 'high'),
        defaultValue: 'medium'
    }
}, {
    tableName: 'tasks',
    timestamps: true
});

Task.associate = function (models) {
    Task.belongsTo(models.User, { foreignKey: 'userId' });
    Task.belongsTo(models.Routine, {
        foreignKey: 'originRoutineId',
        as: 'originRoutine'
    });
    Task.belongsToMany(models.Task, {
        through: models.TaskDependency,
        as: 'dependencies',
        foreignKey: 'taskId'
    });
    Task.belongsToMany(models.Task, {
        through: models.TaskDependency,
        as: 'dependentTasks',
        foreignKey: 'dependsOnTaskId'
    });
};

module.exports = Task;