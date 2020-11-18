import { getPowerwallData } from './lib/get-powerwall-data';
import { uploadToPvoutput } from './lib/upload-to-pvoutput';
import logger from './logger';

logger('App started!');

setInterval(async () => await getPowerwallData(), 5000);

setInterval(async () => await uploadToPvoutput(), 300000);
