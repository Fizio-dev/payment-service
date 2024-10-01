import Stripe from 'stripe';
import { inject, singleton } from 'tsyringe';
import { Logger } from 'winston';

import type {
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
// import { UserPrincipal } from '@/security/userPrincipal';
import DB from '@/infrastructure/db';
import { In, LessThanOrEqual, Repository } from 'typeorm';
import type { User } from 'express';
import { error } from 'node:console';
type NewType = any;


@singleton() // Singleton decorator ensures only one instance
export default class PaymentService {
    static getReferencePayments(arg0: string[], user: User) {
        throw new Error('Method not implemented.');
    }
    static cancelPayment(paymentId: number, user: User) {
        throw new Error('Method not implemented.');
    }
    static approvePayment(paymentId: number, user: User) {
        throw new Error('Method not implemented.');
    }
    static getPayments(userId: string, page: number, perPage: number, user: User) {
        throw new Error('Method not implemented.');
    }
    static getPaymentAccountUrl(userId: string, user: User) {
        throw new Error('Method not implemented.');
    }
    
    private readonly stripeApiKey: string;
    private readonly stripeReturnUrl: string;
    private readonly stripeRefreshUrl: string;
    private readonly paymentsReleasedAfterDays = 15;
    private readonly paymentsApprovedAfterDays = 3;
    private readonly minimumReleaseAmount = 50 * 100;
    private readonly stripeClient: Stripe;
    private readonly logger: Logger;
    private readonly paymentAccountRepository: Repository<PaymentAccount>;


    constructor(
        @inject(DB) private readonly db: DB, // Inject DB class here
        @inject(Logger) logger: Logger
    ) {
        this.stripeApiKey = process.env['STRIPE_API_KEY']!;
        this.stripeReturnUrl = process.env['STRIPE_RETURN_URL']!;
        this.stripeRefreshUrl = process.env['STRIPE_REFRESH_URL']!;
        this.stripeClient = new Stripe(this.stripeApiKey, {
            apiVersion: '2024-06-20',
        });
        this.logger = logger;
        this.paymentAccountRepository=this.db.getPrimaryDataSource().getRepository(PaymentAccount);
    }

    async getPaymentAccount(
        userId: string,
        user: NewType
    ): Promise<PaymentAccount | null> {
        if (user.id !== userId) {
            throw new Error('Cannot get payment account of another user');
        }

        const account = await this.paymentAccountRepository
            .findOne({
                where: { userId },
            });

        if (account) {
            if (account['accountStatus'] === PaymentAccountStatus.CONNECTED) return account;

if (account['accountStatus'] === PaymentAccountStatus.CREATED) {
    try {
        const stripeAccount =
            await this.stripeClient.accounts.retrieve(account['accountId']);
        if (stripeAccount.payouts_enabled) {
            account['accountStatus'] = PaymentAccountStatus.CONNECTED; // Use enum here
            account['connectedAt'] = new Date();
            await this.db
                .getPrimaryDataSource()
                .getRepository(PaymentAccount)
                .save(account);
            return account;
        }
    } catch (error) {
        this.logger.error('Error fetching stripe account', error);
        throw new Error('Error fetching stripe account');
    }
}
        }
        return null;
    }

    async getPaymentAccountUrl(
        userId: string,
        user: NewType
    ): Promise<CreatePaymentAccountResponse | null> {
        if (user.id !== userId) {
            throw new Error('Cannot get payment account URL of another user');
        }

        let account = await this.db
            .getPrimaryDataSource()
            .getRepository(PaymentAccount)
            .findOne({
                where: { userId },
            });

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
            await this.db
                .getPrimaryDataSource()
                .getRepository(PaymentAccount)
                .save(account);
        }

        if (account['accountStatus'] === 'Connected') return null;

        if (account['accountStatus'] === 'Created') {
            const accountLinkParams: Stripe.AccountLinkCreateParams = {
                account: account['accountId'],
                refresh_url: this.stripeRefreshUrl,
                return_url: this.stripeReturnUrl,
                type: 'account_onboarding', // Set the correct type from Stripe's enum
            };
            const accountLink = await this.stripeClient.accountLinks.create(accountLinkParams);

            return { url: accountLink.url };
        }

        return null;
    }

    async getPayments(
        userId: string,
        page: number,
        perPage: number,
        user: NewType
    ): Promise<PaymentDetails[]> {
    
        if (!user.isClient && user.id !== userId) {
            throw new Error('Cannot get payments of another user');
        }

        const payments = await this.db
            .getPrimaryDataSource()
            .getRepository(Payment)
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
        user: NewType
    ): Promise<PaymentDetails[]> {
        let payments: Payment[];
        if (user.isClient) {
            payments = await this.db
                .getPrimaryDataSource()
                .getRepository(Payment)
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
        user: NewType
    ): Promise<Payment> {
        if (!user.isClient) {
            throw new Error('Only clients can approve payments');
        }

        const payment = await this.db
            .getPrimaryDataSource()
            .getRepository(Payment)
            .findOne({
                where: { id: paymentId },
            });
        if (!payment) throw new Error('Payment not found');

        if (payment['status'] === PaymentStatus.DRAFT) {
            payment.status = PaymentStatus.PENDING;
            payment['approvedAt'] = new Date();
            const releaseDate = new Date();
            releaseDate.setDate(
                releaseDate.getDate() + this.paymentsReleasedAfterDays
            );
            payment['releasedAt'] = releaseDate;
            await this.db
                .getPrimaryDataSource()
                .getRepository(Payment)
                .save(payment);
            return payment;
        }

        throw new Error('Payment in this state cannot be approved');
    }

    async cancelPayment(
        paymentId: number,
        user: NewType
    ): Promise<Payment> {
        if (!user.isClient) {
            throw new Error('Only clients can cancel payments');
        }

        const payment = await this.db
            .getPrimaryDataSource()
            .getRepository(Payment)
            .findOne({
                where: { id: paymentId },
            });
        if (!payment) throw new Error('Payment not found');

        if (['Draft', 'Pending'].includes(payment['status'])) {
            payment.status = PaymentStatus.CANCELED;
            payment['cancelledAt'] = new Date();
            await this.db
                .getPrimaryDataSource()
                .getRepository(Payment)
                .save(payment);
            return payment;
        }

        throw new Error('Payment in this state cannot be canceled');
    }

    async getPaymentStats(
        userId: string,
        user: NewType
    ): Promise<PaymentStats> {
        if (!user.isClient && user.id !== userId) {
            throw new Error('Cannot get payment stats of another user');
        }
    
        const draftAmount = await this.db
            .getPrimaryDataSource()
            .getRepository(Payment)
            .createQueryBuilder('payment')
            .select('SUM(payment.amount)', 'sum')
            .where('payment.userId = :userId', { userId })
            .andWhere('payment.status = :status', { status: PaymentStatus.DRAFT })
            .getRawOne();
    
        const pendingAmount = await this.db
            .getPrimaryDataSource()
            .getRepository(Payment)
            .createQueryBuilder('payment')
            .select('SUM(payment.amount)', 'sum')
            .where('payment.userId = :userId', { userId })
            .andWhere('payment.status = :status', { status: PaymentStatus.PENDING })
            .getRawOne();
    
        const totalEarnings = await this.db
            .getPrimaryDataSource()
            .getRepository(Payment)
            .createQueryBuilder('payment')
            .select('SUM(payment.amount)', 'sum')
            .where('payment.userId = :userId', { userId })
            .andWhere('payment.status = :status', { status: PaymentStatus.PAID })
            .getRawOne();
    
            return {
                draftPaymentsAmount: draftAmount?.sum || 0,
                pendingPaymentsAmount: pendingAmount?.sum || 0,
                totalEarnings: totalEarnings?.sum || 0,
            };
    }

    async getClientPaymentStats(
        user: NewType
    ): Promise<PaymentStats> {
        if (!user.isClient) {
            throw new Error('Only clients can get client payment stats');
        }
    
        const totalExpenses = await this.db
            .getPrimaryDataSource()
            .getRepository(Payment)
            .createQueryBuilder('payment')
            .select('SUM(payment.amount)', 'sum')
            .where('payment.status = :status', { status: PaymentStatus.PAID })
            .getRawOne();
    
        return {
            draftPaymentsAmount: 0, // Modify or calculate if needed
            pendingPaymentsAmount: 0, // Modify or calculate if needed
            totalEarnings: totalExpenses?.sum || 0 // Now part of PaymentStats structure
        };
    }
    
    
    async createPayment(
        request: CreatePaymentRequest,
        user: NewType
    ): Promise<Payment> {
        if (!user.isClient && !user.isServiceAccount) {
            throw new Error(
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
    
        await this.db.getPrimaryDataSource().getRepository(Payment).save(payment);
        return payment;
    }
    
    async updatePayment(
        request: UpdatePaymentRequest,
        user: NewType
    ): Promise<Payment> {
        if (!user.isClient) {
            throw new Error('Only clients can update payments');
        }
    
        const payment = await this.db
            .getPrimaryDataSource()
            .getRepository(Payment)
            .findOne({ where: { id: request.id } });
    
        if (!payment) throw new Error('Payment not found');
    
        if (payment['status'] === PaymentStatus.DRAFT) {
            payment['amount'] = request.amount;
            payment['description'] = request.description;
            payment['updatedAt'] = new Date();
            payment['updatedBy'] = user.username;
    
            if (request.approve) {
                payment.status = PaymentStatus.PENDING;
                payment['approvedAt'] = new Date();
            }
    
            await this.db.getPrimaryDataSource().getRepository(Payment).save(payment);
            return payment;
        }
    
        throw new Error('Payment in this state cannot be updated');
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