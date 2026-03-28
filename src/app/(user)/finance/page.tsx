'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useNotifications } from '@/context/NotificationContext';
import {
    HiOutlineCurrencyRupee,
    HiOutlineCalculator,
    HiOutlineDocumentText,
    HiOutlineCreditCard,
} from 'react-icons/hi';
import styles from './finance.module.css';

type TabType = 'overview' | 'calculator' | 'apply-loan' | 'apply-kcc';

export default function FinancePage() {
    const { profile } = useAuth();
    const { sendNotification } = useNotifications();
    const [activeTab, setActiveTab] = useState<TabType>('overview');
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState('');

    // Calculator state
    const [loanCalcAmount, setLoanCalcAmount] = useState(100000);
    const [interestRate, setInterestRate] = useState(7);
    const [tenure, setTenure] = useState(12);

    // Loan application state
    const [loanType, setLoanType] = useState('Crop Loan');
    const [loanAmount, setLoanAmount] = useState('');
    const [loanPurpose, setLoanPurpose] = useState('');

    // KCC application state
    const [kccLandSize, setKccLandSize] = useState('');
    const [kccCropType, setKccCropType] = useState('');

    // Calculator logic
    const monthlyRate = interestRate / 100 / 12;
    const emi =
        monthlyRate > 0
            ? (loanCalcAmount * monthlyRate * Math.pow(1 + monthlyRate, tenure)) /
            (Math.pow(1 + monthlyRate, tenure) - 1)
            : loanCalcAmount / tenure;
    const totalPayment = emi * tenure;
    const totalInterest = totalPayment - loanCalcAmount;

    const handleLoanApplication = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile) return;
        setSubmitting(true);
        try {
            await addDoc(collection(db, 'loans'), {
                userId: profile.uid,
                userName: profile.displayName,
                userEmail: profile.email,
                type: loanType,
                amount: parseFloat(loanAmount),
                purpose: loanPurpose,
                status: 'pending',
                documents: [],
                amountPaid: 0,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
            // Notify all admins (we'll create a notification for the user's own record)
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
            const kccAmount = parseFloat(kccLandSize) * 50000; // Estimated KCC limit
            await addDoc(collection(db, 'loans'), {
                userId: profile.uid,
                userName: profile.displayName,
                userEmail: profile.email,
                type: 'Kisan Credit Card',
                amount: kccAmount,
                purpose: `KCC for ${kccCropType} cultivation on ${kccLandSize} acres`,
                status: 'pending',
                documents: [],
                amountPaid: 0,
                landSize: parseFloat(kccLandSize),
                cropType: kccCropType,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
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
            </div>

            {success && (
                <div className={styles.successMsg}>
                    {success}
                </div>
            )}

            {/* Overview Tab */}
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

            {/* Calculator Tab */}
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

            {/* Apply Loan Tab */}
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

            {/* Apply KCC Tab */}
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
        </div>
    );
}
