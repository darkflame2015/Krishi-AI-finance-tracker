'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
    HiOutlineClock,
    HiOutlineCheckCircle,
    HiOutlineXCircle,
    HiOutlineDocumentAdd,
} from 'react-icons/hi';
import styles from './loans.module.css';

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

    if (loading) {
        return <div className="loading-container"><div className="spinner" /></div>;
    }

    return (
        <div className={styles.page}>
            <div className="page-header">
                <h1>Loan Applications</h1>
                <p>Track your loan applications and upload documents</p>
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
        </div>
    );
}
