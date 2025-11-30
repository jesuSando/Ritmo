const express = require('express');
const cors = require('cors');
require('dotenv').config();

const sequelize = require('./src/config/db');
const associations = require('./src/models');
const routes = require('./src/routes/index');
const syncDatabase = require('./src/scripts/syncDatabase');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api', routes);
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Backend funcionando',
        timestamp: new Date().toISOString()
    });
});

app.use((req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
});

const PORT = process.env.PORT;

async function startServer() {
    try {
        await sequelize.authenticate();
        console.log('Conexión a DB establecida');

        if (process.env.NODE_ENV === 'development') {
            await sequelize.sync({ alter: true });
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