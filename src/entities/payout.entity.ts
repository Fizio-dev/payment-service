import {
    Column,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';

import PaymentAccount from './payment-account.entity';
import { PayoutStatus } from './payout-status.enum';

@Entity('payout', { schema: 'payment' }) // Match the schema and table name
export default class Payout {
    @PrimaryGeneratedColumn('increment', { type: 'int8' }) // Use 'increment' with 'int8' type to match your table
    id: number;

    @ManyToOne(() => PaymentAccount, { nullable: false })
    @JoinColumn({ name: 'payment_account_id' }) // Join column for the foreign key
    paymentAccount: PaymentAccount;

    @Column({ type: 'timestamp', precision: 6, nullable: true }) // Match 'timestamp(6)' from your table definition
    createdAt: Date;

    @Column({ type: 'int', nullable: true }) // Match 'int4' from your table definition
    amount: number;

    @Column({ type: 'varchar', nullable: true, enum: PayoutStatus })
    status: PayoutStatus;

    @Column({ type: 'varchar', nullable: true })
    transferId: string;

    constructor(partial?: Partial<Payout>) {
        Object.assign(this, partial);
    }
}
