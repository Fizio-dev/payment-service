import dotenv from 'dotenv';
import * as process from 'node:process';

const ENV = process.env['NODE_ENV'] ?? 'development';

if (ENV !== 'production') {
    dotenv.config();
}

export const config = {
    env: ENV,
    basePath: process.env['BASE_PATH'] ?? '/crowdcraft-payment-service/v1',
    serviceName: 'crowdcraft-payment-service',
    port: process.env['PORT'] ?? 3006,
    dbConfig: {
        host: process.env['DB_HOST'] ?? 'localhost',
        port: parseInt(process.env['DB_PORT'] ?? '5432'),
        username: process.env['DB_USERNAME'] ?? 'pg',
        password: process.env['DB_PASSWORD'] ?? 'pg',
        database: process.env['DB_NAME'] ?? 'crowdcraft',
        schema: process.env['DB_SCHEMA'] ?? 'payment',
    },
    defaultUser: 'service_user', // user will come from auth
    services: {
        payment: {
            baseUrl: process.env['PAYMENT_BASE_URL']!,
        },
    },
};
