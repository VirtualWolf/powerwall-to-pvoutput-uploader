import { DateTime } from 'luxon';
const config = require('../config.json');

enum Levels {
    ERROR, INFO, DEBUG
}

export default function log(message: any, level: keyof typeof Levels = 'INFO') {
    const timestampFormat = 'yyyy-LL-dd HH:mm:ss';

    const timestamp = config.timezone
        ? DateTime.utc().setZone(config.timezone).toFormat(timestampFormat)
        : DateTime.local().toFormat(timestampFormat);

    if (process.env.DEBUG) {
        console.debug(`${timestamp} [${level}]`, require('util').inspect(message, false, null, true));
    } else if (level !== 'DEBUG') {
        console.log(`${timestamp} [${level}]`, message);
    }
}
