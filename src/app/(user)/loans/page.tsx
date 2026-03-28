'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import {
    HiOutlineClock,
    HiOutlineCheckCircle,
    HiOutlineXCircle,
    HiOutlineDocumentAdd,
    HiOutlineUpload,
} from 'react-icons/hi';
import styles from './loans.module.css';

interface Loan {
    id: string;
    type: string;
    amount: number;
    status: string;
    purpose: string;
    documents: string[];
    createdAt: Timestamp;
    updatedAt: Timestamp;
    amountPaid: number;
    adminNotes?: string;
}

export default function LoansPage() {
    const { profile } = useAuth();
    const [loans, setLoans] = useState<Loan[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState<string | null>(null);

    useEffect(() => {
        if (!profile) return;

        const q = query(
            collection(db, 'loans'),
            where('userId', '==', profile.uid),
            orderBy('createdAt', 'desc')
        );

        const unsub = onSnapshot(q, (snap) => {
            const items: Loan[] = snap.docs.map((d) => ({
                id: d.id,
                ...d.data(),
            })) as Loan[];
            setLoans(items);
            setLoading(false);
        }, (error) => {
            console.error("Firestore error in loans:", error);
            setLoading(false);
        });

        return () => unsub();
    }, [profile]);

    const handleUpload = async (loanId: string, file: File) => {
        if (!profile) return;
        setUploading(loanId);
        try {
            const storageRef = ref(storage, `documents/${profile.uid}/${loanId}/${file.name}`);
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);
            await updateDoc(doc(db, 'loans', loanId), {
                documents: arrayUnion(url),
            });
        } catch (err) {
            console.error('Upload failed:', err);
        } finally {
            setUploading(null);
        }
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

                                {/* Progress */}
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

                                {/* Payment Progress for approved loans */}
                                {loan.status === 'approved' && loan.amountPaid > 0 && (
                                    <div className={styles.repayment}>
                                        <span>Repayment: ₹{loan.amountPaid.toLocaleString('en-IN')} / ₹{loan.amount.toLocaleString('en-IN')}</span>
                                        <div className="progress-bar">
                                            <div className="progress-fill" style={{ width: `${(loan.amountPaid / loan.amount) * 100}%` }} />
                                        </div>
                                    </div>
                                )}

                                {/* Documents */}
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
                                            {uploading === loan.id ? (
                                                <span>Uploading...</span>
                                            ) : (
                                                <>
                                                    <HiOutlineUpload />
                                                    <span>Upload Document</span>
                                                </>
                                            )}
                                            <input
                                                type="file"
                                                hidden
                                                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) handleUpload(loan.id, file);
                                                }}
                                                disabled={uploading === loan.id}
                                            />
                                        </label>
                                    )}
                                </div>

                                <div className={styles.cardFooter}>
                                    <span>Applied: {loan.createdAt?.toDate?.()?.toLocaleDateString('en-IN') || 'N/A'}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
