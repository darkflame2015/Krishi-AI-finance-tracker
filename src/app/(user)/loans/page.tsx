'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
    HiOutlineClock,
    HiOutlineCheckCircle,
    HiOutlineXCircle,
    HiOutlineDocumentAdd,
    HiOutlineCurrencyRupee,
    HiOutlineUpload
} from 'react-icons/hi';
import { FcSimCardChip } from 'react-icons/fc';
import styles from './loans.module.css';

declare global {
    interface Window {
        Razorpay: any;
    }
}

interface Loan {
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
}

export default function LoansPage() {
    const { profile } = useAuth();
    const [loans, setLoans] = useState<Loan[]>([]);
    const [loading, setLoading] = useState(true);

    // Payment states
    const [payModalLoan, setPayModalLoan] = useState<Loan | null>(null);
    const [payAmount, setPayAmount] = useState('');
    const [payTab, setPayTab] = useState<'online' | 'offline'>('online');
    const [payProof, setPayProof] = useState<File | null>(null);
    const [processingPay, setProcessingPay] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');

    const fetchLoans = useCallback(async () => {
        if (!profile?.uid) return;
        try {
            const res = await fetch(`/api/loans?userId=${profile.uid}`);
            if (res.ok) {
                const data = await res.json();
                setLoans(data);
            }
        } catch (err) {
            console.error("Error fetching loans:", err);
        } finally {
            setLoading(false);
        }
    }, [profile?.uid]);

    useEffect(() => {
        fetchLoans();
    }, [fetchLoans]);

    const handleDocumentUpload = async (loanId: string, file: File) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const dataUrl = e.target?.result as string;
            const updatedDocs = [...(loans.find(l => l.id === loanId)?.documents || []), dataUrl];
            
            try {
                await fetch(`/api/loans/${loanId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ documents: updatedDocs }),
                });
                fetchLoans();
            } catch (err) {
                console.error('Error uploading document:', err);
            }
        };
        reader.readAsDataURL(file);
    };

    const statusInfo = (status: string) => {
        switch (status) {
            case 'approved':
                return { icon: <HiOutlineCheckCircle />, color: 'var(--accent-green)', label: 'Approved' };
            case 'rejected':
                return { icon: <HiOutlineXCircle />, color: 'var(--accent-red)', label: 'Rejected' };
            case 'under_review':
                return { icon: <HiOutlineClock />, color: 'var(--accent-blue)', label: 'Under Review' };
            default:
                return { icon: <HiOutlineClock />, color: 'var(--accent-amber)', label: 'Pending' };
        }
    };

    const progressPercentage = (loan: Loan) => {
        switch (loan.status) {
            case 'pending': return 25;
            case 'under_review': return 50;
            case 'approved': return 100;
            case 'rejected': return 100;
            default: return 10;
        }
    };

    const generateCCN = (loanId: string) => {
        // Deterministic hash based on loanId
        let hash = 0;
        for (let i = 0; i < loanId.length; i++) {
            hash = loanId.charCodeAt(i) + ((hash << 5) - hash);
        }
        // Realistic RuPay starting BIN for Indian cards: 6012
        // Use hash to generate 12 more deterministic digits
        const num1 = Math.abs(Math.sin(hash++) * 10000).toString().replace('.', '').padEnd(4, '0').slice(0,4);
        const num2 = Math.abs(Math.cos(hash++) * 10000).toString().replace('.', '').padEnd(4, '0').slice(0,4);
        const num3 = Math.abs(Math.sin(hash) * 10000).toString().replace('.', '').padEnd(4, '0').slice(0,4);
        return `6012 ${num1} ${num2} ${num3}`;
    };

    const handleRazorpay = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!payModalLoan || !payAmount) return;
        setProcessingPay(true);
        try {
            const res = await fetch('/api/razorpay', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: Number(payAmount), loanId: payModalLoan.id, userId: profile?.uid }),
            });
            const order = await res.json();
            if (order.error) throw new Error(order.error);

            const options = {
                key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                amount: order.amount,
                currency: order.currency,
                name: 'Krishi AI Finance',
                description: `Payment for ${payModalLoan.type}`,
                order_id: order.id,
                prefill: {
                    name: profile?.displayName || '',
                    email: profile?.email || '',
                },
                theme: { color: '#2e7d32' },
                handler: async (response: any) => {
                    const verifyRes = await fetch('/api/razorpay/verify', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            ...response,
                            amount: payAmount,
                            loanId: payModalLoan.id,
                            userId: profile?.uid,
                        }),
                    });
                    const result = await verifyRes.json();
                    if (result.success) {
                        setSuccessMsg('Payment processed successfully!');
                        setPayModalLoan(null);
                        setPayAmount('');
                        fetchLoans();
                    } else {
                        alert('Payment verification failed');
                    }
                },
            };
            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', function (resp: any) {
                alert('Payment failed: ' + resp.error.description);
            });
            rzp.open();
        } catch (err) {
            console.error(err);
            alert('Failed to initiate payment');
        } finally {
            setProcessingPay(false);
        }
    };

    const handleOfflinePay = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!payModalLoan || !payAmount || !payProof) return;
        setProcessingPay(true);
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const res = await fetch('/api/payments', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        loanId: payModalLoan.id,
                        userId: profile?.uid,
                        amount: Number(payAmount),
                        proofUrl: e.target?.result
                    }),
                });
                if (!res.ok) throw new Error();
                setSuccessMsg('Offline payment submitted for verification.');
                setPayModalLoan(null);
                setPayAmount('');
                setPayProof(null);
            } catch {
                alert('Failed to submit offline payment');
            } finally {
                setProcessingPay(false);
            }
        };
        reader.readAsDataURL(payProof);
    };

    if (loading) {
        return <div className="loading-container"><div className="spinner" /></div>;
    }

    return (
        <div className={styles.page}>
            <div className="page-header">
                <h1>Loan Applications</h1>
                <p>Track your loan applications and upload documents</p>
                {successMsg && <div className="badge badge-success" style={{ marginTop: 10 }}>{successMsg}</div>}
            </div>

            {loans.length === 0 ? (
                <div className="empty-state">
                    <HiOutlineDocumentAdd size={48} />
                    <h3>No Loan Applications</h3>
                    <p>Apply for a crop loan or Kisan Credit Card from the Finance section.</p>
                    <a href="/finance" className="btn btn-primary">Apply Now</a>
                </div>
            ) : (
                <div className={styles.list}>
                    {loans.map((loan) => {
                        const si = statusInfo(loan.status);
                        return (
                            <div key={loan.id} className={styles.card}>
                                <div className={styles.cardHeader}>
                                    <div className={styles.cardTitle}>
                                        <h3>{loan.type}</h3>
                                        <span className={`badge badge-${loan.status === 'approved' ? 'success' : loan.status === 'rejected' ? 'danger' : loan.status === 'under_review' ? 'info' : 'warning'}`}>
                                            {si.label}
                                        </span>
                                    </div>
                                    <span className={styles.amount}>₹{loan.amount.toLocaleString('en-IN')}</span>
                                </div>

                                {loan.purpose && (
                                    <p className={styles.purpose}>{loan.purpose}</p>
                                )}

                                <div className={styles.progress}>
                                    <div className={styles.progressSteps}>
                                        <span className={styles.stepActive}>Applied</span>
                                        <span className={loan.status !== 'pending' ? styles.stepActive : styles.step}>Under Review</span>
                                        <span className={loan.status === 'approved' || loan.status === 'rejected' ? styles.stepActive : styles.step}>
                                            {loan.status === 'rejected' ? 'Rejected' : 'Decision'}
                                        </span>
                                    </div>
                                    <div className="progress-bar">
                                        <div
                                            className="progress-fill"
                                            style={{
                                                width: `${progressPercentage(loan)}%`,
                                                background: loan.status === 'rejected' ? 'var(--accent-red)' : undefined,
                                            }}
                                        />
                                    </div>
                                </div>

                                {loan.adminNotes && (
                                    <div className={styles.notes}>
                                        <strong>Admin Notes:</strong> {loan.adminNotes}
                                    </div>
                                )}

                                {loan.status === 'approved' && loan.amountPaid > 0 && (
                                    <div className={styles.repayment}>
                                        <span>Repayment: ₹{loan.amountPaid.toLocaleString('en-IN')} / ₹{loan.amount.toLocaleString('en-IN')}</span>
                                        <div className="progress-bar">
                                            <div className="progress-fill" style={{ width: `${(loan.amountPaid / loan.amount) * 100}%` }} />
                                        </div>
                                    </div>
                                )}

                                {loan.status === 'approved' && loan.type === 'Kisan Credit Card' && (
                                    <div className={styles.creditCard}>
                                        <div className={styles.ccHeader}>
                                            <div className={styles.ccBrand}>KCC</div>
                                            <FcSimCardChip size={32} />
                                        </div>
                                        <div className={styles.ccNumber}>{generateCCN(loan.id)}</div>
                                        <div className={styles.ccFooter}>
                                            <div>
                                                <div className={styles.ccLabel}>Card Holder</div>
                                                <div className={styles.ccValue}>{loan.userName || 'Kisan Cardholder'}</div>
                                            </div>
                                            <div>
                                                <div className={styles.ccLabel}>Limit</div>
                                                <div className={styles.ccValue}>₹{loan.amount.toLocaleString('en-IN')}</div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {loan.status === 'approved' && (loan.amountPaid || 0) < loan.amount && (
                                    <button 
                                        className="btn btn-primary" 
                                        style={{ marginTop: 12, display: 'flex', gap: '8px', alignItems: 'center', width: 'fit-content' }}
                                        onClick={() => setPayModalLoan(loan)}
                                    >
                                        <HiOutlineCurrencyRupee /> Pay Now
                                    </button>
                                )}

                                <div className={styles.docs}>
                                    <span className={styles.docsLabel}>
                                        Documents ({loan.documents?.length || 0})
                                    </span>
                                    {loan.documents?.map((url, i) => (
                                        <a key={i} href={url} target="_blank" rel="noopener noreferrer" className={styles.docLink}>
                                            Document {i + 1}
                                        </a>
                                    ))}

                                    {loan.status !== 'rejected' && (
                                        <label className={styles.uploadBtn}>
                                            <span>Upload Document</span>
                                            <input
                                                type="file"
                                                hidden
                                                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) handleDocumentUpload(loan.id, file);
                                                }}
                                            />
                                        </label>
                                    )}
                                </div>

                                <div className={styles.cardFooter}>
                                    <span>Applied: {loan.createdAt ? new Date(loan.createdAt).toLocaleDateString('en-IN') : 'N/A'}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {payModalLoan && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                        <h3>Make a Payment</h3>
                        <p style={{ marginBottom: 16, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                            Paying for {payModalLoan.type} (Bal: ₹{(payModalLoan.amount - (payModalLoan.amountPaid || 0)).toLocaleString('en-IN')})
                        </p>
                        
                        <div className={styles.paymentTabs}>
                            <div className={`${styles.payTab} ${payTab === 'online' ? styles.active : ''}`} onClick={() => setPayTab('online')}>Online (UPI/Cards)</div>
                            <div className={`${styles.payTab} ${payTab === 'offline' ? styles.active : ''}`} onClick={() => setPayTab('offline')}>Offline Receipt</div>
                        </div>

                        {payTab === 'online' ? (
                            <form onSubmit={handleRazorpay}>
                                <div className="form-group">
                                    <label>Amount (₹)</label>
                                    <input type="number" className="form-input" required min="1" max={payModalLoan.amount - (payModalLoan.amountPaid || 0)} value={payAmount} onChange={e => setPayAmount(e.target.value)} />
                                </div>
                                <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                                    <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setPayModalLoan(null)}>Cancel</button>
                                    <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={processingPay}>Pay with Razorpay</button>
                                </div>
                            </form>
                        ) : (
                            <form onSubmit={handleOfflinePay}>
                                <div className="form-group">
                                    <label>Amount Paid (₹)</label>
                                    <input type="number" className="form-input" required min="1" max={payModalLoan.amount - (payModalLoan.amountPaid || 0)} value={payAmount} onChange={e => setPayAmount(e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label>Upload Payment Receipt (PDF/Image)</label>
                                    <input type="file" className="form-input" accept=".jpg,.jpeg,.png,.pdf" required onChange={e => setPayProof(e.target.files?.[0] || null)} />
                                </div>
                                <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                                    <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setPayModalLoan(null)}>Cancel</button>
                                    <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={processingPay || !payProof}>Submit Proof</button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
