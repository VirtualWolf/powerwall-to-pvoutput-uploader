# Powerwall to PVOutput Uploader
This is a TypeScript/PostgreSQL version of [Powerwall2PVOutput](https://github.com/ekul135/Powerwall2PVOutput/), written partially for learning and also because I found the SQLite file from that repository kept getting corrupted.

It requires a file called `config.json` with the following contents:

```
{
    "database": {
        "host": "localhost",
        "port": 5432,
        "user": "username",
        "password": "password",
        "database": "pvoutput"
    },
    "powerwallUrl": "https://powerwall",
    "pvoApiKey": "abc123",
    "pvoSystemId": "12345"
}
```

Then, prepare the database with `npm run db:migrate`.
