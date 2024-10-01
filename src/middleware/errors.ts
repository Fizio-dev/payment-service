import type { NextFunction, Request, Response } from 'express';
import type { ValidationError as EOVValidationError } from 'express-openapi-validator/dist/framework/types';

import LoggerFactory from '@/commons/utils/logger-factory';
import {
    BaseError,
    NotFoundError,
    ValidationError,
    errorMessages,
} from '@/helpers/errors';
import { statusCodes } from '@/helpers/status-codes';

const logger = LoggerFactory.getLogger('errors');

export const globalErrorHandler = (
    err: unknown,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    logError(err);
    if (err instanceof ValidationError) {
        res.status(err.getStatusCode()).json(err.serializeError());
    } else if (err instanceof BaseError) {
        res.status(err.getStatusCode()).json(err.serializeError());
    } else if (err instanceof Error) {
        res.status(statusCodes.internalError).json({
            code: err.name,
            message: err.message,
        });
    } else {
        res.status(statusCodes.internalError).json({
            code: 'UNKNOWN_ERROR',
            message: errorMessages.UNKNOWN_ERROR,
        });
    }
};

const logError = (err: unknown) => {
    logger.error('An error occurred');
    if (err instanceof BaseError) {
        logger.error(JSON.stringify(err.serializeError()));
        logger.error(err.getError().stack);
    } else if (err instanceof Error) {
        logger.error(`${err.name}: ${err.message}`);
        logger.error(err.stack);
    } else {
        logger.error(err);
    }
};

export const mwError = (
    err: EOVValidationError,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    res.status(500).json({
        message: err.message ?? 'Error',
    });
};

export const validationErrorHandler = (
    err: EOVValidationError,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    throw new ValidationError('INVALID_REQUEST', err.errors, err.message);
};

export const unmappedPathsHandler = (req: Request, res: Response) => {
    throw new NotFoundError('NOT_FOUND', errorMessages.NOT_FOUND);
};
