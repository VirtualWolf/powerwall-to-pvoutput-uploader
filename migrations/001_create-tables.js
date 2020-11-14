const knex = require('knex');

exports.up = async (knex) => {
    await knex.raw(`CREATE TABLE IF NOT EXISTS powerwall_data (
        timestamp BIGINT PRIMARY KEY,
        solar_generation REAL,
        solar_voltage REAL,
        home_usage REAL,
        home_voltage REAL,
        grid_flow REAL,
        battery_flow REAL,
        battery_charge_percentage REAL
    )`);
}

exports.down = async (knex) => {
    await knex.raw('DROP TABLE powerwall_data');
}
