const config = require('./config.json');

module.exports = {
    client: 'pg',
    connection: {
        host: config.database.host,
        port: config.database.port,
        user: config.database.user,
        password: config.database.password,
        database: config.database.database,
    },
    migrations: {
        directory: './migrations',
    }
}
