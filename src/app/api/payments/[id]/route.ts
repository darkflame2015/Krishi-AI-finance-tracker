import { NextRequest, NextResponse } from 'next/server';
import { isRedisConfigured, updatePayment, getLoan, updateLoan } from '@/lib/redis';
import { Redis } from '@upstash/redis';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    if (!isRedisConfigured) {
        return NextResponse.json({ error: 'Storage not configured' }, { status: 503 });
    }

    try {
        const { id } = await params;
        const body = await req.json();
        const { status } = body;

        if (status !== 'approved' && status !== 'rejected') {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
        }

        // We need direct redis access here to get the payment first since we only expose getters by user/loan...
        const redis = new Redis({
            url: process.env.UPSTASH_REDIS_REST_URL!,
            token: process.env.UPSTASH_REDIS_REST_TOKEN!,
        });

        const payment = await redis.get<any>(`payment:${id}`);
        if (!payment) {
            return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
        }

        if (payment.status !== 'pending') {
            return NextResponse.json({ error: 'Payment is already processed' }, { status: 400 });
        }

        await updatePayment(id, { status });

        // If approved, update loan amountPaid
        if (status === 'approved') {
            const loan = await getLoan(payment.loanId);
            if (loan) {
                const newPaid = (loan.amountPaid || 0) + payment.amount;
                await updateLoan(payment.loanId, { amountPaid: newPaid });
            }
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Failed to update' }, { status: 500 });
    }
}
