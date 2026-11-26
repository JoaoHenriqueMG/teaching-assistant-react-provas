/**
 * Starts the server with the acceptance tests' data file (data/test-data.json)
 * instead of the development data, unless DATA_FILE says otherwise. Used by
 * `npm run dev:test`, so no environment variable has to be set by hand, on any
 * operating system.
 */
process.env.DATA_FILE = process.env.DATA_FILE || './data/test-data.json';

import './index';
