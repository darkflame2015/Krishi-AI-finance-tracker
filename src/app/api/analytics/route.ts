import { NextRequest, NextResponse } from 'next/server';

interface PaymentRecord {
    amount: number;
    date: string;
    onTime: boolean;
}

interface AnalyticsInput {
    totalLoanAmount: number;
    amountPaid: number;
    monthlyIncome: number;
    loanTenureMonths: number;
    paymentHistory: PaymentRecord[];
    creditScore?: number;
}

interface RiskAssessment {
    riskScore: number; // 0-100, lower is better
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    loanApprovalProbability: number; // 0-1
    debtRiskProbability: number; // 0-1
    repaymentPrediction: {
        predictedMonthlyPayment: number;
        estimatedCompletionDate: string;
        onTrackPercentage: number;
    };
    factors: { factor: string; impact: 'positive' | 'negative' | 'neutral'; weight: number }[];
}

function sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
}

function linearRegression(data: { x: number; y: number }[]): { slope: number; intercept: number; r2: number } {
    const n = data.length;
    if (n < 2) return { slope: 0, intercept: 0, r2: 0 };

    const sumX = data.reduce((s, d) => s + d.x, 0);
    const sumY = data.reduce((s, d) => s + d.y, 0);
    const sumXY = data.reduce((s, d) => s + d.x * d.y, 0);
    const sumX2 = data.reduce((s, d) => s + d.x * d.x, 0);
    const meanY = sumY / n;

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX) || 0;
    const intercept = (sumY - slope * sumX) / n;

    const ssRes = data.reduce((s, d) => s + Math.pow(d.y - (slope * d.x + intercept), 2), 0);
    const ssTot = data.reduce((s, d) => s + Math.pow(d.y - meanY, 2), 0);
    const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;

    return { slope, intercept, r2 };
}

function calculateRiskAssessment(input: AnalyticsInput): RiskAssessment {
    const {
        totalLoanAmount,
        amountPaid,
        monthlyIncome,
        loanTenureMonths,
        paymentHistory,
        creditScore = 650,
    } = input;

    const factors: RiskAssessment['factors'] = [];

    // 1. Debt-to-Income Ratio (DTI)
    const monthlyPayment = totalLoanAmount / Math.max(loanTenureMonths, 1);
    const dti = monthlyIncome > 0 ? monthlyPayment / monthlyIncome : 1;
    const dtiScore = dti < 0.3 ? 0.9 : dti < 0.5 ? 0.6 : dti < 0.7 ? 0.3 : 0.1;
    factors.push({
        factor: 'Debt-to-Income Ratio',
        impact: dtiScore > 0.5 ? 'positive' : dtiScore > 0.3 ? 'neutral' : 'negative',
        weight: dtiScore,
    });

    // 2. Payment Consistency
    const onTimePayments = paymentHistory.filter((p) => p.onTime).length;
    const paymentConsistency = paymentHistory.length > 0 ? onTimePayments / paymentHistory.length : 0.5;
    factors.push({
        factor: 'Payment Consistency',
        impact: paymentConsistency > 0.8 ? 'positive' : paymentConsistency > 0.5 ? 'neutral' : 'negative',
        weight: paymentConsistency,
    });

    // 3. Repayment Progress
    const repaymentProgress = totalLoanAmount > 0 ? amountPaid / totalLoanAmount : 0;
    factors.push({
        factor: 'Repayment Progress',
        impact: repaymentProgress > 0.5 ? 'positive' : repaymentProgress > 0.2 ? 'neutral' : 'negative',
        weight: repaymentProgress,
    });

    // 4. Credit Score Factor
    const creditFactor = Math.max(0, Math.min(1, (creditScore - 300) / 550));
    factors.push({
        factor: 'Credit Score',
        impact: creditFactor > 0.6 ? 'positive' : creditFactor > 0.3 ? 'neutral' : 'negative',
        weight: creditFactor,
    });

    // 5. Payment Trend (using linear regression)
    const paymentData = paymentHistory.map((p, i) => ({
        x: i,
        y: p.amount,
    }));
    const trend = linearRegression(paymentData);
    const trendScore = trend.slope >= 0 ? 0.7 : 0.3;
    factors.push({
        factor: 'Payment Trend',
        impact: trend.slope >= 0 ? 'positive' : 'negative',
        weight: trendScore,
    });

    // Weighted Risk Score (0-100)
    const weights = [0.25, 0.3, 0.15, 0.2, 0.1];
    const scores = [dtiScore, paymentConsistency, repaymentProgress, creditFactor, trendScore];
    const weightedScore = scores.reduce((sum, s, i) => sum + s * weights[i], 0);
    const riskScore = Math.round((1 - weightedScore) * 100);

    // Risk Level
    let riskLevel: RiskAssessment['riskLevel'];
    if (riskScore < 25) riskLevel = 'low';
    else if (riskScore < 50) riskLevel = 'medium';
    else if (riskScore < 75) riskLevel = 'high';
    else riskLevel = 'critical';

    // Loan Approval Probability (logistic regression model)
    const logitInput = -2 + 3 * creditFactor + 2 * paymentConsistency - 2 * dti + repaymentProgress;
    const loanApprovalProbability = Math.round(sigmoid(logitInput) * 100) / 100;

    // Debt Risk
    const debtRiskInput = 1 - 2 * creditFactor - paymentConsistency + 2 * dti;
    const debtRiskProbability = Math.round(sigmoid(debtRiskInput) * 100) / 100;

    // Repayment Prediction
    const avgMonthlyPayment =
        paymentHistory.length > 0
            ? paymentHistory.reduce((s, p) => s + p.amount, 0) / paymentHistory.length
            : monthlyPayment;
    const remaining = totalLoanAmount - amountPaid;
    const monthsRemaining = avgMonthlyPayment > 0 ? Math.ceil(remaining / avgMonthlyPayment) : loanTenureMonths;
    const completionDate = new Date();
    completionDate.setMonth(completionDate.getMonth() + monthsRemaining);

    const expectedProgress = paymentHistory.length / Math.max(loanTenureMonths, 1);
    const actualProgress = repaymentProgress;
    const onTrackPercentage = Math.min(100, Math.round((actualProgress / Math.max(expectedProgress, 0.01)) * 100));

    return {
        riskScore,
        riskLevel,
        loanApprovalProbability,
        debtRiskProbability,
        repaymentPrediction: {
            predictedMonthlyPayment: Math.round(avgMonthlyPayment),
            estimatedCompletionDate: completionDate.toISOString().split('T')[0],
            onTrackPercentage: Math.min(onTrackPercentage, 100),
        },
        factors,
    };
}

export async function POST(req: NextRequest) {
    try {
        const body: AnalyticsInput = await req.json();

        if (!body.totalLoanAmount || !body.monthlyIncome) {
            return NextResponse.json(
                { error: 'Missing required fields: totalLoanAmount, monthlyIncome' },
                { status: 400 }
            );
        }

        const result = calculateRiskAssessment(body);
        return NextResponse.json(result);
    } catch (error) {
        console.error('Analytics error:', error);
        return NextResponse.json(
            { error: 'Failed to compute analytics' },
            { status: 500 }
        );
    }
}
