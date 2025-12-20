require('dotenv').config();
const mysql = require('mysql2/promise');

async function initDatabase() {
    if (process.env.NODE_ENV !== 'development') {
        console.error('DB init disabled outside development');
        process.exit(1);
    }

    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD
        });

        const dbName = process.env.DB_NAME;

        console.log(`Creating database "${dbName}"...`);

        await connection.query(`
            CREATE DATABASE IF NOT EXISTS \`${dbName}\`
            CHARACTER SET utf8mb4
            COLLATE utf8mb4_unicode_ci
        `);

        await connection.end();
        console.log('Database ready');
        process.exit(0);
    } catch (error) {
        console.error('Error creating database:', error);
        process.exit(1);
    }
}

initDatabase();
