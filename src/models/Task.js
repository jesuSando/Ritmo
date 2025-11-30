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
        allowNull: false,
        validate: {
            isDate: true,
            isAfterCurrent(value) {
                if (new Date(value) < new Date()) {
                    throw new Error('startTime no puede ser en el pasado');
                }
            }
        }
    },
    endTime: {
        type: DataTypes.DATE,
        allowNull: false,
        validate: {
            isDate: true,
            isAfterStart(value) {
                if (new Date(value) <= new Date(this.startTime)) {
                    throw new Error('endTime debe ser después de startTime');
                }
            }
        }
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
    timestamps: true,
    hooks: {
        beforeValidate: (task) => {
            if (task.startTime && task.endTime) {
                const start = new Date(task.startTime);
                const end = new Date(task.endTime);

                if (end <= start) {
                    throw new Error('endTime debe ser posterior a startTime');
                }

                const duration = end - start;
                if (duration < 60000) { // 60,000 ms = 1 minuto
                    throw new Error('La duración mínima de la tarea debe ser 1 minuto');
                }
            }
        }
    }
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