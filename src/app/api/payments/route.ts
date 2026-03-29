import { NextRequest, NextResponse } from 'next/server';
import { isRedisConfigured, addPayment, getPaymentsByUser, getAllPendingPayments, Payment } from '@/lib/redis';

export async function GET(req: NextRequest) {
    if (!isRedisConfigured) {
        return NextResponse.json({ error: 'Storage not configured' }, { status: 503 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const type = searchParams.get('type'); // e.g., 'pending'

    try {
        if (type === 'pending') {
            const payments = await getAllPendingPayments();
            return NextResponse.json(payments);
        }

        if (userId) {
            const payments = await getPaymentsByUser(userId);
            return NextResponse.json(payments);
        }

        return NextResponse.json({ error: 'Provide userId or type=pending' }, { status: 400 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Failed to fetch' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    if (!isRedisConfigured) {
        return NextResponse.json({ error: 'Storage not configured' }, { status: 503 });
    }

    try {
        const body = await req.json();
        const { loanId, userId, amount, proofUrl } = body;

        if (!loanId || !userId || !amount || !proofUrl) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        const payment: Payment = {
            id: `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            loanId,
            userId,
            amount,
            type: 'offline',
            proofUrl,
            status: 'pending',
            createdAt: new Date().toISOString(),
        };

        const id = await addPayment(payment);
        return NextResponse.json({ success: true, id });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Failed to sync' }, { status: 500 });
    }
}
