import { NextRequest, NextResponse } from 'next/server';
import { getAllLoans, getLoansByUser, addLoan, generateLoanId, isRedisConfigured, Loan } from '@/lib/redis';

export async function GET(request: NextRequest) {
    if (!isRedisConfigured) {
        return NextResponse.json({ error: 'Storage not configured' }, { status: 503 });
    }

    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    try {
        const loans = userId ? await getLoansByUser(userId) : await getAllLoans();
        return NextResponse.json(loans);
    } catch (err) {
        console.error('Error fetching loans:', err);
        return NextResponse.json({ error: 'Failed to fetch loans' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    if (!isRedisConfigured) {
        return NextResponse.json({ error: 'Storage not configured' }, { status: 503 });
    }

    try {
        const body = await request.json();
        const { userId, userName, userEmail, type, amount, purpose, landSize, cropType } = body;

        if (!userId || !type || !amount) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const now = new Date().toISOString();
        const newLoan: Loan = {
            id: generateLoanId(),
            userId,
            userName: userName || '',
            userEmail: userEmail || '',
            type,
            amount: parseFloat(amount),
            purpose: purpose || '',
            status: 'pending',
            documents: [],
            amountPaid: 0,
            createdAt: now,
            updatedAt: now,
            landSize: landSize ? parseFloat(landSize) : undefined,
            cropType: cropType || undefined,
        };

        await addLoan(newLoan);
        return NextResponse.json(newLoan, { status: 201 });
    } catch (err) {
        console.error('Error creating loan:', err);
        return NextResponse.json({ error: 'Failed to create loan' }, { status: 500 });
    }
}
