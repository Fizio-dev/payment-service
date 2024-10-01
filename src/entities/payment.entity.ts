import {
    Column,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';

import { PaymentStatus } from './payment-status.enum';
import Payout from './payout.entity';

@Entity('payment')
export default class Payment {
   //it was int8 instead of increment 
    @PrimaryGeneratedColumn('increment')
    id: number;

    @Column({ type: 'varchar' })
    userId: string;

    @Column({ type: 'int' })
    amount: number;

    @Column({ type: 'varchar', nullable: true })
    description: string;

    @Column({ type: 'varchar', nullable: true, enum: PaymentStatus })
    status: PaymentStatus;

    @Column({ type: 'int', nullable: true })
    originalAmount: number;

    @Column({ type: 'timestamp', nullable: true })
    createdAt: Date;

    @Column({ type: 'timestamp', nullable: true })
    releasedAt: Date;

    @Column({ type: 'timestamp', nullable: true })
    approvedAt: Date;

    @Column({ type: 'timestamp', nullable: true })
    updatedAt: Date;

    @Column({ type: 'timestamp', nullable: true })
    paidAt: Date;

    @Column({ type: 'timestamp', nullable: true })
    cancelledAt: Date;

    @Column({ type: 'varchar', nullable: true })
    createdBy: string;

    @Column({ type: 'varchar', nullable: true })
    updatedBy: string;

    @Column({ type: 'varchar', nullable: true })
    externalId: string;

    @ManyToOne(() => Payout, { nullable: true })
    @JoinColumn({ name: 'payout_id' })
    payout: Payout;

    constructor(partial?: Partial<Payment>) {
        Object.assign(this, partial);
    }
}
