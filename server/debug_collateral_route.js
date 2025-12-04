const path = require('path');
const dotenv = require('dotenv');

// Load env
dotenv.config({ path: path.join(__dirname, '.env') });

console.log('Attempting to require routes/collaterals.js...');

try {
    const collateralsRouter = require('./routes/collaterals');
    console.log('Successfully required routes/collaterals.js');
} catch (error) {
    console.error('FAILED to require routes/collaterals.js');
    console.error(error);
}
