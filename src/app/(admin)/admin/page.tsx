'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import {
    HiOutlineCheckCircle,
    HiOutlineXCircle,
    HiOutlineClock,
    HiOutlineEye,
    HiOutlineDocumentText,
    HiOutlineArrowLeft,
    HiOutlineCurrencyRupee
} from 'react-icons/hi';
import styles from './admin.module.css';

interface Loan {
    id: string;
    userId: string;
    userName?: string;
    userEmail?: string;
    type: string;
    amount: number;
    purpose: string;
    status: 'pending' | 'under_review' | 'approved' | 'rejected';
    documents: string[];
    amountPaid: number;
    landSize?: number;
    cropType?: string;
    createdAt: string;
    updatedAt: string;
    adminNotes?: string;
}

export default function AdminPage() {
    const { profile } = useAuth();
    const { sendNotification } = useNotifications();
    const [loans, setLoans] = useState<Loan[]>([]);
    const [payments, setPayments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
    const [adminNotes, setAdminNotes] = useState('');
    const [processing, setProcessing] = useState(false);
    const [filter, setFilter] = useState<string>('all');
    const [activeTab, setActiveTab] = useState<'loans' | 'payments'>('loans');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    const fetchLoansAndPayments = useCallback(async () => {
        try {
            setLoading(true);
            const [loansRes, paymentsRes] = await Promise.all([
                fetch('/api/loans'),
                fetch('/api/payments?type=pending')
            ]);
            
            if (loansRes.ok) setLoans(await loansRes.json());
            if (paymentsRes.ok) setPayments(await paymentsRes.json());
        } catch (err) {
            console.error("Error fetching data:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchLoansAndPayments();
    }, [fetchLoansAndPayments]);

    const handleAction = async (loan: Loan, action: 'approved' | 'rejected' | 'under_review') => {
        if (!profile) return;
        setProcessing(true);
        try {
            const res = await fetch(`/api/loans/${loan.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: action, adminNotes }),
            });

            if (!res.ok) {
                throw new Error('Failed to update loan');
            }

            const actionLabel = action === 'approved' ? 'Approved' : action === 'rejected' ? 'Rejected' : 'Under Review';
            const type = action === 'approved' ? 'success' : action === 'rejected' ? 'error' : 'info';

            await sendNotification(
                loan.userId,
                `Loan ${actionLabel}`,
                `Your ${loan.type} application for ₹${loan.amount.toLocaleString('en-IN')} has been ${actionLabel.toLowerCase()}.${adminNotes ? ` Notes: ${adminNotes}` : ''}`,
                type as 'success' | 'error' | 'info'
            );

            setSelectedLoan(null);
            setAdminNotes('');
            fetchLoansAndPayments();
        } catch (err) {
            console.error('Action failed:', err);
        } finally {
            setProcessing(false);
        }
    };

    const handlePaymentAction = async (paymentId: string, action: 'approved' | 'rejected') => {
        setProcessing(true);
        try {
            const res = await fetch(`/api/payments/${paymentId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: action }),
            });
            if (res.ok) {
                fetchLoansAndPayments();
            } else {
                alert('Failed to process payment');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setProcessing(false);
        }
    };

    const handleViewProof = (base64Data: string) => {
        if (!base64Data) return;
        if (base64Data.startsWith('data:image')) {
            setSelectedImage(base64Data);
        } else {
            try {
                const arr = base64Data.split(',');
                const mimeMatch = arr[0].match(/:(.*?);/);
                if (!mimeMatch) throw new Error('Invalid Data URL');
                const mime = mimeMatch[1];
                const bstr = atob(arr[1]);
                let n = bstr.length;
                const u8arr = new Uint8Array(n);
                while(n--){
                    u8arr[n] = bstr.charCodeAt(n);
                }
                const blob = new Blob([u8arr], {type: mime});
                const url = URL.createObjectURL(blob);
                window.open(url, '_blank');
            } catch (err) {
                console.error('Failed to open PDF:', err);
                alert('Could not preview document format.');
            }
        }
    };

    const filteredLoans = filter === 'all' ? loans : loans.filter((l) => l.status === filter);

    const stats = {
        total: loans.length,
        pending: loans.filter((l) => l.status === 'pending').length,
        underReview: loans.filter((l) => l.status === 'under_review').length,
        approved: loans.filter((l) => l.status === 'approved').length,
        rejected: loans.filter((l) => l.status === 'rejected').length,
    };

    if (loading) {
        return <div className="loading-container"><div className="spinner" /></div>;
    }

    if (selectedLoan) {
        return (
            <div className={styles.page}>
                <button className={styles.backBtn} onClick={() => { setSelectedLoan(null); setAdminNotes(''); }}>
                    <HiOutlineArrowLeft /> Back to Dashboard
                </button>

                <div className={styles.detailCard}>
                    <div className={styles.detailHeader}>
                        <div>
                            <h2>{selectedLoan.type}</h2>
                            <p className={styles.detailMeta}>
                                Applied by {selectedLoan.userName || selectedLoan.userEmail} · {selectedLoan.createdAt ? new Date(selectedLoan.createdAt).toLocaleDateString('en-IN') : 'N/A'}
                            </p>
                        </div>
                        <span className={`badge badge-${selectedLoan.status === 'approved' ? 'success' : selectedLoan.status === 'rejected' ? 'danger' : selectedLoan.status === 'under_review' ? 'info' : 'warning'}`}>
                            {selectedLoan.status.replace('_', ' ')}
                        </span>
                    </div>

                    <div className={styles.detailGrid}>
                        <div className="stat-card">
                            <span className="stat-label">Amount</span>
                            <span className="stat-value">₹{selectedLoan.amount.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="stat-card">
                            <span className="stat-label">Amount Paid</span>
                            <span className="stat-value">₹{(selectedLoan.amountPaid || 0).toLocaleString('en-IN')}</span>
                        </div>
                        {selectedLoan.landSize && (
                            <div className="stat-card">
                                <span className="stat-label">Land Size</span>
                                <span className="stat-value">{selectedLoan.landSize} acres</span>
                            </div>
                        )}
                        {selectedLoan.cropType && (
                            <div className="stat-card">
                                <span className="stat-label">Crop Type</span>
                                <span className="stat-value">{selectedLoan.cropType}</span>
                            </div>
                        )}
                    </div>

                    {selectedLoan.purpose && (
                        <div className={styles.purposeSection}>
                            <h4>Purpose</h4>
                            <p>{selectedLoan.purpose}</p>
                        </div>
                    )}

                    <div className={styles.verifySection}>
                        <h4>User Info</h4>
                        <div className={styles.verifyRow}>
                            <span>User ID:</span>
                            <span>{selectedLoan.userId}</span>
                        </div>
                        <div className={styles.verifyRow}>
                            <span>Name:</span>
                            <span>{selectedLoan.userName || 'N/A'}</span>
                        </div>
                        <div className={styles.verifyRow}>
                            <span>Email:</span>
                            <span>{selectedLoan.userEmail || 'N/A'}</span>
                        </div>
                    </div>

                    <div className={styles.docsSection}>
                        <h4>Documents ({selectedLoan.documents?.length || 0})</h4>
                        {selectedLoan.documents?.length > 0 ? (
                            <div className={styles.docLinks}>
                                {selectedLoan.documents.map((url, i) => (
                                    <a key={i} href={url} target="_blank" rel="noopener noreferrer" className={styles.docLink}>
                                        <HiOutlineDocumentText /> Document {i + 1}
                                    </a>
                                ))}
                            </div>
                        ) : (
                            <p className={styles.noDocs}>No documents uploaded yet</p>
                        )}
                    </div>

                    <div className={styles.actionSection}>
                        <h4>Admin Action</h4>
                        <div className="form-group">
                            <label>Admin Notes (optional)</label>
                            <textarea
                                className="form-input"
                                placeholder="Add notes about this decision..."
                                value={adminNotes}
                                onChange={(e) => setAdminNotes(e.target.value)}
                                rows={3}
                                style={{ resize: 'vertical' }}
                            />
                        </div>
                        <div className={styles.actionBtns}>
                            <button
                                className="btn btn-primary"
                                onClick={() => handleAction(selectedLoan, 'approved')}
                                disabled={processing}
                            >
                                <HiOutlineCheckCircle /> Approve
                            </button>
                            <button
                                className="btn btn-amber"
                                onClick={() => handleAction(selectedLoan, 'under_review')}
                                disabled={processing}
                            >
                                <HiOutlineClock /> Mark Under Review
                            </button>
                            <button
                                className="btn btn-danger"
                                onClick={() => handleAction(selectedLoan, 'rejected')}
                                disabled={processing}
                            >
                                <HiOutlineXCircle /> Reject
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <div className="page-header">
                <h1>Admin Dashboard</h1>
                <p>Review loan applications and payment receipts</p>
                <div className={styles.adminTabs}>
                    <button className={`${styles.adminTab} ${activeTab === 'loans' ? styles.activeTab : ''}`} onClick={() => setActiveTab('loans')}>
                        Loan Applications
                    </button>
                    <button className={`${styles.adminTab} ${activeTab === 'payments' ? styles.activeTab : ''}`} onClick={() => setActiveTab('payments')}>
                        Offline Payments {payments.length > 0 && <span className={styles.notifBadge}>{payments.length}</span>}
                    </button>
                </div>
            </div>

            {activeTab === 'loans' ? (
                <>

            <div className={styles.statsGrid}>
                <div className="stat-card">
                    <span className="stat-label">Total Applications</span>
                    <span className="stat-value">{stats.total}</span>
                </div>
                <div className="stat-card">
                    <span className="stat-label">Pending</span>
                    <span className="stat-value" style={{ color: 'var(--accent-amber)' }}>{stats.pending}</span>
                </div>
                <div className="stat-card">
                    <span className="stat-label">Under Review</span>
                    <span className="stat-value" style={{ color: 'var(--accent-blue)' }}>{stats.underReview}</span>
                </div>
                <div className="stat-card">
                    <span className="stat-label">Approved</span>
                    <span className="stat-value" style={{ color: 'var(--accent-green)' }}>{stats.approved}</span>
                </div>
            </div>

            <div className={styles.filterRow}>
                {['all', 'pending', 'under_review', 'approved', 'rejected'].map((f) => (
                    <button
                        key={f}
                        className={`${styles.filterBtn} ${filter === f ? styles.active : ''}`}
                        onClick={() => setFilter(f)}
                    >
                        {f === 'under_review' ? 'Under Review' : f.charAt(0).toUpperCase() + f.slice(1)}
                        {f !== 'all' && (
                            <span className={styles.filterCount}>
                                {loans.filter((l) => l.status === f).length}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {filteredLoans.length === 0 ? (
                <div className="empty-state">
                    <HiOutlineDocumentText size={48} />
                    <p>No loan applications {filter !== 'all' ? `with status "${filter.replace('_', ' ')}"` : ''}</p>
                </div>
            ) : (
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Applicant</th>
                                <th>Type</th>
                                <th>Amount</th>
                                <th>Status</th>
                                <th>Date</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredLoans.map((loan) => (
                                <tr key={loan.id}>
                                    <td>
                                        <div>
                                            <span style={{ fontWeight: 600, display: 'block' }}>{loan.userName || 'N/A'}</span>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{loan.userEmail}</span>
                                        </div>
                                    </td>
                                    <td>{loan.type}</td>
                                    <td style={{ fontFamily: "'Eczar', serif", fontWeight: 700 }}>
                                        ₹{loan.amount.toLocaleString('en-IN')}
                                    </td>
                                    <td>
                                        <span className={`badge badge-${loan.status === 'approved' ? 'success' : loan.status === 'rejected' ? 'danger' : loan.status === 'under_review' ? 'info' : 'warning'}`}>
                                            {loan.status.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td>{loan.createdAt ? new Date(loan.createdAt).toLocaleDateString('en-IN') : 'N/A'}</td>
                                    <td>
                                        <button
                                            className="btn btn-secondary btn-sm"
                                            onClick={() => setSelectedLoan(loan)}
                                        >
                                            <HiOutlineEye /> Review
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            </>
            ) : (
                <div className="table-container">
                    {payments.length === 0 ? (
                        <div className="empty-state">
                            <HiOutlineCheckCircle size={48} style={{ color: 'var(--accent-green)' }} />
                            <p>No pending offline payments to verify</p>
                        </div>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>User ID</th>
                                    <th>Loan ID</th>
                                    <th>Amount</th>
                                    <th>Proof</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {payments.map((p) => (
                                    <tr key={p.id}>
                                        <td>{new Date(p.createdAt).toLocaleDateString('en-IN')}</td>
                                        <td style={{ fontSize: '0.8rem' }}>{p.userId}</td>
                                        <td style={{ fontSize: '0.8rem' }}>{p.loanId}</td>
                                        <td style={{ fontFamily: "'Eczar', serif", fontWeight: 700 }}>
                                            ₹{p.amount.toLocaleString('en-IN')}
                                        </td>
                                        <td>
                                            <button 
                                                className={styles.docLink} 
                                                onClick={() => handleViewProof(p.proofUrl)} 
                                                style={{ border: 'none', cursor: 'pointer', background: 'none' }}
                                            >
                                                <HiOutlineEye /> View Receipt
                                            </button>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button
                                                    className="btn btn-primary btn-sm"
                                                    disabled={processing}
                                                    onClick={() => handlePaymentAction(p.id, 'approved')}
                                                    style={{ padding: '4px 8px' }}
                                                >
                                                    <HiOutlineCheckCircle size={16} />
                                                </button>
                                                <button
                                                    className="btn btn-danger btn-sm"
                                                    disabled={processing}
                                                    onClick={() => handlePaymentAction(p.id, 'rejected')}
                                                    style={{ padding: '4px 8px' }}
                                                >
                                                    <HiOutlineXCircle size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {selectedImage && (
                <div className="modal-overlay" onClick={() => setSelectedImage(null)}>
                    <div className="modal-content" style={{ maxWidth: '800px', padding: '24px' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
                            <h3 style={{ margin: 0 }}>Payment Proof</h3>
                            <button onClick={() => setSelectedImage(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem', color: 'var(--text-secondary)' }}>
                                <HiOutlineXCircle />
                            </button>
                        </div>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={selectedImage} alt="Payment Proof" style={{ width: '100%', height: 'auto', borderRadius: '8px', objectFit: 'contain', maxHeight: '70vh' }} />
                    </div>
                </div>
            )}
        </div>
    );
}
