import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { PaymentAccountStatus } from './payment-account-status.enum';

@Entity('payment_account', { schema: 'payment' }) // Match the schema and table name
export default class PaymentAccount {
    @PrimaryGeneratedColumn('increment', { type: 'int8' }) // Use 'increment' with 'int8' type to match your table
    id: number;

    @Column({ type: 'varchar', nullable: true }) // Matches the 'user_id' column
    userId: string;

    @Column({ type: 'varchar', nullable: true }) // Matches the 'account_id' column
    accountId: string;

    @Column({ type: 'varchar', nullable: true, enum: PaymentAccountStatus }) // Matches the 'account_status' column
    accountStatus: PaymentAccountStatus;

    @Column({ type: 'timestamp', nullable: true }) // Matches 'created_at' timestamp(6)
    createdAt: Date;

    @Column({ type: 'timestamp', nullable: true }) // Matches 'connected_at' timestamp(6)
    connectedAt: Date;

    constructor(partial?: Partial<PaymentAccount>) {
        Object.assign(this, partial);
    }
}
