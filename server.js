const express = require('express');
const cors = require('cors');
require('dotenv').config();

const sequelize = require('./src/config/db');
const associations = require('./src/models/associations');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'RitmoApp Backend funcionando',
        timestamp: new Date().toISOString()
    });
});

const PORT = process.env.PORT;

async function startServer() {
    try {
        await sequelize.authenticate();
        console.log('Conexión a DB establecida');

        // en desarrollo sincronizar modelos
        if (process.env.NODE_ENV === 'development') {
            await sequelize.sync({ force: false });
            console.log('Modelos sincronizados');
        }

        app.listen(PORT, () => {
            console.log(`Servidor corriendo en puerto ${PORT}`);
            console.log(`Entorno ${process.env.NODE_ENV}`);
        });
    } catch (error) {
        console.error('Error al iniciar servidor:', error);
        process.exit(1);
    }
}

startServer();