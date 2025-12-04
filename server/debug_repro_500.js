const request = require('supertest');
const app = require('./server');
const { User, Credit, sequelize } = require('./models');

async function runTest() {
    try {
        console.log('Connecting to database...');
        await sequelize.authenticate();
        console.log('Connected.');

        // 1. Login
        console.log('Logging in...');
        const loginRes = await request(app)
            .post('/api/auth/login')
            .send({
                username: 'admin',
                password: 'admin123'
            });

        if (loginRes.status !== 200) {
            console.error('Login failed:', loginRes.body);
            return;
        }

        const token = loginRes.body.token;
        console.log('Got token.');

        // 2. Get a valid credit ID
        const credit = await Credit.findOne();
        if (!credit) {
            console.error('No credits found in database to test with.');
            return;
        }
        console.log('Using credit ID:', credit.id);

        // 3. Send POST request to create collateral with EMPTY STRINGS for numeric fields
        const payload = {
            credit_id: credit.id,
            collateral_code: 'TEST-' + Date.now(),
            type: 'SHM',
            appraisal_value: "", // CAUSE OF ERROR?
            year: "", // CAUSE OF ERROR?
            land_area: "",
            building_area: ""
        };

        console.log('Sending POST /api/collaterals with empty strings...');
        const res = await request(app)
            .post('/api/collaterals')
            .set('Authorization', `Bearer ${token}`)
            .send(payload);

        console.log('Status:', res.status);
        console.log('Body:', JSON.stringify(res.body, null, 2));

        if (res.status === 500) {
            console.log('Reproduced 500 error!');
        } else {
            console.log('Did NOT reproduce 500 error. Status was:', res.status);
        }

    } catch (error) {
        console.error('Test script error:', error);
    } finally {
        await sequelize.close(); // Close connection to exit script
    }
}

runTest();
