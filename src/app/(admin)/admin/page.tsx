'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
    HiOutlineCheckCircle,
    HiOutlineXCircle,
    HiOutlineClock,
    HiOutlineEye,
    HiOutlineDocumentText,
    HiOutlineArrowLeft,
} from 'react-icons/hi';
import styles from './admin.module.css';

interface Loan {
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    type: string;
    amount: number;
    purpose: string;
    status: string;
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
    const [loading, setLoading] = useState(true);
    const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
    const [adminNotes, setAdminNotes] = useState('');
    const [processing, setProcessing] = useState(false);
    const [filter, setFilter] = useState<string>('all');

    useEffect(() => {
        if (!isSupabaseConfigured) {
            setLoading(false);
            return;
        }

        const fetchLoans = async () => {
            const { data, error } = await supabase.from('loans').select('*').order('createdAt', { ascending: false });
            if (data) {
                setLoans(data as Loan[]);
            }
            setLoading(false);
        };
        fetchLoans();

        const channel = supabase.channel('public:loans')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'loans' }, () => {
                fetchLoans();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    const handleAction = async (loan: Loan, action: 'approved' | 'rejected' | 'under_review') => {
        if (!profile) return;
        setProcessing(true);
        try {
            if (isSupabaseConfigured) {
                await supabase.from('loans').update({
                    status: action,
                    adminNotes: adminNotes || null,
                    updatedAt: new Date().toISOString(),
                }).eq('id', loan.id);
            }

            // Send notification to user
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
        } catch (err) {
            console.error('Action failed:', err);
        } finally {
            setProcessing(false);
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

    // Detail View
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

                    {/* Verification */}
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
                            <span>{selectedLoan.userEmail}</span>
                        </div>
                    </div>

                    {/* Documents */}
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

                    {/* Admin Actions */}
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

    // Dashboard View
    return (
        <div className={styles.page}>
            <div className="page-header">
                <h1>Loan Approval Dashboard</h1>
                <p>Review and process loan applications</p>
            </div>

            {/* Stats */}
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

            {/* Filter */}
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

            {/* Loan List */}
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
        </div>
    );
}
