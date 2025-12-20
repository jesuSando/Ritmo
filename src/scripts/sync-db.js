require('dotenv').config();
const { sequelize } = require('../models');

async function syncDatabase() {
    if (process.env.NODE_ENV !== 'development') {
        console.error('DB sync disabled outside development');
        process.exit(1);
    }

    try {
        await sequelize.authenticate();
        console.log('DB connected');

        /**
         * sync()              -> crea tablas si no existen
         * sync({ alter: true }) -> ajusta columnas (solo DEV)
         * sync({ force: true }) -> DROP + CREATE (peligroso)
         */
        await sequelize.sync({ alter: true });

        console.log('Models synchronized');
        process.exit(0);
    } catch (error) {
        console.error('Sync error:', error);
        process.exit(1);
    }
}

syncDatabase();
