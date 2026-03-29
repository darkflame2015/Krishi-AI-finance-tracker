import { Redis } from '@upstash/redis';

export interface Loan {
    id: string;
    userId: string;
    userName?: string;
    userEmail?: string;
    type: string;
    amount: number;
    status: 'pending' | 'under_review' | 'approved' | 'rejected';
    purpose: string;
    documents: string[];
    amountPaid: number;
    adminNotes?: string;
    createdAt: string;
    updatedAt: string;
    landSize?: number;
    cropType?: string;
}

const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
    : null;

export const isRedisConfigured = Boolean(redis);

const ALL_LOANS_SET = 'loans:all';
const LOANS_BY_USER_PREFIX = 'loans:user:';

export async function getAllLoans(): Promise<Loan[]> {
    if (!redis) return [];
    try {
        const loanIds = await redis.smembers(ALL_LOANS_SET) as string[];
        if (!loanIds || loanIds.length === 0) return [];

        const loans: Loan[] = [];
        for (const id of loanIds) {
            const loan = await redis.get<Loan>(`loan:${id}`);
            if (loan) loans.push(loan);
        }

        return loans.sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    } catch (err) {
        console.error('Error fetching loans:', err);
        return [];
    }
}

export async function getLoansByUser(userId: string): Promise<Loan[]> {
    if (!redis) return [];
    try {
        const loanIds = await redis.smembers(`${LOANS_BY_USER_PREFIX}${userId}`) as string[];
        if (!loanIds || loanIds.length === 0) return [];

        const loans: Loan[] = [];
        for (const id of loanIds) {
            const loan = await redis.get<Loan>(`loan:${id}`);
            if (loan) loans.push(loan);
        }

        return loans.sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    } catch (err) {
        console.error('Error fetching user loans:', err);
        return [];
    }
}

export async function getLoan(id: string): Promise<Loan | null> {
    if (!redis) return null;
    try {
        return await redis.get<Loan>(`loan:${id}`);
    } catch (err) {
        console.error('Error fetching loan:', err);
        return null;
    }
}

export async function addLoan(loan: Loan): Promise<string> {
    if (!redis) throw new Error('Redis not configured');

    await redis.set(`loan:${loan.id}`, loan);
    await redis.sadd(ALL_LOANS_SET, loan.id);
    await redis.sadd(`${LOANS_BY_USER_PREFIX}${loan.userId}`, loan.id);

    return loan.id;
}

export async function updateLoan(id: string, updates: Partial<Loan>): Promise<void> {
    if (!redis) return;

    const existing = await getLoan(id);
    if (!existing) return;

    const updated: Loan = {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString(),
    };

    await redis.set(`loan:${id}`, updated);
}

export async function deleteLoan(id: string): Promise<void> {
    if (!redis) return;

    const loan = await getLoan(id);
    if (loan) {
        await redis.srem(`${LOANS_BY_USER_PREFIX}${loan.userId}`, id);
    }
    await redis.del(`loan:${id}`);
    await redis.srem(ALL_LOANS_SET, id);
}

export async function getLoanStats(userId?: string): Promise<{
    total: number;
    pending: number;
    underReview: number;
    approved: number;
    rejected: number;
    totalAmount: number;
    totalPaid: number;
}> {
    const loans = userId ? await getLoansByUser(userId) : await getAllLoans();

    return {
        total: loans.length,
        pending: loans.filter(l => l.status === 'pending').length,
        underReview: loans.filter(l => l.status === 'under_review').length,
        approved: loans.filter(l => l.status === 'approved').length,
        rejected: loans.filter(l => l.status === 'rejected').length,
        totalAmount: loans.reduce((sum, l) => sum + l.amount, 0),
        totalPaid: loans.reduce((sum, l) => sum + (l.amountPaid || 0), 0),
    };
}

export function generateLoanId(): string {
    return `loan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export interface Payment {
    id: string;
    loanId: string;
    userId: string;
    amount: number;
    type: 'online' | 'offline';
    proofUrl?: string; // For offline payments
    status: 'pending' | 'approved' | 'rejected';
    createdAt: string;
}

const ALL_PAYMENTS_SET = 'payments:all';
const PAYMENTS_BY_LOAN_PREFIX = 'payments:loan:';
const PAYMENTS_BY_USER_PREFIX = 'payments:user:';

export async function addPayment(payment: Payment): Promise<string> {
    if (!redis) throw new Error('Redis not configured');
    await redis.set(`payment:${payment.id}`, payment);
    await redis.sadd(ALL_PAYMENTS_SET, payment.id);
    await redis.sadd(`${PAYMENTS_BY_LOAN_PREFIX}${payment.loanId}`, payment.id);
    await redis.sadd(`${PAYMENTS_BY_USER_PREFIX}${payment.userId}`, payment.id);
    return payment.id;
}

export async function updatePayment(id: string, updates: Partial<Payment>): Promise<void> {
    if (!redis) return;
    const existing = await redis.get<Payment>(`payment:${id}`);
    if (!existing) return;
    const updated: Payment = { ...existing, ...updates };
    await redis.set(`payment:${id}`, updated);
}

export async function getPaymentsByLoan(loanId: string): Promise<Payment[]> {
    if (!redis) return [];
    try {
        const paymentIds = await redis.smembers(`${PAYMENTS_BY_LOAN_PREFIX}${loanId}`) as string[];
        if (!paymentIds || paymentIds.length === 0) return [];
        const payments: Payment[] = [];
        for (const id of paymentIds) {
            const p = await redis.get<Payment>(`payment:${id}`);
            if (p) payments.push(p);
        }
        return payments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch {
        return [];
    }
}

export async function getPaymentsByUser(userId: string): Promise<Payment[]> {
    if (!redis) return [];
    try {
        const paymentIds = await redis.smembers(`${PAYMENTS_BY_USER_PREFIX}${userId}`) as string[];
        if (!paymentIds || paymentIds.length === 0) return [];
        const payments: Payment[] = [];
        for (const id of paymentIds) {
            const p = await redis.get<Payment>(`payment:${id}`);
            if (p) payments.push(p);
        }
        return payments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch {
        return [];
    }
}

export async function getAllPendingPayments(): Promise<Payment[]> {
    if (!redis) return [];
    try {
        const paymentIds = await redis.smembers(ALL_PAYMENTS_SET) as string[];
        if (!paymentIds || paymentIds.length === 0) return [];
        const pending: Payment[] = [];
        for (const id of paymentIds) {
            const p = await redis.get<Payment>(`payment:${id}`);
            if (p && p.status === 'pending' && p.type === 'offline') pending.push(p);
        }
        return pending.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } catch {
        return [];
    }
}
