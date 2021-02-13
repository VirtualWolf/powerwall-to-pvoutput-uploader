import request from 'superagent';
import { DateTime } from 'luxon';
import { getToken } from './get-token';
import database from '../database';
import logger from '../logger';
const config = require('../../config.json');

export async function getPowerwallData() {
    try {
        let token = await getToken();

        const [currentLoad, batteryCharge] = await Promise.all([
            await request.get(`${config.powerwallUrl}/api/meters/aggregates`)
                .set('Cookie', `AuthCookie=${token}`)
                .disableTLSCerts(),
            await request.get(`${config.powerwallUrl}/api/system_status/soe`)
                .set('Cookie', `AuthCookie=${token}`)
                .disableTLSCerts()
        ]);

        const values = [
            DateTime.utc().valueOf(),
            // This is necessary because PVOutput will reject negative values for
            // solar generation, understandably, and occasionally very small or negative values
            // can be returned from the Powerwall.
            currentLoad.body.solar.instant_power <= 30      // solar_generation
                ? 0
                : currentLoad.body.solar.instant_power,
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
        if (err.status === 401 || err.status === 403) {
            await getToken(true);
        }

        logger(err.message, 'ERROR');
    }
}
