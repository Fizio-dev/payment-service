// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import express from 'express';
import 'reflect-metadata';

import LoggerFactory from '@/commons/utils/logger-factory';
import { config } from '@/config';
import IOCRegistry from '@/ioc-registry';
import { globalErrorHandler, unmappedPathsHandler } from '@/middleware/errors';
import { morganMiddleware } from '@/middleware/morgan';
import { routes } from '@/routes/payment.routes';
import DB from '@/infrastructure/db';
import cors from 'cors';


const logger = LoggerFactory.getLogger('server');

logger.info(`mode: ${config.env}`);

const checkConfigIsValid = () => {
  Object.values(config).forEach((value) => {
    if (!value) {
      throw new Error('config is invalid');
    }
  });
};

checkConfigIsValid();

const iocRegistry = await IOCRegistry.getInstance();
await iocRegistry.getDependency(DB).getPrimaryDataSource().initialize();

const app = express();

app.use(express.json());
app.use(morganMiddleware);
app.use(cors());

const baseRouter = express.Router();
app.use(config.basePath, baseRouter);
await routes(app);
app.use(unmappedPathsHandler, globalErrorHandler);

app.listen(config.port, () => {
  logger.info(`[server]: Server is running at port ${config.port}`);
});
