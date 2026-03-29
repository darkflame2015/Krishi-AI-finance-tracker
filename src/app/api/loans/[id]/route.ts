import { NextRequest, NextResponse } from 'next/server';
import { getLoan, updateLoan, deleteLoan, isRedisConfigured, Loan } from '@/lib/redis';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!isRedisConfigured) {
        return NextResponse.json({ error: 'Storage not configured' }, { status: 503 });
    }

    const { id } = await params;

    try {
        const loan = await getLoan(id);
        if (!loan) {
            return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
        }
        return NextResponse.json(loan);
    } catch (err) {
        console.error('Error fetching loan:', err);
        return NextResponse.json({ error: 'Failed to fetch loan' }, { status: 500 });
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!isRedisConfigured) {
        return NextResponse.json({ error: 'Storage not configured' }, { status: 503 });
    }

    const { id } = await params;

    try {
        const body = await request.json();
        const { status, adminNotes, documents, amountPaid } = body;

        const updates: Partial<Loan> = {};
        if (status !== undefined) updates.status = status;
        if (adminNotes !== undefined) updates.adminNotes = adminNotes;
        if (documents !== undefined) updates.documents = documents;
        if (amountPaid !== undefined) updates.amountPaid = amountPaid;

        await updateLoan(id, updates);
        const updatedLoan = await getLoan(id);
        
        return NextResponse.json(updatedLoan);
    } catch (err) {
        console.error('Error updating loan:', err);
        return NextResponse.json({ error: 'Failed to update loan' }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!isRedisConfigured) {
        return NextResponse.json({ error: 'Storage not configured' }, { status: 503 });
    }

    const { id } = await params;

    try {
        await deleteLoan(id);
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('Error deleting loan:', err);
        return NextResponse.json({ error: 'Failed to delete loan' }, { status: 500 });
    }
}
