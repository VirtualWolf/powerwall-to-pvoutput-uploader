import { getPowerwallData } from './lib/get-powerwall-data';
import { uploadToPvoutput } from './lib/upload-to-pvoutput';
import logger from './logger';

logger('App started!');

// Save the data from the Powerwall every five seconds
setInterval(async () => await getPowerwallData(), 5000);

// Send the data to PVOutput every five minutes
setInterval(async () => await uploadToPvoutput(), 300000);
