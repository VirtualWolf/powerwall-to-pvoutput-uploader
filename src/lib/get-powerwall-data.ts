import request from 'superagent';
import { DateTime } from 'luxon';
import database from '../database';
import logger from '../logger';
const config = require('../../config.json');

export async function getPowerwallData() {
    try {
        const [currentLoad, batteryCharge] = await Promise.all([
            await request.get(`${config.powerwallUrl}/api/meters/aggregates`).disableTLSCerts(),
            await request.get(`${config.powerwallUrl}/api/system_status/soe`).disableTLSCerts()
        ]);

        const values = [
            DateTime.utc().valueOf(),
            currentLoad.body.solar.instant_power,           // solar_generation
            currentLoad.body.solar.instant_average_voltage, // solar_voltage
            currentLoad.body.load.instant_power,            // home_usage
            currentLoad.body.load.instant_average_voltage,  // home_voltage
            currentLoad.body.site.instant_power,            // grid_flow
            currentLoad.body.battery.instant_power,         // battery_flow
            batteryCharge.body.percentage,                  // battery_charge_percentage
        ];

        await database.query(`INSERT INTO powerwall_data
            (timestamp, solar_generation, solar_voltage, home_usage, home_voltage, grid_flow, battery_flow, battery_charge_percentage)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            values,
        );

        logger(`Logged values: ${values}`, 'DEBUG');
    } catch (err) {
        logger(err, 'ERROR');
    }
}
