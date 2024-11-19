import { statusCodes } from '@/helpers/status-codes';

type ErrorCode = 'NOT_FOUND' | 'INVALID_REQUEST' | 'UNKNOWN_ERROR';

export const errorMessages = {
    NOT_FOUND: 'The requested resource was not found',
    INVALID_REQUEST: 'There was a problem with the request',
    UNKNOWN_ERROR: 'An unknown error has occurred',
    INVALID_TYPE: 'Invalid type',
    CONNECTION_DETAILS_NOT_FOUND: 'The connection details were not found',
    BAD_REQUEST: 'Bad request',
};

export interface ValidationErrorItem {
    path: string;
    message: string;
    errorCode?: string;
}

export interface ErrorResponse {
    code: string;
    message: string;
    errorItems: ValidationErrorItem[] | undefined;
}

// Abstract base error class
export abstract class BaseError {
    protected abstract statusCode: number;
    protected errorCode: ErrorCode;
    protected message: string;
    protected error: Error;

    protected constructor(
        errorCode: ErrorCode,
        message?: string,
        error?: Error
    ) {
        this.errorCode = errorCode;
        this.message = message ?? errorMessages[errorCode];
        if (error) {
            this.error = error;
        } else {
            this.error = new Error(this.message);
            this.error.name = errorCode;
            Error.captureStackTrace(this.error);
        }
    }

    public serializeError(): ErrorResponse {
        return {
            code: this.errorCode,
            message: this.message,
        } as ErrorResponse;
    }

    public getStatusCode(): number {
        return this.statusCode;
    }

    public getError(): Error {
        return this.error;
    }
}

export class BadRequestError extends BaseError {
    statusCode = statusCodes.badRequest;
    constructor(errorCode: ErrorCode, message?: string, error?: Error) {
        super(errorCode, message, error);
    }
}

export class CrowdCraftError extends BaseError {
    statusCode = statusCodes.internalError;
    constructor(errorCode: ErrorCode, message?: string, error?: Error) {
        super(errorCode, message, error);
    }
}

export class ValidationError extends BadRequestError {
    constructor(
        errorCode: ErrorCode,
        private errorItems: ValidationErrorItem[],
        message?: string,
        error?: Error
    ) {
        super(errorCode, message, error);
    }
    override serializeError(): ErrorResponse {
        return {
            code: this.errorCode,
            message: this.message,
            errorItems: this.errorItems,
        };
    }
}

export class NotFoundError extends BaseError {
    statusCode = statusCodes.notFound;
    constructor(errorCode: ErrorCode, message?: string, error?: Error) {
        super(errorCode, message, error);
    }
}
