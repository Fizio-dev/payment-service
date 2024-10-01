export default interface CreatePaymentRequest {
    userId: string;
    amount: number;
    description: string;
    externalId: string;
}