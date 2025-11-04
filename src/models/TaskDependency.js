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

module.exports = TaskDependency;