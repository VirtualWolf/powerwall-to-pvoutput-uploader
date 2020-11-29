# Powerwall to PVOutput Uploader
This is a TypeScript/PostgreSQL version of [Powerwall2PVOutput](https://github.com/ekul135/Powerwall2PVOutput/), written partially for learning and also because I found the SQLite file from that repository kept getting corrupted.

## Configuration
The application requires a file called `config.json` in the root level of the repository with the following contents:

```
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
    "pvoApiKey": "abc123",
    "pvoSystemId": "12345",
    "sendExtendedData": true
}
```

* The `timezone` option can be omitted if the script is running natively on your machine rather than inside a Docker container (inside a Docker container, the timezone is always UTC which will throw off the times it's sending to PVOutput).
* The `pvoApiKey` can be generated in [account settings](https://pvoutput.org/account.jsp) at PVOutput, and the `pvoSystemId` is listed under Registered Systems on the same page.
* If `sendExtendedData` is set to `false`, only solar generation, home consumption, and solar voltage will be sent.

To send [extended data](https://pvoutput.org/help.html#extendeddata) to PVOutput, you need a PVOutput account with an [active donation](https://pvoutput.org/donate.jsp) and the `sendExtendedData` option in `config.json` set to `true`. To set up the extended data, use the following setup on your Edit System page on PVOutput:

![Extended data](images/extended-data.png)

## Running
* To run it in a Docker container, build the image with `docker build -t virtualwolf/powerwall-to-pvoutput-uploader:latest .` and start it with `docker-compose up -d`.
* To run it locally on your machine, compile it with `npm run build`, prepare the database with `npm run db:migrate` and start it with `npm start`, then use something like [PM2](https://pm2.keymetrics.io) or [Forever](https://www.npmjs.com/package/forever) to keep it up.
