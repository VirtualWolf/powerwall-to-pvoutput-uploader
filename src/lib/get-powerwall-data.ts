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

        if (config.mqtt) {
            const [
                timestamp,
                solar_generation,
                solar_voltage,
                home_usage,
                home_voltage,
                grid_flow,
                battery_flow,
                battery_charge_percentage,
            ] = values;

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

        logger(`Logged values: ${values}`, 'DEBUG');
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
