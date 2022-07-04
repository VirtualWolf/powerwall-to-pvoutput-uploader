import request from 'superagent';
import { DateTime } from 'luxon';
import { getToken } from './get-token';
import database from '../database';
import { connect, MqttClient } from 'mqtt';
import logger from '../logger';
const config = require('../../config.json');

let client: MqttClient;

if (config.mqtt) {
    client = connect({
        servers: [{
            host: config.mqtt.host,
            port: config.mqtt.port || 1883,
        }],
        clientId: 'powerwall-to-pvoutput-uploader',
        clean: false,
    });
}

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

        const timestamp = DateTime.utc().valueOf();

        // This is necessary because PVOutput will reject negative values for
        // solar generation, understandably, and occasionally very small or negative values
        // can be returned from the Powerwall.
        const solar_generation = currentLoad.body.solar.instant_power <= 30
            ? 0
            : currentLoad.body.solar.instant_power;

        const solar_voltage = currentLoad.body.solar.instant_average_voltage;

        // Similar to the solar power above, it seems VERY occasionally that the Powerwall
        // returns negative values for home usage, which makes zero sense, but if it happens
        // enough that the average usage over five minutes is negative, it'll end up totally
        // blocking up the sending of ANY data to PVOutput
        const home_usage = currentLoad.body.load.instant_power < 0
            ? 0
            : currentLoad.body.load.instant_power;

        const home_voltage = currentLoad.body.load.instant_average_voltage;

        const grid_flow = currentLoad.body.site.instant_power;

        const battery_flow = currentLoad.body.battery.instant_power;

        const battery_charge_percentage = batteryCharge.body.percentage;

        // When the Powerwall is running a firmware update, the API can still be hit but all
        // the values returned are zero, even the consumption and battery charge. If that
        // happens, best is to just skip the whole reading for the period.
        if (currentLoad.body.load.instant_power <= 0 && batteryCharge.body.percentage === 0) {
            logger('Consumption and battery charge are both zero, skipping reading');

            return;
        }

        await database.query(`INSERT INTO powerwall_data
            (timestamp, solar_generation, solar_voltage, home_usage, home_voltage, grid_flow, battery_flow, battery_charge_percentage)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [timestamp, solar_generation, solar_voltage, home_usage, home_voltage, grid_flow, battery_flow, battery_charge_percentage],
        );

        if (config.mqtt) {
            publishMessage({
                timestamp,
                solar_generation,
                solar_voltage,
                home_usage,
                home_voltage,
                grid_flow,
                battery_flow,
                battery_charge_percentage,
            });
        }

        logger(`Logged values: ${JSON.stringify({timestamp, solar_generation, solar_voltage, home_usage, home_voltage, grid_flow, battery_flow, battery_charge_percentage})}`, 'DEBUG');
    } catch (err: any) {
        if (err.status === 401 || err.status === 403) {
            await getToken(true);
        } else {
            logger(err.message, 'DEBUG');
        }
    }
}

interface PowerwallMqttPayload {
    timestamp: number;
    solar_generation: number;
    solar_voltage: number;
    home_usage: number;
    home_voltage: number;
    grid_flow: number;
    battery_flow: number;
    battery_charge_percentage: number;
}

function publishMessage(payload: PowerwallMqttPayload) {
    const message = JSON.stringify(payload);

    client.publish(config.mqtt.topic, message, {
        qos: 1,
        retain: true,
    }, (err) => {
        if (err) {
            logger('Failed to send message to broker: ' + message);
        } else {
            logger('Message sent to broker: ' + message, 'DEBUG');
        }
    });
}
