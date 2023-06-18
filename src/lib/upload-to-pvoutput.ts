import request from 'superagent';
import { DateTime } from 'luxon';
import database from '../database';
import logger from '../logger';

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

interface PVOutputPayload {
    d: string;
    t: string;
    v2: number;
    v4: number;
    v6: number;
    v7?: number;
    v8?: number;
    v9?: number;
    v10?: number;
    v11?: number;
    v12?: number;
}

export async function uploadToPvoutput() {
    try {
        const data = await getAveragedDataFromDatabase();
        const startOfBatch = data.rows[0].start_of_batch;

        const fiveMinutesAgo = DateTime.utc().minus({minutes: 5});

        if (startOfBatch !== null && DateTime.fromMillis(parseInt(startOfBatch)) <= fiveMinutesAgo ) {
            logger(`startOfBatch ${startOfBatch} was less than or equal to ${fiveMinutesAgo.valueOf()}, sending data...`, 'DEBUG');

            await sendAveragedDataToPvoutput(data.rows[0]);

            // Wait one minute before sending another batch so as not to get rate-limited
            // in the case of a local internet outage where there's lots of batches left
            // to send
            setTimeout(async () => await uploadToPvoutput(), 60000);
        }
    } catch (err: any) {
        logger(`Can't ${err.response.error.method} to ${err.response.error.path}: ${err.response.text}`, 'ERROR');
    }
}

async function getAveragedDataFromDatabase() {
    return await database.query(`
        SELECT
            (SELECT MIN(timestamp) FROM powerwall_data) AS start_of_batch,
            AVG(solar_generation) AS solar_generation,
            AVG(solar_voltage) AS solar_voltage,
            AVG(home_usage) AS home_usage,
            AVG(home_voltage) AS home_voltage,
            AVG(grid_flow) AS grid_flow,
            AVG(battery_flow) AS battery_flow,
            AVG(battery_charge_percentage) AS battery_charge_percentage
        FROM powerwall_data
        WHERE timestamp < (
            (SELECT MIN(timestamp) FROM powerwall_data) + 300000 -- 5 minutes in milliseconds
        )`
    );
}

async function sendAveragedDataToPvoutput(data: PowerwallData) {
    const startOfBatch = process.env.TIMEZONE
        ? DateTime.fromMillis(parseInt(data.start_of_batch)).setZone(process.env.TIMEZONE)
        : DateTime.fromMillis(parseInt(data.start_of_batch));

    let payload: PVOutputPayload = {
        d: startOfBatch.toFormat('yyyyLLdd'),
        t: startOfBatch.toFormat('HH:mm'),
        v2: data.solar_generation,
        v4: data.home_usage,
        v6: data.solar_voltage,
    }

    if (process.env.PVOUTPUT_SEND_EXTENDED_DATA === 'true') {
        payload = {
            ...payload,
            v7: data.battery_flow,
            v8: data.home_usage,
            v9: data.battery_charge_percentage,
            v10: data.grid_flow,
            v11: data.solar_voltage,
            v12: data.solar_generation,
        }
    }

    if (process.env.DISABLE_PVOUTPUT_UPLOAD === 'true') {
        logger('DISABLE_PVOUTPUT_UPLOAD is set, skipping upload', 'DEBUG');

        await deleteBatchFromDatabase({startOfBatch});

        return;
    }

    logger('Sending data to PVOutput:', 'DEBUG');

    logger(payload, 'DEBUG');

    const result = await request.post('https://pvoutput.org/service/r2/addstatus.jsp')
        .set({
            'X-Pvoutput-SystemId': process.env.PVOUTPUT_SYSTEM_ID,
            'X-Pvoutput-Apikey': process.env.PVOUTPUT_API_KEY,
        })
        .query(payload);

    if (result.status === 200) {
        logger(`Successfully sent data for batch at ${startOfBatch.toFormat('yyyyLLdd HH:mm')}`, 'DEBUG');

        // Once the data has been successfully sent to PVOutput, we can delete it from the database so
        // it's not just re-sending the same batch over and over again!
        await deleteBatchFromDatabase({startOfBatch});
    }
}

async function deleteBatchFromDatabase({startOfBatch}: {startOfBatch: DateTime}) {
    logger(`Removing data from database beginning at ${startOfBatch.toMillis()} (${startOfBatch.toISO()})`);

    await database.query('DELETE FROM powerwall_data WHERE timestamp < ($1::bigint + 300000)', [startOfBatch.toMillis()]);
}
