import Stripe from 'stripe';
import { inject, singleton } from 'tsyringe';
import { Logger } from 'winston';

import type {
  ClientPaymentStats,
  CreatePaymentAccountResponse,
  CreatePaymentRequest,
  PaymentDetails,
  PaymentStats,
  UpdatePaymentRequest,
} from '@/dto';
import {
  PaymentAccountStatus,
  Payment,
  PaymentAccount,
  PayoutStatus,
  PaymentStatus,
  Payout,
} from '@/entities';
import DB from '@/infrastructure/db';
import { In, LessThanOrEqual, Repository } from 'typeorm';
import { LoggerFactory } from '@republic-global/commons';
import { BadRequestError, CrowdCraftError, NotFoundError } from '@/helpers/errors';
import type { CrowdCraftUser } from '@republic-global/auth-lib';

@singleton()
export default class PaymentService {
  private readonly stripeApiKey: string;
  private readonly stripeReturnUrl: string;
  private readonly stripeRefreshUrl: string;
  private readonly paymentsReleasedAfterDays = 15;
  private readonly paymentsApprovedAfterDays = 3;
  private readonly minimumReleaseAmount = 50 * 100;
  private readonly stripeClient: Stripe;
  private readonly logger: Logger;
  private readonly paymentAccountRepository: Repository<PaymentAccount>;
  private readonly paymentRepository: Repository<Payment>;


  constructor(
    @inject(DB) private readonly db: DB,
  ) {
    this.stripeApiKey = process.env['STRIPE_API_KEY']!;
    this.stripeReturnUrl = process.env['STRIPE_RETURN_URL']!;
    this.stripeRefreshUrl = process.env['STRIPE_REFRESH_URL']!;
    this.stripeClient = new Stripe(this.stripeApiKey);
    this.logger = LoggerFactory.getLogger('payment.service');
    this.paymentAccountRepository = this.db.getPrimaryDataSource().getRepository(PaymentAccount);
    this.paymentRepository = this.db.getPrimaryDataSource().getRepository(Payment);
  }

  async getPaymentAccount(
    userId: string,
    user: string
  ): Promise<PaymentAccount> {
    if (user !== userId) {
      throw new BadRequestError('INVALID_REQUEST');
    }

    const account = await this.paymentAccountRepository
      .findOne({
        where: { userId },
      });

    if (!account) {
      throw new CrowdCraftError('NOT_FOUND');
    }

    if (account.accountStatus === PaymentAccountStatus.CONNECTED) return account;

    if (account.accountStatus === PaymentAccountStatus.CREATED) {
      try {
        const stripeAccount = await this.stripeClient.accounts.retrieve(account.accountId);
        if (stripeAccount.payouts_enabled) {
          account.accountStatus = PaymentAccountStatus.CONNECTED;
          account.connectedAt = new Date();

          await this.paymentAccountRepository.save(account);

          return account;
        }
      } catch (error) {
        this.logger.error("Error fetching stripe account", error);
        throw new CrowdCraftError('UNKNOWN_ERROR');
      }
    }

    throw new CrowdCraftError('INVALID_REQUEST');
  }

  async getPaymentAccountUrl(
    userId: string,
    user: string
  ): Promise<CreatePaymentAccountResponse> {
    if (user !== userId) {
      throw new BadRequestError('INVALID_REQUEST');
    }

    let account = await this.paymentAccountRepository.findOne({ where: { userId } });

    if (!account) {
      const accountParams: Stripe.AccountCreateParams = {
        type: 'express',
      };
      const stripeAccount = await this.stripeClient.accounts.create(accountParams);
      account = new PaymentAccount({
        userId: userId,
        accountId: stripeAccount.id,
        accountStatus: PaymentAccountStatus.CREATED,
      });

      await this.paymentAccountRepository.save(account);
    }

    if (account.accountStatus === PaymentAccountStatus.CONNECTED) {
      throw new BadRequestError('INVALID_REQUEST');
    };

    if (account.accountStatus === PaymentAccountStatus.CREATED) {
      const accountLinkParams: Stripe.AccountLinkCreateParams = {
        account: account.accountId,
        refresh_url: this.stripeRefreshUrl,
        return_url: this.stripeReturnUrl,
        type: 'account_onboarding',
      };
      const accountLink = await this.stripeClient.accountLinks.create(accountLinkParams);

      return { url: accountLink.url };
    }

    throw new CrowdCraftError('UNKNOWN_ERROR');
  }

  async getPayments(
    userId: string,
    page: number,
    perPage: number,
    user: CrowdCraftUser
  ): Promise<PaymentDetails[]> {

    if (user.userType !== 'client' && user.id !== userId) {
      throw new Error('Cannot get payments of another user'); // clients can get payments for everyone
    }

    const payments = await this.paymentRepository
      .find({
        where: {
          userId,
          status: In(['Pending', 'Paid']),
        },
        take: perPage,
        skip: (page - 1) * perPage,
      });

    return payments.map((payment) => ({
      id: payment.id,
      userId: payment.userId,
      amount: payment.amount,
      description: payment.description,
      status: payment.status,
      originalAmount: payment.originalAmount,
      approvedAt: payment.approvedAt?.toISOString() ?? null, // Convert Date to string
      paidAt: payment.paidAt?.toISOString() ?? null, // Convert Date to string
      externalId: payment.externalId,
    }));
  }

  async getReferencePayments(
    referenceIds: string[],
    user: CrowdCraftUser
  ): Promise<PaymentDetails[]> {
    let payments: Payment[];
    if (user.userType === 'client') {
      payments = await this.paymentRepository
        .find({
          where: {
            externalId: In(referenceIds),
            status: In(['Pending', 'Paid', PaymentStatus.DRAFT]),
          },
        });
    } else {
      payments = await this.db
        .getPrimaryDataSource()
        .getRepository(Payment)
        .find({
          where: {
            externalId: In(referenceIds),
            userId: user.id,
            status: In(['Pending', 'Paid', PaymentStatus.DRAFT]),
          },
        });
    }

    return payments.map((payment) => ({
      id: payment.id,
      userId: payment.userId,
      amount: payment.amount,
      description: payment.description,
      status: payment.status,
      originalAmount: payment.originalAmount,
      approvedAt: payment.approvedAt?.toISOString() ?? null, // Convert Date to string
      paidAt: payment.paidAt?.toISOString() ?? null, // Convert Date to string
      externalId: payment.externalId,
    }));
  }

  async approvePayment(
    paymentId: number,
    user: CrowdCraftUser
  ): Promise<Payment> {
    if (user.userType !== 'client') {
      throw new BadRequestError('INVALID_REQUEST', 'Only clients can approve payments');
    }

    const payment = await this.paymentRepository
      .findOne({
        where: { id: paymentId },
      });

    if (!payment) throw new NotFoundError('NOT_FOUND', 'Payment not found');

    if (payment.status === PaymentStatus.DRAFT) {
      payment.status = PaymentStatus.PENDING;
      payment.approvedAt = new Date();
      const releaseDate = new Date();
      releaseDate.setDate(
        releaseDate.getDate() + this.paymentsReleasedAfterDays
      );
      payment.releasedAt = releaseDate;
      await this.paymentRepository.save(payment);
      return payment;
    }

    throw new CrowdCraftError('UNKNOWN_ERROR', 'Payment in this state cannot be approved');
  }

  async cancelPayment(
    paymentId: number,
    user: CrowdCraftUser
  ): Promise<Payment> {
    if (user.userType !== 'client') {
      throw new BadRequestError('INVALID_REQUEST', 'Only clients can cancel payments');
    }

    const payment = await this.paymentRepository
      .findOne({
        where: { id: paymentId },
      });

    if (!payment) throw new NotFoundError('NOT_FOUND', 'Payment not found');

    if (['Draft', 'Pending'].includes(payment.status)) {
      payment.status = PaymentStatus.CANCELED;
      payment.cancelledAt = new Date();

      await this.paymentRepository.save(payment);

      return payment;
    }

    throw new CrowdCraftError('UNKNOWN_ERROR', 'Payment in this state cannot be canceled');
  }

  async getPaymentStats(
    userId: string,
    user: CrowdCraftUser
  ): Promise<PaymentStats> {
    if (user.userType !== 'client' && user.id !== userId) {
      throw new BadRequestError('INVALID_REQUEST', 'Cannot get payment stats of another user');
    }

    const queryRunner = this.db.getPrimaryDataSource().createQueryRunner();
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      const draftAmount = await queryRunner.manager.createQueryBuilder('payment', 'payment')
        .select('SUM(payment.amount)', 'sum')
        .where('payment.userId = :userId', { userId })
        .andWhere('payment.status = :status', { status: PaymentStatus.DRAFT })
        .getRawOne();

      const pendingAmount = await queryRunner.manager
        .createQueryBuilder('payment', 'payment')
        .select('SUM(payment.amount)', 'sum')
        .where('payment.userId = :userId', { userId })
        .andWhere('payment.status = :status', { status: PaymentStatus.PENDING })
        .getRawOne();

      const totalEarnings = await queryRunner.manager
        .createQueryBuilder('payment', 'payment')
        .select('SUM(payment.amount)', 'sum')
        .where('payment.userId = :userId', { userId })
        .andWhere('payment.status = :status', { status: PaymentStatus.PAID })
        .getRawOne();

      await queryRunner.commitTransaction();

      return {
        draftPaymentsAmount: draftAmount?.sum || 0,
        pendingPaymentsAmount: pendingAmount?.sum || 0,
        totalEarnings: totalEarnings?.sum || 0,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(error);
      throw new CrowdCraftError('UNKNOWN_ERROR', error);
    } finally {
      await queryRunner.release();
    }
  }

  async getClientPaymentStats(
    user: CrowdCraftUser
  ): Promise<ClientPaymentStats> {
    if (user.userType !== 'client') {
      throw new BadRequestError('INVALID_REQUEST', 'Only clients can get client payment stats');
    }

    const totalExpenses = await this.paymentRepository
      .createQueryBuilder('payment')
      .select('SUM(payment.amount)', 'sum')
      .where('payment.status = :status', { status: PaymentStatus.PAID })
      .getRawOne();

    return {
      totalExpenses: totalExpenses?.sum || 0 // Now part of PaymentStats structure
    };
  }


  async createPayment(
    request: CreatePaymentRequest,
    user: CrowdCraftUser
  ): Promise<Payment> {
    if (user.userType !== 'client' && !user.isServiceAccount) {
      throw new BadRequestError('INVALID_REQUEST',
        'Only clients and service accounts can create payments'
      );
    }

    const payment = new Payment({
      userId: request.userId,
      amount: request.amount,
      description: request.description,
      status: PaymentStatus.DRAFT,
      createdAt: new Date(),
      createdBy: user.username,
      externalId: request.externalId,
    });

    await this.paymentRepository.save(payment);
    return payment;
  }

  async updatePayment(
    request: UpdatePaymentRequest,
    user: CrowdCraftUser
  ): Promise<Payment> {
    if (user.userType !== 'client') {
      throw new Error('Only clients can update payments');
    }

    const payment = await this.paymentRepository
      .findOne({ where: { id: request.id } });

    if (!payment) throw new NotFoundError('NOT_FOUND');

    if (payment.status === PaymentStatus.DRAFT) {
      payment.amount = request.amount;
      payment.description = request.description;
      payment.updatedAt = new Date();
      payment.updatedBy = user.username;

      if (request.approve) {
        payment.status = PaymentStatus.PENDING;
        payment.approvedAt = new Date();
      }

      await this.paymentRepository.save(payment);
      return payment;
    }

    throw new CrowdCraftError('UNKNOWN_ERROR', 'Payment in this state cannot be updated');
  }

  async autoApprovePayments() {
    const approvedPaymentsCount = await this.db
      .getPrimaryDataSource()
      .getRepository(Payment)
      .createQueryBuilder()
      .update(Payment)
      .set({
        status: PaymentStatus.PENDING,
        approvedAt: new Date(),
      })
      .where('status = :status', { status: PaymentStatus.DRAFT })
      .andWhere('createdAt < :createdAt', {
        createdAt: new Date(
          new Date().setDate(new Date().getDate() - this.paymentsApprovedAfterDays)
        ),
      })
      .execute();

    this.logger.info(`Approved ${approvedPaymentsCount.affected} payments`);
  }

  async transferPendingPayments() {
    const userIds = await this.db
      .getPrimaryDataSource()
      .getRepository(Payment)
      .createQueryBuilder('payment')
      .select('payment.userId')
      .where('payment.status = :status', { status: 'Pending' })
      .andWhere('SUM(payment.amount) >= :minimumReleaseAmount', {
        minimumReleaseAmount: this.minimumReleaseAmount,
      })
      .groupBy('payment.userId')
      .getRawMany();

    for (const { userId } of userIds) {
      try {

        const account = await this.db
          .getPrimaryDataSource()
          .getRepository(PaymentAccount)
          .findOne({ where: { userId, accountStatus: PaymentAccountStatus.CONNECTED } });

        if (!account) {
          this.logger.info(`No payment account for user ${userId}. Skipping payments.`);
          return;
        }

        const payments = await this.db
          .getPrimaryDataSource()
          .getRepository(Payment)
          .find({
            where: {
              userId,
              status: PaymentStatus.PENDING,
              releasedAt: LessThanOrEqual(new Date()),
            },
          });

        const sum = payments.reduce((acc, p) => acc + p['amount'], 0);

        const payout = new Payout({
          paymentAccount: account,
          amount: sum,
          status: PayoutStatus.CREATED,
          createdAt: new Date(),
        });

        await this.db.getPrimaryDataSource().getRepository(Payout).save(payout);

        await this.db
          .getPrimaryDataSource()
          .getRepository(Payment)
          .createQueryBuilder()
          .update(Payment)
          .set({ status: PaymentStatus.PAID, payout })
          .whereInIds(payments.map((p) => p['id']))
          .execute();

        this.logger.info(`Created a payout of ${sum} for user ${userId}`);

      } catch (error) {
        this.logger.error(`Error creating a payout for user ${userId}`, error);
      }
    }

    const payouts = await this.db
      .getPrimaryDataSource()
      .getRepository(Payout)
      .find({ where: { status: PayoutStatus.CREATED } }); // Use the enum here instead of the string

    for (const payout of payouts) {
      try {

        const transfer = await this.stripeClient.transfers.create({
          amount: payout['amount'],
          currency: 'usd',
          destination: payout['paymentAccount'].accountId,
        });

        payout['status'] = PayoutStatus.PAID; // Use the enum here instead of the string "Paid"
        payout['transferId'] = transfer.id;
        await this.db.getPrimaryDataSource().getRepository(Payout).save(payout);

        this.logger.info(`Payout transfer created for payout id ${payout['id']}`);

      } catch (error) {
        this.logger.error(`Error creating a transfer for payout ${payout['id']}`, error);
      }
    }
  }
}
