import { jwtAuth } from '@republic-global/auth-lib';
import type { Request, Response, Router } from 'express';

import { asyncHandler } from '@/commons/helpers/async-handler';

import { mwError } from '@/middleware/errors';
import { openAPIValidator } from '@/middleware/validator';
import paymentService from '@/services/payment.service';

export function routes(router: Router) {
    // const paymentService = IOCRegistry.getDependency(PaymentService); // Resolve PaymentService from IOC

    // Middleware to handle errors and authentication
    router.use(mwError);

    // Define the routes
    router.get(
        '/health',
        jwtAuth,
        openAPIValidator,
        asyncHandler(async (req: Request, res: Response) => {
            res.status(200).json(['Hello', 'World']);
        })
    );

    router.get(
        '/account/:userId',
        jwtAuth,
        openAPIValidator,
        asyncHandler(async (req: Request, res: Response) => {
            const { userId } = req.params;
            const user = req.user!;
            
            try {
                const account = await paymentService.getPaymentAccount(userId, user);
                if (account === undefined || account === null) {
                    return res.status(404).json({ message: 'Payment account not connected' });
                }
                return res.status(200).json(account); // Explicit return for success response
            } catch (error) {
                return res.status(500).json({ message: 'Error fetching payment account', error });
            }
        })
    );
    

    router.post(
        '/account/:userId',
        jwtAuth,
        openAPIValidator,
        asyncHandler(async (req: Request, res: Response) => {
            const { userId } = req.params;
            const user = req.user!;
    
            try {
                const response = await paymentService.getPaymentAccountUrl(userId, user);
                if (response === undefined || response === null) {
                    return res.status(400).json({ message: 'Bad Request' });
                }
    
                // Return the success response explicitly
                return res.status(200).json(response);
            } catch (error) {
                // Handle any unexpected errors
                return res.status(500).json({ message: 'Error creating payment account URL', error });
            }
        })
    );
    

    router.get(
        '/payments/:userId',
        jwtAuth,
        openAPIValidator,
        asyncHandler(async (req: Request, res: Response) => {
            const { userId } = req.params;
            const user = req.user!;
    
            // Parse page and perPage as numbers, with default values if not provided
            const page = parseInt(req.query['page'] as string, 10) || 1;
            const perPage = parseInt(req.query['perPage'] as string, 10) || 10;
    
            // Make sure page and perPage are valid numbers
            if (isNaN(page) || isNaN(perPage)) {
                return res.status(400).json({ message: 'Invalid page or perPage values' });
            }
    
            const payments = await paymentService.getPayments(userId, page, perPage, user);
            return res.status(200).json(payments);
        })
    );
    

    router.post(
        '/payments/:id/approve',
        jwtAuth,
        openAPIValidator,
        asyncHandler(async (req: Request, res: Response) => {
            const { id } = req.params;
            const user = req.user!;
            
            // Convert id from string to number
            const paymentId = parseInt(id, 10);
            if (isNaN(paymentId)) {
                return res.status(400).json({ message: 'Invalid payment ID' });
            }
    
            try {
                const payment = await paymentService.approvePayment(paymentId, user);
                return res.status(200).json(payment); // Ensure a return is present
            } catch (error) {
                return res.status(500).json({ message: 'Payment approval failed', error });
            }
        })
    );
    

    router.post(
        '/payments/:id/cancel',
        jwtAuth,
        openAPIValidator,
        asyncHandler(async (req: Request, res: Response) => {
            const { id } = req.params;
            const user = req.user!;
    
            // Parse the id from the URL parameter as a number
            const paymentId = parseInt(id, 10);
    
            // Check if the id is a valid number
            if (isNaN(paymentId)) {
                return res.status(400).json({ message: 'Invalid payment ID' });
            }
    
            const payment = await paymentService.cancelPayment(paymentId, user);
            return res.status(200).json(payment);
        })
    );
    

    router.get(
        '/payments/reference',
        jwtAuth,
        openAPIValidator,
        asyncHandler(async (req: Request, res: Response) => {
            let { referenceIds } = req.query;
            const user = req.user!;
    
            // Ensure referenceIds is an array of strings
            if (typeof referenceIds === 'string') {
                referenceIds = [referenceIds]; // Convert string to an array
            } else if (!Array.isArray(referenceIds)) {
                referenceIds = []; // If it's not an array, initialize as an empty array
            }
    
            const payments = await paymentService.getReferencePayments(
                referenceIds as string[], // Ensure it's typed correctly
                user
            );
            res.status(200).json(payments);
        })
    );
    
}
