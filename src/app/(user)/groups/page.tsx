'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { HiOutlineUserGroup, HiOutlineArrowLeft } from 'react-icons/hi';
import styles from './groups.module.css';

interface FPOGroup {
    id: string;
    name: string;
    members: number;
    portfolioSize: number;
    riskProfile: string;
    repaymentAmount: number;
    amountPaid: number;
    region: string;
    activeSince: string;
    status: 'active' | 'inactive';
}

export default function GroupsPage() {
    const [groups, setGroups] = useState<FPOGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<FPOGroup | null>(null);

    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'groups'), (snap) => {
            const items: FPOGroup[] = snap.docs.map((d) => ({
                id: d.id,
                ...d.data(),
            })) as FPOGroup[];
            setGroups(items);
            setLoading(false);
        }, (error) => {
            console.error("Firestore error in groups:", error);
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const handleSelect = async (group: FPOGroup) => {
        // Fetch latest data
        const docRef = doc(db, 'groups', group.id);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
            setSelected({ id: snap.id, ...snap.data() } as FPOGroup);
        } else {
            setSelected(group);
        }
    };

    if (loading) {
        return <div className="loading-container"><div className="spinner" /></div>;
    }

    if (selected) {
        const repaymentPercent = selected.repaymentAmount > 0
            ? Math.round((selected.amountPaid / selected.repaymentAmount) * 100)
            : 0;

        return (
            <div className={styles.page}>
                <button className={styles.backBtn} onClick={() => setSelected(null)}>
                    <HiOutlineArrowLeft /> Back to Groups
                </button>

                <div className={styles.detailCard}>
                    <h2>{selected.name}</h2>
                    <span className={`badge badge-${selected.status === 'active' ? 'success' : 'warning'}`}>
                        {selected.status}
                    </span>

                    <div className={styles.detailGrid}>
                        <div className="stat-card">
                            <span className="stat-label">Members</span>
                            <span className="stat-value">{selected.members}</span>
                        </div>
                        <div className="stat-card">
                            <span className="stat-label">Portfolio Size</span>
                            <span className="stat-value">₹{selected.portfolioSize?.toLocaleString('en-IN') || 0}</span>
                        </div>
                        <div className="stat-card">
                            <span className="stat-label">Risk Profile</span>
                            <span className="stat-value">{selected.riskProfile || 'N/A'}</span>
                        </div>
                        <div className="stat-card">
                            <span className="stat-label">Region</span>
                            <span className="stat-value">{selected.region || 'N/A'}</span>
                        </div>
                    </div>

                    <div className={styles.repaymentSection}>
                        <h3>Repayment Status</h3>
                        <div className={styles.repaymentInfo}>
                            <span>₹{selected.amountPaid?.toLocaleString('en-IN') || 0} / ₹{selected.repaymentAmount?.toLocaleString('en-IN') || 0}</span>
                            <span>{repaymentPercent}%</span>
                        </div>
                        <div className="progress-bar">
                            <div className="progress-fill" style={{ width: `${repaymentPercent}%` }} />
                        </div>
                    </div>

                    <div className={styles.detailStats}>
                        <div className={styles.detailRow}>
                            <span>Active Since</span>
                            <span>{selected.activeSince || 'N/A'}</span>
                        </div>
                        <div className={styles.detailRow}>
                            <span>Average Loan per Member</span>
                            <span>₹{selected.members > 0 ? Math.round(selected.portfolioSize / selected.members).toLocaleString('en-IN') : 0}</span>
                        </div>
                        <div className={styles.detailRow}>
                            <span>Outstanding Amount</span>
                            <span>₹{((selected.repaymentAmount || 0) - (selected.amountPaid || 0)).toLocaleString('en-IN')}</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <div className="page-header">
                <h1>FPO Groups</h1>
                <p>Farmer Producer Organizations and their financial statistics</p>
            </div>

            {groups.length === 0 ? (
                <div className="empty-state">
                    <HiOutlineUserGroup size={48} />
                    <h3>No FPO Groups</h3>
                    <p>FPO groups will appear here when created by the administrator.</p>
                </div>
            ) : (
                <div className={styles.list}>
                    {groups.map((group) => (
                        <div
                            key={group.id}
                            className={styles.groupRow}
                            onClick={() => handleSelect(group)}
                        >
                            <div className={styles.groupInfo}>
                                <div className={styles.groupIcon}>
                                    <HiOutlineUserGroup />
                                </div>
                                <div>
                                    <span className={styles.groupName}>{group.name}</span>
                                    <span className={styles.groupRegion}>{group.region}</span>
                                </div>
                            </div>
                            <div className={styles.groupStat}>
                                <span className={styles.statLabel}>Members</span>
                                <span className={styles.statVal}>{group.members}</span>
                            </div>
                            <div className={styles.groupStat}>
                                <span className={styles.statLabel}>Portfolio</span>
                                <span className={styles.statVal}>₹{(group.portfolioSize / 100000).toFixed(1)}L</span>
                            </div>
                            <div className={styles.groupStat}>
                                <span className={styles.statLabel}>Risk</span>
                                <span className={styles.statVal}>{group.riskProfile}</span>
                            </div>
                            <div className={styles.groupStat}>
                                <span className={styles.statLabel}>Repayment</span>
                                <span className={styles.statVal}>
                                    {group.repaymentAmount > 0 ? Math.round((group.amountPaid / group.repaymentAmount) * 100) : 0}%
                                </span>
                            </div>
                            <span className={`badge badge-${group.status === 'active' ? 'success' : 'warning'}`}>
                                {group.status}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
