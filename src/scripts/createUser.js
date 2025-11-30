const sequelize = require('../src/config/db');
const { User } = require('../src/models');

async function createTestUser() {
    try {
        await sequelize.authenticate();
        console.log('Conectado a la base de datos');

        const existingUser = await User.findOne({ where: { email: 'test@example.com' } });
        
        if (existingUser) {
            console.log('Usuario ya existe:');
            console.log(`   Email: ${existingUser.email}`);
            return;
        }

        const testUser = await User.create({
            name: 'User Test',
            email: 'test@example.com',
            password: '123456'
        });

        console.log('Usuario creado exitosamente:');
        console.log(`   ID: ${testUser.id}`);
        console.log(`   Nombre: ${testUser.name}`);
        console.log(`   Email: ${testUser.email}`);
        
    } catch (error) {
        console.error('Error creando usuario de prueba:', error.message);
        process.exit(1);
    } finally {
        await sequelize.close();
    }
}

if (require.main === module) {
    createTestUser();
}

module.exports = createTestUser;