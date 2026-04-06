require('dotenv').config();
const { Client } = require('pg');

const dbName = process.env.DB_NAME || 'qr_tracker';
const dbUser = process.env.DB_USER || 'postgres';
const dbPassword = process.env.DB_PASSWORD || '';
const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = process.env.DB_PORT || 5432;

async function createDatabase() {
    // Connect to the default 'postgres' database
    const client = new Client({
        user: dbUser,
        password: dbPassword,
        host: dbHost,
        port: dbPort,
        database: 'postgres'
    });

    try {
        await client.connect();
        
        // Check if database exists
        const res = await client.query(`SELECT 1 FROM pg_database WHERE datname = '${dbName}'`);
        
        if (res.rowCount === 0) {
            console.log(`Database "${dbName}" not found. Creating...`);
            await client.query(`CREATE DATABASE ${dbName}`);
            console.log(`Database "${dbName}" created successfully.`);
        } else {
            console.log(`Database "${dbName}" already exists.`);
        }
    } catch (err) {
        if (err.code === '42P04') {
             console.log(`Database "${dbName}" already exists.`);
        } else {
             console.error('Error creating database:', err);
             process.exit(1);
        }
    } finally {
        await client.end();
    }
}

createDatabase();
