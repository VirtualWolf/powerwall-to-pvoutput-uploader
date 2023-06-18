require('dotenv').config();

module.exports = {
    client: 'pg',
    connection: {
        host: process.env.POSTGRES_HOST || 'postgres',
        port: process.env.POSTGRES_PORT
            ? parseInt(process.env.POSTGRES_PORT)
            : 5432,
        user: process.env.POSTGRES_USER || 'postgres',
        password: process.env.POSTGRES_PASSWORD,
        database: process.env.POSTGRES_DB || 'postgres',
    },
    migrations: {
        directory: './migrations',
    }
}
