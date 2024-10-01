import morgan from 'morgan';

import LoggerFactory from '@/commons/utils/logger-factory';

const logger = LoggerFactory.getLogger('morgan');

const stream = {
    write: (message: string) => logger.http(message),
};

export const morganMiddleware = morgan(
    ':remote-addr :method :url :status :res[content-length] - :response-time ms',
    { stream, immediate: true }
);
