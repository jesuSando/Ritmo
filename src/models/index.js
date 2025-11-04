const sequelize = require('../config/db');

// Importar modelos
const User = require('./User');
const Task = require('./Task');
const Routine = require('./Routine');
const TimeBlock = require('./TimeBlock');
const TaskDependency = require('./TaskDependency');

// Inicializar modelos
const models = {
    User: User,
    Task: Task,
    Routine: Routine,
    TimeBlock: TimeBlock,
    TaskDependency: TaskDependency
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