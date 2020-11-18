import request from 'superagent';
import { DateTime } from 'luxon';
import database from '../database';
import logger from '../logger';
const config = require('../../config.json');

interface PowerwallData {
    start_of_batch: string;
    solar_generation: number;
    solar_voltage: number;
    home_usage: number;
    home_voltage: number;
    grid_flow: number;
    battery_flow: number;
    battery_charge_percentage: number;
}

export async function uploadToPvoutput() {
    try {
        const data = await getAveragedDataFromDatabase();

        if (data.rows[0].start_of_batch !== null) {
            await sendAveragedDataToPvoutput(data.rows[0]);

            await uploadToPvoutput();
        }
    } catch (err) {
        logger(err, 'ERROR');
    }
}

async function getAveragedDataFromDatabase() {
    return await database.query(`
        SELECT
            (SELECT MAX(timestamp) FROM powerwall_data) - 300000 AS start_of_batch, -- 5 minutes in milliseconds
            AVG(solar_generation) AS solar_generation,
            AVG(solar_voltage) AS solar_voltage,
            AVG(home_usage) AS home_usage,
            AVG(home_voltage) AS home_voltage,
            AVG(grid_flow) AS grid_flow,
            AVG(battery_flow) AS battery_flow,
            AVG(battery_charge_percentage) AS battery_charge_percentage
        FROM powerwall_data
        WHERE timestamp > (
            (SELECT MAX(timestamp) FROM powerwall_data) - 300000 -- 5 minutes in milliseconds
        )`
    );
}

async function sendAveragedDataToPvoutput(data: PowerwallData) {
    const startOfBatch = config.timezone
        ? DateTime.fromMillis(parseInt(data.start_of_batch)).setZone(config.timezone)
        : DateTime.fromMillis(parseInt(data.start_of_batch));

    try {
        const payload = {
            d: startOfBatch.toFormat('yyyyLLdd'),
            t: startOfBatch.toFormat('HH:mm'),
            v2: data.solar_generation,
            v4: data.home_usage,
            v6: data.solar_voltage,
            v7: data.battery_flow,
            v8: data.home_usage,
            v9: data.battery_charge_percentage,
            v10: data.grid_flow,
            v11: data.solar_voltage,
            v12: data.solar_generation,
        }

        logger('Sending data to PVOutput:', 'DEBUG');

        logger(payload, 'DEBUG');

        const result = await request.post('https://pvoutput.org/service/r2/addstatus.jsp')
            .set({
                'X-Pvoutput-SystemId': config.pvoSystemId,
                'X-Pvoutput-Apikey': config.pvoApiKey,
            })
            .query(payload);

        if (result.status === 200) {
            logger(`Successfully sent data for batch at ${startOfBatch.toFormat('yyyyLLdd HH:mm')}`, 'DEBUG');

            await database.query('DELETE FROM powerwall_data WHERE timestamp > $1', [data.start_of_batch]);
        }
    } catch (err) {
        logger(err, 'ERROR');
    }
}
