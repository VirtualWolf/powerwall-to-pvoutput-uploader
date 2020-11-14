import { Pool } from 'pg';
const config = require('../config.json');

export = new Pool({
    host: config.database.host,
    port: config.database.port,
    user: config.database.user,
    password: config.database.password,
    database: config.database.database,
});
