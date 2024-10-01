import type { NextFunction, Request, Response } from 'express';

export function asyncHandler(
    handlerFunction: (
        req: Request,
        res: Response,
        next: NextFunction
    ) => Promise<any>
) {
    return (req: Request, res: Response, next: NextFunction) => {
        return Promise.resolve(handlerFunction(req, res, next)).catch(next);
    };
}
