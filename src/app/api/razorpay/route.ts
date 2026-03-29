import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { isRedisConfigured } from '@/lib/redis';

export async function POST(req: Request) {
    if (!isRedisConfigured) {
        return NextResponse.json({ error: 'Storage not configured' }, { status: 503 });
    }

    try {
        const { amount, loanId, userId } = await req.json();

        if (!amount || !loanId || !userId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const razorpay = new Razorpay({
            key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
            key_secret: process.env.RAZORPAY_KEY_SECRET!,
        });

        // Amount is in rupees, Razorpay needs paise
        const options = {
            amount: amount * 100, 
            currency: 'INR',
            receipt: `rcpt_${loanId}_${Date.now()}`.substring(0, 40),
            notes: { loanId, userId },
        };

        const order = await razorpay.orders.create(options);
        return NextResponse.json(order);
    } catch (err: any) {
        console.error('Razorpay order creation error:', err);
        return NextResponse.json({ error: err.message || 'Failed to create order' }, { status: 500 });
    }
}
