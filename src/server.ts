// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import express from 'express';
import 'reflect-metadata';

import LoggerFactory from '@/commons/utils/logger-factory';
import { config } from '@/config';
import IOCRegistry from '@/ioc-registry';
import { globalErrorHandler, unmappedPathsHandler } from '@/middleware/errors';
import { morganMiddleware } from '@/middleware/morgan';
import { routes } from '@/routes/payment.routes.ts';

const logger = LoggerFactory.getLogger('server');
// TODO do not log passwords

logger.info(`mode: ${config.env}`);
logger.info('Application configuration:', config);

const checkConfigIsValid = () => {
    Object.values(config).forEach((value) => {
        if (!value) {
            throw new Error('config is invalid');
        }
    });
};

checkConfigIsValid();

// Initialize context
await IOCRegistry.initialize('server');

// Setup express endpoints
const app = express();

// parse application/json
app.use(express.json());

// HTTP logging
app.use(morganMiddleware);

// routes
const baseRouter = express.Router();
app.use(config.basePath, baseRouter);

// set up routes
routes(baseRouter);
app.use(unmappedPathsHandler, globalErrorHandler);

// port
app.listen(config.port, () => {
    logger.info(`[server]: Server is running at port ${config.port}`);
});
