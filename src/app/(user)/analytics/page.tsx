'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts';
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

export default function AnalyticsPage() {
    const { profile } = useAuth();
    const [risk, setRisk] = useState<RiskAssessment | null>(null);
    const [payments, setPayments] = useState<PaymentEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalLoan, setTotalLoan] = useState(0);
    const [totalPaid, setTotalPaid] = useState(0);

    useEffect(() => {
        if (!profile || !isSupabaseConfigured) {
            setLoading(false);
            return;
        }

        const fetchData = async () => {
            try {
                // Fetch loans
                const { data: loansData } = await supabase
                    .from('loans')
                    .select('*')
                    .eq('userId', profile.uid);

                let loanTotal = 0;
                let paidTotal = 0;

                if (loansData) {
                    loansData.forEach((d) => {
                        if (d.status === 'approved') {
                            loanTotal += d.amount || 0;
                            paidTotal += d.amountPaid || 0;
                        }
                    });
                }

                setTotalLoan(loanTotal);
                setTotalPaid(paidTotal);

                // Fetch payments
                const { data: paymentsData } = await supabase
                    .from('payments')
                    .select('*')
                    .eq('userId', profile.uid)
                    .order('date', { ascending: true });

                const paymentList: PaymentEntry[] = (paymentsData || []).map((d) => {
                    const date = d.date ? new Date(d.date) : new Date();
                    return {
                        amount: d.amount,
                        date: date.toLocaleDateString('en-IN'),
                        month: date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
                    };
                });

                setPayments(paymentList);

                // Call analytics API
                if (loanTotal > 0) {
                    const res = await fetch('/api/analytics', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            totalLoanAmount: loanTotal,
                            amountPaid: paidTotal,
                            monthlyIncome: 30000, // Default estimate
                            loanTenureMonths: 24,
                            paymentHistory: paymentList.map((p, i) => ({
                                amount: p.amount,
                                date: p.date,
                                onTime: i % 3 !== 2, // Simulate based on pattern
                            })),
                        }),
                    });
                    const data = await res.json();
                    setRisk(data);
                }
            } catch (err) {
                console.error('Analytics error:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [profile]);

    const COLORS = ['#2d7a3a', '#c48a1a', '#c44a4a', '#3a6bc4'];

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
                    {/* Risk Summary */}
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

                    {/* Factors */}
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

                    {/* Payment Chart */}
                    <div className={styles.chartSection}>
                        <div className={styles.chartCard}>
                            <h3>Payment History</h3>
                            {payments.length > 0 ? (
                                <ResponsiveContainer width="100%" height={280}>
                                    <BarChart data={payments}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                                        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                                        <YAxis tick={{ fontSize: 12 }} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: 8, border: '1px solid var(--border-light)' }}
                                            formatter={(value) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Amount']}
                                        />
                                        <Bar dataKey="amount" fill="var(--accent-green)" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <p className={styles.noData}>No payment data available yet.</p>
                            )}
                        </div>

                        <div className={styles.chartCard}>
                            <h3>Loan Breakdown</h3>
                            <ResponsiveContainer width="100%" height={280}>
                                <PieChart>
                                    <Pie
                                        data={[
                                            { name: 'Paid', value: totalPaid },
                                            { name: 'Outstanding', value: totalLoan - totalPaid },
                                        ]}
                                        cx="50%" cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        dataKey="value"
                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                        label={(props: any) => `${props.name || ''} ${((props.percent) * 100).toFixed(0)}%`}
                                    >
                                        <Cell fill="var(--accent-green)" />
                                        <Cell fill="var(--border-medium)" />
                                    </Pie>
                                    <Tooltip formatter={(value) => `₹${Number(value).toLocaleString('en-IN')}`} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* On Track */}
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
