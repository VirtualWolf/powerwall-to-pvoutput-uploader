import { getPowerwallData } from './lib/get-powerwall-data';
import logger from './logger';

setInterval(async () => {
    try {
        await getPowerwallData();
    } catch (err) {
        logger(err, 'ERROR');
    }
}, 5000);
