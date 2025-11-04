const User = require('./User');
const Task = require('./Task');
const Routine = require('./Routine');
const TimeBlock = require('./TimeBlock');
const TaskDependency = require('./TaskDependency');

// User tiene muchas Tasks
User.hasMany(Task, { foreignKey: 'userId' });
Task.belongsTo(User, { foreignKey: 'userId' });

// User tiene muchas Routines
User.hasMany(Routine, { foreignKey: 'userId' });
Routine.belongsTo(User, { foreignKey: 'userId' });

// User tiene muchos TimeBlocks
User.hasMany(TimeBlock, { foreignKey: 'userId' });
TimeBlock.belongsTo(User, { foreignKey: 'userId' });

// Routine genera Tasks
Routine.hasMany(Task, {
    foreignKey: 'originRoutineId',
    as: 'generatedTasks'
});
Task.belongsTo(Routine, {
    foreignKey: 'originRoutineId',
    as: 'originRoutine'
});

// Dependencias entre Tasks
Task.belongsToMany(Task, {
    through: TaskDependency,
    as: 'dependencies',
    foreignKey: 'taskId',
    otherKey: 'dependsOnTaskId'
});

Task.belongsToMany(Task, {
    through: TaskDependency,
    as: 'dependentTasks',
    foreignKey: 'dependsOnTaskId',
    otherKey: 'taskId'
});

module.exports = {
    User,
    Task,
    Routine,
    TimeBlock,
    TaskDependency
};