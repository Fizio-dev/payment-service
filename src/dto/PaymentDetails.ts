export default interface PaymentDetails {
    id: number;
    userId: string;
    amount: number;
    description: string;
    status: string;
    originalAmount: number;
    approvedAt: string | null;
    paidAt: string | null;
    externalId: string;
}