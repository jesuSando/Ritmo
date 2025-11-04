const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const TaskDependency = sequelize.define('TaskDependency', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    }
}, {
    tableName: 'task_dependencies',
    timestamps: true
});

TaskDependency.associate = function (models) {
    TaskDependency.belongsTo(models.Task, { foreignKey: 'taskId', as: 'task' });
    TaskDependency.belongsTo(models.Task, { foreignKey: 'dependsOnTaskId', as: 'dependsOn' });
};

module.exports = TaskDependency;