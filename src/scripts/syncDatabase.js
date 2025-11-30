const sequelize = require('../config/db');
const { User, Task, Routine, TimeBlock, TaskDependency } = require('../models');

async function syncDatabase() {
    try {
        await sequelize.authenticate();
        console.log('Conexión a DB establecida');

        const syncOptions = {
            force: process.argv.includes('--force') || process.env.NODE_ENV === 'test',
            alter: process.argv.includes('--alter') || process.env.NODE_ENV === 'development'
        };

        console.log('Sincronizando modelos...');

        await sequelize.sync(syncOptions);

        console.log('Modelos sincronizados exitosamente');

        if (process.argv.includes('--create-test-data')) {
            await createTestData();
        }

    } catch (error) {
        console.error('Error sincronizando base de datos:', error.message);
        process.exit(1);
    } finally {
        await sequelize.close();
        console.log('Conexión cerrada');
    }
}

async function createTestData() {
    try {
        console.log('Creando datos de prueba...');

        const userCount = await User.count();
        if (userCount === 0) {
            const testUser = await User.create({
                name: 'Usuario de Prueba',
                email: 'test@example.com',
                password: '123456'
            });
            console.log('Usuario de prueba creado');
        } else {
            console.log('ℹYa existen usuarios en la base de datos');
        }

    } catch (error) {
        console.error('Error creando datos de prueba:', error.message);
    }
}

if (require.main === module) {
    syncDatabase();
}

module.exports = syncDatabase;