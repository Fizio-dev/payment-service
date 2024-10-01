export default interface UpdatePaymentRequest {
    id: number;
    amount: number;
    description: string;
    approve: boolean;
}