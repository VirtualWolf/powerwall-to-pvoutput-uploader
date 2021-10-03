# Powerwall to PVOutput Uploader
This is a TypeScript/PostgreSQL version of [Powerwall2PVOutput](https://github.com/ekul135/Powerwall2PVOutput/), written partially for learning and also because I found the SQLite file from that repository kept getting corrupted.

## Configuration
The application requires a file called `config.json` in the root level of the repository with the following contents:

```json
{
    "database": {
        "host": "localhost",
        "port": 5432,
        "user": "username",
        "password": "password",
        "database": "pvoutput"
    },
    "timezone": "Australia/Sydney",
    "powerwallUrl": "https://powerwall",
    "powerwallEmail": "user@example.com",
    "powerwallPassword": "local-powerwall-api-password",
    "pvoApiKey": "abc123",
    "pvoSystemId": "12345",
    "sendExtendedData": true
}
```

* The `powerwallEmail` and `powerwallPassword` fields are required since Powerwall 2 firmware version 20.49.0. If you don't have them set already, [follow the instructions on Tesla's site](https://www.tesla.com/support/energy/powerwall/own/monitoring-from-home-network) to configure them.
* The `timezone` option can be omitted if the script is running natively on your machine rather than inside a Docker container (inside a Docker container, the timezone is always UTC which will throw off the times it's sending to PVOutput).
* The `pvoApiKey` can be generated in [account settings](https://pvoutput.org/account.jsp) at PVOutput, and the `pvoSystemId` is listed under Registered Systems on the same page.
* If `sendExtendedData` is set to `false`, only solar generation, home consumption, and solar voltage will be sent.

To send [extended data](https://pvoutput.org/help.html#extendeddata) to PVOutput, you need a PVOutput account with an [active donation](https://pvoutput.org/donate.jsp) and the `sendExtendedData` option in `config.json` set to `true`. To set up the extended data, use the following setup on your Edit System page on PVOutput:

![Extended data](images/extended-data.png)

## Running
* To run it in a Docker container, start it with `docker-compose up -d`. If the image doesn't exist, it will be built. If you need to build it again after pulling new changes from this repository, run `docker-compose build` before `docker-compose up -d`.
* To run it locally on your machine, compile it with `npm run build`, prepare the database with `npm run db:migrate` and start it with `npm start`, then use something like [PM2](https://pm2.keymetrics.io) or [Forever](https://www.npmjs.com/package/forever) to keep it up.

To enable debug logging to see what's going on under the covers, set the `DEBUG` environment variable to `true`.

## Publishing to MQTT
You can optionally add the following to your `config.json` to enable sending of the Powerwall data to a local MQTT broker:

```json
{
    [...]
    "mqtt": {
        "host": "localhost",
        "port": 1883,
        "topic": "home/power"
    }
}
```

The `port` field is optional and defaults to 1883 if not specified. It will publish data to the specified topic in the following format:

```json
{
    "consumption": "0.00",
    "production": "0.00",
    "batteryChargePercentage": "100",
    "batteryChargeState": "idle|draining|charging"
}
```

The consumption and production values are in kilowatts. This is primarily for use with my [pi-home-dashboard](https://github.com/VirtualWolf/pi-home-dashboard).
