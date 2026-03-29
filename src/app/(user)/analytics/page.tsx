'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { HiOutlineShieldCheck, HiOutlineTrendingUp, HiOutlineTrendingDown } from 'react-icons/hi';
import styles from './analytics.module.css';

interface RiskAssessment {
    riskScore: number;
    riskLevel: string;
    loanApprovalProbability: number;
    debtRiskProbability: number;
    repaymentPrediction: {
        predictedMonthlyPayment: number;
        estimatedCompletionDate: string;
        onTrackPercentage: number;
    };
    factors: { factor: string; impact: string; weight: number }[];
}

interface PaymentEntry {
    amount: number;
    date: string;
    month: string;
}

interface LoanData {
    id: string;
    amount: number;
    amountPaid: number;
    status: string;
}

export default function AnalyticsPage() {
    const { profile } = useAuth();
    const [risk, setRisk] = useState<RiskAssessment | null>(null);
    const [payments, setPayments] = useState<PaymentEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalLoan, setTotalLoan] = useState(0);
    const [totalPaid, setTotalPaid] = useState(0);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch('/api/loans?userId=' + profile?.uid);
                let loansData: LoanData[] = [];
                
                if (res.ok) {
                    loansData = await res.json();
                }

                let loanTotal = 0;
                let paidTotal = 0;

                loansData.forEach((d) => {
                    if (d.status === 'approved') {
                        loanTotal += d.amount || 0;
                        paidTotal += d.amountPaid || 0;
                    }
                });

                setTotalLoan(loanTotal);
                setTotalPaid(paidTotal);

                const storedPayments = localStorage.getItem('krishi_payments_' + profile?.uid);
                const paymentList: PaymentEntry[] = storedPayments ? JSON.parse(storedPayments) : [];
                
                setPayments(paymentList);

                if (loanTotal > 0) {
                    const res2 = await fetch('/api/analytics', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            totalLoanAmount: loanTotal,
                            amountPaid: paidTotal,
                            monthlyIncome: 30000,
                            loanTenureMonths: 24,
                            paymentHistory: paymentList.map((p, i) => ({
                                amount: p.amount,
                                date: p.date,
                                onTime: i % 3 !== 2,
                            })),
                        }),
                    });
                    const data = await res2.json();
                    setRisk(data);
                }
            } catch (err) {
                console.error('Analytics error:', err);
            } finally {
                setLoading(false);
            }
        };

        if (profile?.uid) {
            fetchData();
        } else {
            setLoading(false);
        }
    }, [profile?.uid]);

    const riskColor = (level: string) => {
        switch (level) {
            case 'low': return 'var(--accent-green)';
            case 'medium': return 'var(--accent-amber)';
            case 'high': return 'var(--accent-red)';
            case 'critical': return '#8b0000';
            default: return 'var(--text-muted)';
        }
    };

    if (loading) {
        return <div className="loading-container"><div className="spinner" /></div>;
    }

    return (
        <div className={styles.page}>
            <div className="page-header">
                <h1>Analytics Dashboard</h1>
                <p>AI-powered analysis of your financial activities and risk assessment</p>
            </div>

            {totalLoan === 0 ? (
                <div className="empty-state">
                    <HiOutlineShieldCheck size={48} />
                    <h3>No Analytics Available</h3>
                    <p>Analytics will be generated once you have active loans and payment history.</p>
                </div>
            ) : (
                <>
                    {risk && (
                        <div className={styles.riskGrid}>
                            <div className={styles.riskCard}>
                                <span className={styles.riskLabel}>Risk Score</span>
                                <div className={styles.riskScoreCircle}>
                                    <svg viewBox="0 0 120 120" className={styles.riskSvg}>
                                        <circle cx="60" cy="60" r="52" fill="none" stroke="var(--border-light)" strokeWidth="8" />
                                        <circle
                                            cx="60" cy="60" r="52" fill="none"
                                            stroke={riskColor(risk.riskLevel)}
                                            strokeWidth="8"
                                            strokeDasharray={`${(risk.riskScore / 100) * 327} 327`}
                                            transform="rotate(-90 60 60)"
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                    <span className={styles.riskScoreNum}>{risk.riskScore}</span>
                                </div>
                                <span className={`badge badge-${risk.riskLevel === 'low' ? 'success' : risk.riskLevel === 'medium' ? 'warning' : 'danger'}`}>
                                    {risk.riskLevel} risk
                                </span>
                            </div>

                            <div className={styles.riskCard}>
                                <span className={styles.riskLabel}>Loan Approval Prediction</span>
                                <span className={styles.predictionValue} style={{ color: risk.loanApprovalProbability > 0.6 ? 'var(--accent-green)' : 'var(--accent-amber)' }}>
                                    {Math.round(risk.loanApprovalProbability * 100)}%
                                </span>
                                <span className={styles.predictionDesc}>
                                    {risk.loanApprovalProbability > 0.7 ? 'High chances of approval' : risk.loanApprovalProbability > 0.4 ? 'Moderate chances' : 'Low chances — improve repayment consistency'}
                                </span>
                            </div>

                            <div className={styles.riskCard}>
                                <span className={styles.riskLabel}>Debt Risk</span>
                                <span className={styles.predictionValue} style={{ color: risk.debtRiskProbability < 0.4 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                                    {Math.round(risk.debtRiskProbability * 100)}%
                                </span>
                                <span className={styles.predictionDesc}>
                                    {risk.debtRiskProbability < 0.3 ? 'Low debt risk' : risk.debtRiskProbability < 0.6 ? 'Moderate debt risk' : 'High debt risk — reduce borrowing'}
                                </span>
                            </div>

                            <div className={styles.riskCard}>
                                <span className={styles.riskLabel}>Repayment Prediction</span>
                                <span className={styles.predictionValue} style={{ color: 'var(--accent-blue)' }}>
                                    ₹{risk.repaymentPrediction.predictedMonthlyPayment.toLocaleString('en-IN')}
                                </span>
                                <span className={styles.predictionDesc}>
                                    Predicted monthly · Est. completion: {risk.repaymentPrediction.estimatedCompletionDate}
                                </span>
                            </div>
                        </div>
                    )}

                    {risk && (
                        <div className={styles.factorsCard}>
                            <h3>Risk Factors Analysis</h3>
                            <div className={styles.factorsList}>
                                {risk.factors.map((f, i) => (
                                    <div key={i} className={styles.factorRow}>
                                        <span className={styles.factorIcon}>
                                            {f.impact === 'positive' ? <HiOutlineTrendingUp style={{ color: 'var(--accent-green)' }} /> :
                                                f.impact === 'negative' ? <HiOutlineTrendingDown style={{ color: 'var(--accent-red)' }} /> :
                                                    <HiOutlineShieldCheck style={{ color: 'var(--accent-amber)' }} />}
                                        </span>
                                        <span className={styles.factorName}>{f.factor}</span>
                                        <div className={styles.factorBar}>
                                            <div
                                                className={styles.factorFill}
                                                style={{
                                                    width: `${f.weight * 100}%`,
                                                    background: f.impact === 'positive' ? 'var(--accent-green)' : f.impact === 'negative' ? 'var(--accent-red)' : 'var(--accent-amber)',
                                                }}
                                            />
                                        </div>
                                        <span className={styles.factorWeight}>{Math.round(f.weight * 100)}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className={styles.chartSection}>
                        <div className={styles.chartCard}>
                            <h3>Payment History</h3>
                            {payments.length > 0 ? (
                                <p className={styles.noData}>Payment tracking coming soon</p>
                            ) : (
                                <p className={styles.noData}>No payment data available yet.</p>
                            )}
                        </div>

                        <div className={styles.chartCard}>
                            <h3>Loan Breakdown</h3>
                            <p className={styles.noData}>Total: ₹{totalLoan.toLocaleString('en-IN')}</p>
                        </div>
                    </div>

                    {risk && (
                        <div className={styles.trackCard}>
                            <h3>Repayment Track</h3>
                            <div className="progress-bar" style={{ height: 12 }}>
                                <div className="progress-fill" style={{ width: `${risk.repaymentPrediction.onTrackPercentage}%` }} />
                            </div>
                            <span className={styles.trackPercent}>
                                {risk.repaymentPrediction.onTrackPercentage}% on track
                            </span>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
