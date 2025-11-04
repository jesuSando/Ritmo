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
        allowNull: false
    },
    endTime: {
        type: DataTypes.TIME,
        allowNull: false
    },
    recurringDays: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: []
    },
    description: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    tableName: 'time_blocks',
    timestamps: true
});

module.exports = TimeBlock;