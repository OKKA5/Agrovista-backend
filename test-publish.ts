import * as mqtt from 'mqtt';

const URL = '';
const USERNAME = '';
const PASSWORD = '';
const PARCEL_ID = process.env.PARCEL_ID || '';

if (!PARCEL_ID) {
        console.log('Usage: PARCEL_ID=xxx node ingest-full-test.js');
        process.exit(1);
}

const client = mqtt.connect(URL, {
        username: USERNAME,
        password: PASSWORD,
        reconnectPeriod: 0,
        connectTimeout: 10000,
        rejectUnauthorized: false,
        protocolVersion: 4,
});

let published = 0;
const expected = 8; // 3 past hours + 5 current hour minutes

client.on('connect', () => {
        console.log('✅ Connected');

        // ========== PAST HOURS (different hours, 1 reading each) ==========
        const pastHours = [
                { hour: 6, temp: 20, nitrogen: 40, phosphorus: 22, potassium: 170, ph: 6.2, humidity: 55, rainfall: 0 },
                { hour: 7, temp: 21, nitrogen: 42, phosphorus: 23, potassium: 175, ph: 6.3, humidity: 58, rainfall: 1 },
                { hour: 8, temp: 22, nitrogen: 45, phosphorus: 25, potassium: 180, ph: 6.5, humidity: 60, rainfall: 2 },
        ];

        pastHours.forEach((h) => {
                const ts = new Date();
                ts.setHours(h.hour, 0, 0, 0);

                const payload = JSON.stringify({
                        source: 'test-script',
                        timestamp: ts.toISOString(),
                        soilNitrogen: h.nitrogen,
                        soilPhosphorus: h.phosphorus,
                        soilPotassium: h.potassium,
                        soilPh: h.ph,
                        temperature: h.temp,
                        humidity: h.humidity,
                        rainfall: h.rainfall,
                });

                client.publish(`parcels/${PARCEL_ID}/sensors/esp32`, payload, (err) => {
                        if (err) console.log(`❌ Hour ${h.hour}:`, err.message);
                        else {
                                console.log(`✅ Hour ${h.hour} ingested`);
                                published++;
                        }
                });
        });

        // ========== CURRENT HOUR (5 readings at different minutes) ==========
        const now = new Date();
        const currentHour = now.getHours();

        for (let minute = 0; minute < 5; minute++) {
                const ts = new Date(now.getFullYear(), now.getMonth(), now.getDate(), currentHour, minute, 0);

                const payload = JSON.stringify({
                        source: 'test-script',
                        timestamp: ts.toISOString(),
                        soilNitrogen: 50 + minute * 2,
                        soilPhosphorus: 30 + minute,
                        soilPotassium: 190 + minute * 5,
                        soilPh: 6.8,
                        temperature: 25 + minute * 0.5,
                        humidity: 65 + minute * 2,
                        rainfall: minute,
                });

                client.publish(`parcels/${PARCEL_ID}/sensors/esp32`, payload, (err) => {
                        if (err) console.log(`❌ Minute ${minute}:`, err.message);
                        else {
                                console.log(`✅ Minute ${currentHour}:${minute.toString().padStart(2, '0')} ingested`);
                                published++;
                        }
                });
        }

        // Wait for all publishes to complete
        const checkDone = setInterval(() => {
                if (published >= expected) {
                        clearInterval(checkDone);
                        setTimeout(() => {
                                client.end();
                                console.log(`🔒 Done. Total published: ${published}`);
                                process.exit(0);
                        }, 1000);
                }
        }, 500);
});

client.on('error', (err) => {
        console.log('❌ Error:', err.message);
        process.exit(1);
});
