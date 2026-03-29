'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import {
    HiOutlineCurrencyRupee,
    HiOutlineCalculator,
    HiOutlineDocumentText,
    HiOutlineCreditCard,
} from 'react-icons/hi';
import styles from './finance.module.css';

type TabType = 'overview' | 'calculator' | 'apply-loan' | 'apply-kcc' | 'risk-analysis';

export default function FinancePage() {
    const { profile } = useAuth();
    const { sendNotification } = useNotifications();
    const [activeTab, setActiveTab] = useState<TabType>('overview');
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState('');

    const [loanCalcAmount, setLoanCalcAmount] = useState(100000);
    const [interestRate, setInterestRate] = useState(7);
    const [tenure, setTenure] = useState(12);

    const [loanType, setLoanType] = useState('Crop Loan');
    const [loanAmount, setLoanAmount] = useState('');
    const [loanPurpose, setLoanPurpose] = useState('');

    const [kccLandSize, setKccLandSize] = useState('');
    const [kccCropType, setKccCropType] = useState('');

    const monthlyRate = interestRate / 100 / 12;
    const emi =
        monthlyRate > 0
            ? (loanCalcAmount * monthlyRate * Math.pow(1 + monthlyRate, tenure)) /
            (Math.pow(1 + monthlyRate, tenure) - 1)
            : loanCalcAmount / tenure;
    const totalPayment = emi * tenure;
    const totalInterest = totalPayment - loanCalcAmount;

    // Risk Analysis States
    const [riskIncome, setRiskIncome] = useState(30000);
    const [riskLoanAmt, setRiskLoanAmt] = useState(100000);
    const [riskCreditScore, setRiskCreditScore] = useState(650);
    const [riskHistory, setRiskHistory] = useState('good'); // 'excellent', 'good', 'fair', 'poor'
    const [riskResult, setRiskResult] = useState<any>(null);

    const calculateRisk = () => {
        // Deterministic formula-based risk analysis (Client-side, Non-API)
        // 1. Debt-to-Income (DTI)
        const estimatedEmi = (riskLoanAmt * 0.07) / 12; // Simplified 7% flat for estimation
        const dti = estimatedEmi / Math.max(riskIncome, 1);
        const dtiScore = dti < 0.3 ? 0.9 : dti < 0.5 ? 0.6 : dti < 0.7 ? 0.3 : 0.1;

        // 2. Credit Score Factor
        const creditFactor = Math.max(0, Math.min(1, (riskCreditScore - 300) / 550));

        // 3. Payment History
        const historyMap: any = { 'excellent': 0.95, 'good': 0.8, 'fair': 0.5, 'poor': 0.2 };
        const historyFactor = historyMap[riskHistory];

        // Weighted Risk Score
        const weightedScore = (dtiScore * 0.4) + (creditFactor * 0.3) + (historyFactor * 0.3);
        const riskScore = Math.max(0, Math.min(100, Math.round((1 - weightedScore) * 100)));

        let riskLevel = 'low';
        if (riskScore > 75) riskLevel = 'critical';
        else if (riskScore > 50) riskLevel = 'high';
        else if (riskScore > 25) riskLevel = 'medium';

        // Logistic Regression Approximation for Approval Probability
        const logit = -2 + (3 * creditFactor) + (2 * historyFactor) - (2 * dti);
        const sigmoid = 1 / (1 + Math.exp(-logit));
        const approvalProb = Math.round(sigmoid * 100);

        setRiskResult({
            score: riskScore,
            level: riskLevel,
            approvalProbability: approvalProb,
            factors: [
                { name: 'Debt-to-Income', value: dtiScore, impact: dtiScore > 0.5 ? 'Positive' : 'Negative' },
                { name: 'Credit Score', value: creditFactor, impact: creditFactor > 0.5 ? 'Positive' : 'Negative' },
                { name: 'Repayment History', value: historyFactor, impact: historyFactor > 0.5 ? 'Positive' : 'Negative' }
            ]
        });
    };

    const handleLoanApplication = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile) return;
        setSubmitting(true);
        try {
            const res = await fetch('/api/loans', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: profile.uid,
                    userName: profile.displayName || '',
                    userEmail: profile.email || '',
                    type: loanType,
                    amount: loanAmount,
                    purpose: loanPurpose,
                }),
            });

            if (!res.ok) {
                throw new Error('Failed to submit loan');
            }

            await sendNotification(
                profile.uid,
                'Loan Application Submitted',
                `Your ${loanType} application for ₹${parseFloat(loanAmount).toLocaleString('en-IN')} has been submitted successfully.`,
                'success'
            );
            setSuccess('Loan application submitted successfully! Track it in the Loans section.');
            setLoanAmount('');
            setLoanPurpose('');
        } catch (err) {
            console.error('Failed to submit loan:', err);
        } finally {
            setSubmitting(false);
        }
    };

    const handleKCCApplication = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile) return;
        setSubmitting(true);
        try {
            const kccAmount = parseFloat(kccLandSize) * 50000;

            const res = await fetch('/api/loans', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: profile.uid,
                    userName: profile.displayName || '',
                    userEmail: profile.email || '',
                    type: 'Kisan Credit Card',
                    amount: kccAmount,
                    purpose: `KCC for ${kccCropType} cultivation on ${kccLandSize} acres`,
                    landSize: kccLandSize,
                    cropType: kccCropType,
                }),
            });

            if (!res.ok) {
                throw new Error('Failed to submit KCC');
            }

            await sendNotification(
                profile.uid,
                'KCC Application Submitted',
                `Your Kisan Credit Card application has been submitted. Estimated limit: ₹${kccAmount.toLocaleString('en-IN')}`,
                'success'
            );
            setSuccess('Kisan Credit Card application submitted!');
            setKccLandSize('');
            setKccCropType('');
        } catch (err) {
            console.error('Failed to submit KCC:', err);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className={styles.page}>
            <div className="page-header">
                <h1>Finance</h1>
                <p>Manage crop loans, calculate EMIs, and apply for Kisan Credit Card</p>
            </div>

            <div className="tabs">
                <button className={`tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => { setActiveTab('overview'); setSuccess(''); }}>
                    <HiOutlineCurrencyRupee /> Overview
                </button>
                <button className={`tab ${activeTab === 'calculator' ? 'active' : ''}`} onClick={() => { setActiveTab('calculator'); setSuccess(''); }}>
                    <HiOutlineCalculator /> Calculator
                </button>
                <button className={`tab ${activeTab === 'apply-loan' ? 'active' : ''}`} onClick={() => { setActiveTab('apply-loan'); setSuccess(''); }}>
                    <HiOutlineDocumentText /> Apply Loan
                </button>
                <button className={`tab ${activeTab === 'apply-kcc' ? 'active' : ''}`} onClick={() => { setActiveTab('apply-kcc'); setSuccess(''); }}>
                    <HiOutlineCreditCard /> Kisan Credit Card
                </button>
                <button className={`tab ${activeTab === 'risk-analysis' ? 'active' : ''}`} onClick={() => { setActiveTab('risk-analysis'); setSuccess(''); }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                        AI Risk Analysis
                    </div>
                </button>
            </div>

            {success && (
                <div className={styles.successMsg}>
                    {success}
                </div>
            )}

            {activeTab === 'overview' && (
                <div className={styles.overview}>
                    <div className={styles.infoCard}>
                        <h3>Crop Loan</h3>
                        <p>Short-term loans for crop production. Interest rates from 4-7% p.a. with government subsidy under Interest Subvention Scheme.</p>
                        <ul>
                            <li>Loan amount based on crop and land size</li>
                            <li>Tenure: 1 Kharif/Rabi season</li>
                            <li>Collateral: Crop hypothecation</li>
                            <li>3% interest subvention for timely repayment</li>
                        </ul>
                        <button className="btn btn-primary" onClick={() => setActiveTab('apply-loan')}>Apply Now</button>
                    </div>
                    <div className={styles.infoCard}>
                        <h3>Kisan Credit Card</h3>
                        <p>Flexible credit limit for agricultural needs. Single window for all crop production requirements.</p>
                        <ul>
                            <li>Credit limit based on land holding</li>
                            <li>Interest rate: 4% p.a. (with subvention)</li>
                            <li>Automatic renewal facility</li>
                            <li>Personal accident insurance cover</li>
                        </ul>
                        <button className="btn btn-primary" onClick={() => setActiveTab('apply-kcc')}>Apply Now</button>
                    </div>
                </div>
            )}

            {activeTab === 'calculator' && (
                <div className={styles.calculator}>
                    <div className={styles.calcInputs}>
                        <h3>EMI Calculator</h3>
                        <div className="form-group">
                            <label>Loan Amount (₹)</label>
                            <input
                                type="range"
                                min="10000"
                                max="1000000"
                                step="10000"
                                value={loanCalcAmount}
                                onChange={(e) => setLoanCalcAmount(parseInt(e.target.value))}
                                className={styles.slider}
                            />
                            <span className={styles.sliderValue}>₹{loanCalcAmount.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="form-group">
                            <label>Interest Rate (% p.a.)</label>
                            <input
                                type="range"
                                min="1"
                                max="20"
                                step="0.5"
                                value={interestRate}
                                onChange={(e) => setInterestRate(parseFloat(e.target.value))}
                                className={styles.slider}
                            />
                            <span className={styles.sliderValue}>{interestRate}%</span>
                        </div>
                        <div className="form-group">
                            <label>Tenure (months)</label>
                            <input
                                type="range"
                                min="3"
                                max="60"
                                step="3"
                                value={tenure}
                                onChange={(e) => setTenure(parseInt(e.target.value))}
                                className={styles.slider}
                            />
                            <span className={styles.sliderValue}>{tenure} months</span>
                        </div>
                    </div>
                    <div className={styles.calcResult}>
                        <h3>Breakdown</h3>
                        <div className={styles.resultItem}>
                            <span>Monthly EMI</span>
                            <span className={styles.resultValue}>₹{Math.round(emi).toLocaleString('en-IN')}</span>
                        </div>
                        <div className={styles.resultItem}>
                            <span>Total Interest</span>
                            <span className={styles.resultValue}>₹{Math.round(totalInterest).toLocaleString('en-IN')}</span>
                        </div>
                        <div className={styles.resultItem}>
                            <span>Total Payment</span>
                            <span className={styles.resultValue}>₹{Math.round(totalPayment).toLocaleString('en-IN')}</span>
                        </div>
                        <div className={styles.resultBreakdown}>
                            <div
                                className={styles.principal}
                                style={{ width: `${(loanCalcAmount / totalPayment) * 100}%` }}
                            />
                            <div
                                className={styles.interest}
                                style={{ width: `${(totalInterest / totalPayment) * 100}%` }}
                            />
                        </div>
                        <div className={styles.legend}>
                            <span><span className={styles.dotPrincipal} /> Principal</span>
                            <span><span className={styles.dotInterest} /> Interest</span>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'apply-loan' && (
                <div className="card" style={{ maxWidth: 560 }}>
                    <h3 style={{ marginBottom: 20 }}>Loan Application</h3>
                    <form onSubmit={handleLoanApplication}>
                        <div className="form-group">
                            <label>Loan Type</label>
                            <select
                                className="form-input"
                                value={loanType}
                                onChange={(e) => setLoanType(e.target.value)}
                            >
                                <option>Crop Loan</option>
                                <option>Agricultural Term Loan</option>
                                <option>Farm Mechanization Loan</option>
                                <option>Allied Activity Loan</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Loan Amount (₹)</label>
                            <input
                                type="number"
                                className="form-input"
                                placeholder="Enter loan amount"
                                value={loanAmount}
                                onChange={(e) => setLoanAmount(e.target.value)}
                                required
                                min="1000"
                            />
                        </div>
                        <div className="form-group">
                            <label>Purpose</label>
                            <textarea
                                className="form-input"
                                placeholder="Describe the purpose of your loan..."
                                value={loanPurpose}
                                onChange={(e) => setLoanPurpose(e.target.value)}
                                required
                                rows={3}
                                style={{ resize: 'vertical' }}
                            />
                        </div>
                        <button type="submit" className="btn btn-primary btn-lg" disabled={submitting}>
                            {submitting ? 'Submitting...' : 'Submit Application'}
                        </button>
                    </form>
                </div>
            )}

            {activeTab === 'apply-kcc' && (
                <div className="card" style={{ maxWidth: 560 }}>
                    <h3 style={{ marginBottom: 20 }}>Kisan Credit Card Application</h3>
                    <form onSubmit={handleKCCApplication}>
                        <div className="form-group">
                            <label>Land Size (acres)</label>
                            <input
                                type="number"
                                className="form-input"
                                placeholder="Enter your land size"
                                value={kccLandSize}
                                onChange={(e) => setKccLandSize(e.target.value)}
                                required
                                min="0.5"
                                step="0.5"
                            />
                        </div>
                        <div className="form-group">
                            <label>Primary Crop Type</label>
                            <select
                                className="form-input"
                                value={kccCropType}
                                onChange={(e) => setKccCropType(e.target.value)}
                                required
                            >
                                <option value="">Select crop type</option>
                                <option>Rice</option>
                                <option>Wheat</option>
                                <option>Cotton</option>
                                <option>Sugarcane</option>
                                <option>Pulses</option>
                                <option>Vegetables</option>
                                <option>Fruits</option>
                                <option>Oilseeds</option>
                                <option>Spices</option>
                                <option>Other</option>
                            </select>
                        </div>
                        {kccLandSize && (
                            <div className={styles.kccEstimate}>
                                <span>Estimated Credit Limit</span>
                                <span className={styles.kccValue}>
                                    ₹{(parseFloat(kccLandSize) * 50000).toLocaleString('en-IN')}
                                </span>
                                <span className={styles.kccNote}>*Based on ₹50,000 per acre. Actual limit may vary.</span>
                            </div>
                        )}
                        <button type="submit" className="btn btn-primary btn-lg" disabled={submitting}>
                            {submitting ? 'Submitting...' : 'Submit KCC Application'}
                        </button>
                    </form>
                </div>
            )}

            {activeTab === 'risk-analysis' && (
                <div className={styles.riskContainer}>
                    <div className="card" style={{ flex: 1, minWidth: '300px' }}>
                        <h3 style={{ marginBottom: 20 }}>Loan Prediction AI</h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 20 }}>
                            Use our deterministic AI model to analyze your approval probability before applying.
                        </p>
                        <div className="form-group">
                            <label>Monthly Income (₹)</label>
                            <input type="number" className="form-input" value={riskIncome} onChange={e => setRiskIncome(Number(e.target.value))} />
                        </div>
                        <div className="form-group">
                            <label>Requested Loan Amount (₹)</label>
                            <input type="number" className="form-input" value={riskLoanAmt} onChange={e => setRiskLoanAmt(Number(e.target.value))} />
                        </div>
                        <div className="form-group">
                            <label>Estimated Credit Score</label>
                            <input type="range" min="300" max="850" className={styles.slider} value={riskCreditScore} onChange={e => setRiskCreditScore(Number(e.target.value))} />
                            <div className={styles.sliderValue} style={{ textAlign: 'right' }}>{riskCreditScore}</div>
                        </div>
                        <div className="form-group">
                            <label>Repayment History Quality</label>
                            <select className="form-input" value={riskHistory} onChange={e => setRiskHistory(e.target.value)}>
                                <option value="excellent">Excellent (No delays)</option>
                                <option value="good">Good (1-2 minor delays)</option>
                                <option value="fair">Fair (Some delays)</option>
                                <option value="poor">Poor (Defaults or many delays)</option>
                            </select>
                        </div>
                        <button className="btn btn-primary" onClick={calculateRisk} style={{ width: '100%' }}>
                            Run AI Analysis
                        </button>
                    </div>

                    {riskResult && (
                        <div className={styles.riskResultCard} style={{ flex: 1 }}>
                            <h3>Analysis Result</h3>
                            <div className={styles.riskGauge}>
                                <div className={styles.gaugePercent} style={{ color: riskResult.approvalProbability > 60 ? 'var(--accent-green)' : riskResult.approvalProbability > 30 ? 'var(--accent-amber)' : 'var(--accent-red)' }}>
                                    {riskResult.approvalProbability}%
                                </div>
                                <span>Approval Probability</span>
                            </div>
                            
                            <div style={{ marginTop: 24 }}>
                                <h4>Risk Score: {riskResult.score}/100</h4>
                                <span className={`badge badge-${riskResult.level === 'low' ? 'success' : riskResult.level === 'medium' ? 'warning' : 'danger'}`} style={{ display: 'inline-block', marginTop: 8 }}>
                                    {riskResult.level.toUpperCase()} RISK
                                </span>
                            </div>

                            <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <h4>Key Factors</h4>
                                {riskResult.factors.map((f: any, i: number) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>{f.name}</span>
                                        <span style={{ 
                                            fontWeight: 600, 
                                            color: f.impact === 'Positive' ? 'var(--accent-green)' : 'var(--accent-red)'
                                        }}>{f.impact} ({Math.round(f.value * 100)}%)</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
