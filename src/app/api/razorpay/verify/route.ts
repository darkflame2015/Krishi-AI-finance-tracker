import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { isRedisConfigured, addPayment, Payment, getLoan, updateLoan } from '@/lib/redis';

export async function POST(req: Request) {
    if (!isRedisConfigured) {
        return NextResponse.json({ error: 'Storage not configured' }, { status: 503 });
    }

    try {
        const body = await req.json();
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount, loanId, userId } = body;

        const bodyString = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
            .update(bodyString.toString())
            .digest('hex');

        if (expectedSignature !== razorpay_signature) {
            return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
        }

        // Signature is valid, record the payment
        const payment: Payment = {
            id: `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            loanId,
            userId,
            amount: Number(amount),
            type: 'online',
            status: 'approved',
            createdAt: new Date().toISOString(),
        };

        await addPayment(payment);

        // Update the loan's amountPaid
        const loan = await getLoan(loanId);
        if (loan) {
            const newAmountPaid = (loan.amountPaid || 0) + Number(amount);
            await updateLoan(loanId, { amountPaid: newAmountPaid });
        }

        return NextResponse.json({ success: true, paymentId: payment.id });
    } catch (err: any) {
        console.error('Payment verification failed:', err);
        return NextResponse.json({ error: err.message || 'Verification failed' }, { status: 500 });
    }
}
