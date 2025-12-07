const sequelize = require('../config/db');

// rutinas
const User = require('./User');
const Task = require('./Task');
const Routine = require('./Routine');
const TimeBlock = require('./TimeBlock');
const TaskDependency = require('./TaskDependency');

// finanzas
const FinanceAccount = require('./FinanceAccount');
const Transaction = require('./Transaction');
const Budget = require('./Budget');


const models = {
    User: User,
    Task: Task,
    Routine: Routine,
    TimeBlock: TimeBlock,
    TaskDependency: TaskDependency,
    FinanceAccount: FinanceAccount,
    Transaction: Transaction,
    Budget: Budget,
};

// Configurar asociaciones
Object.keys(models).forEach(modelName => {
    if (models[modelName].associate) {
        models[modelName].associate(models);
    }
});

// Asociaciones manuales
User.hasMany(Task, { foreignKey: 'userId' });
Task.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Routine, { foreignKey: 'userId' });
Routine.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(TimeBlock, { foreignKey: 'userId' });
TimeBlock.belongsTo(User, { foreignKey: 'userId' });

// Exportar todo
module.exports = {
    sequelize,
    ...models
};