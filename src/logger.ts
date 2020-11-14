import { DateTime } from 'luxon';

enum Levels {
    ERROR, INFO, DEBUG
}

export default function log(message: string, level: keyof typeof Levels = 'INFO') {
    const timestamp = DateTime.local().toFormat('yyyy-LL-dd HH:mm:ss');

    if (process.env.DEBUG && level === 'DEBUG') {
        console.debug(`${timestamp} [${level}]`, message);
    } else {
        console.log(`${timestamp} [${level}]`, message);
    }
}
