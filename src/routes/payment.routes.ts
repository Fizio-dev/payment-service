import { jwtAuth, jwtAuthAnonymous } from '@republic-global/auth-lib';
import type { Request, Response, Router } from 'express';

import { asyncHandler } from '@/commons/helpers/async-handler';

import { openAPIValidator } from '@/middleware/validator';
import IOCRegistry from '@/ioc-registry';
import PaymentService from '@/services/payment.service';

export async function routes(router: Router) {
  const iocRegistry = await IOCRegistry.getInstance();
  const paymentService = iocRegistry.getDependency(PaymentService);

  // router.use(mwError);

  router.get(
    '/health',
    jwtAuthAnonymous,
    openAPIValidator,
    asyncHandler(async (_req: Request, res: Response) => {
      res.status(200).json(['Hello', 'World']);
    })
  );

  router.get(
    '/paymentAccount/:userId',
    jwtAuth,
    openAPIValidator,
    asyncHandler(async (req: Request, res: Response) => {
      const { userId } = req.params;
      const user = req.user!;

      const result = await paymentService.getPaymentAccount(userId, user.id);
      return res.status(200).json(result);
    })
  );


  router.post(
    '/paymentAccount/:userId',
    jwtAuth,
    openAPIValidator,
    asyncHandler(async (req: Request, res: Response) => {
      const { userId } = req.params;
      const user = req.user!;

      const result = await paymentService.getPaymentAccountUrl(userId, user.id);
      return res.status(200).json(result);
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

  router.get(
    '/payments/:userId/stats',
    jwtAuth,
    openAPIValidator,
    asyncHandler(async (req: Request, res: Response) => {
      const { userId } = req.params;
      const user = req.user!;

      const result = await paymentService.getPaymentStats(userId, user);
      return res.status(200).json(result);
    }));

  router.get(
    '/payments/stats',
    jwtAuth,
    openAPIValidator,
    asyncHandler(async (req: Request, res: Response) => {
      const user = req.user!;

      const result = await paymentService.getClientPaymentStats(user);
      return res.status(200).json(result);
    }));

  router.post(
    '/payments',
    jwtAuth,
    openAPIValidator,
    asyncHandler(async (req: Request, res: Response) => {
      const user = req.user!;
      const result = await paymentService.createPayment(req.body, user);
      return res.status(200).json(result);
    })
  );

  router.patch(
    '/payments',
    jwtAuth,
    openAPIValidator,
    asyncHandler(async (req: Request, res: Response) => {
      const user = req.user!;
      const result = await paymentService.updatePayment(req.body, user);
      return res.status(200).json(result);
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
    '/payments',
    jwtAuth,
    openAPIValidator,
    asyncHandler(async (req: Request, res: Response) => {
      const user = req.user!;
      const referenceIds = req.query['referenceIds'];
      const result = await paymentService.getReferencePayments(referenceIds as string[], user);
      return res.status(200).json(result);
    })
  );
}
