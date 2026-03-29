'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import {
    HiOutlineCurrencyRupee,
    HiOutlineDocumentText,
    HiOutlineNewspaper,
    HiOutlineClock,
    HiOutlineCheckCircle,
    HiOutlineExclamationCircle,
} from 'react-icons/hi';
import { FcSimCardChip } from 'react-icons/fc';
import styles from './dashboard.module.css';

interface LoanSummary {
    id: string;
    type: string;
    amount: number;
    status: string;
    createdAt: string;
}

interface NewsArticle {
    title: string;
    description: string;
    url: string;
    urlToImage: string;
    publishedAt: string;
    source: { name: string };
}

export default function DashboardPage() {
    const { profile } = useAuth();
    const { notifications } = useNotifications();
    const [loans, setLoans] = useState<LoanSummary[]>([]);
    const [news, setNews] = useState<NewsArticle[]>([]);
    const [totalBalance, setTotalBalance] = useState(0);
    const [totalPaid, setTotalPaid] = useState(0);
    const [kccLoan, setKccLoan] = useState<LoanSummary | null>(null);
    const [loadingLoans, setLoadingLoans] = useState(true);
    const [loadingNews, setLoadingNews] = useState(true);

    const generateCCN = (loanId: string) => {
        let hash = 0;
        for (let i = 0; i < loanId.length; i++) {
            hash = loanId.charCodeAt(i) + ((hash << 5) - hash);
        }
        const num1 = Math.abs(Math.sin(hash++) * 10000).toString().replace('.', '').padEnd(4, '0').slice(0,4);
        const num2 = Math.abs(Math.cos(hash++) * 10000).toString().replace('.', '').padEnd(4, '0').slice(0,4);
        const num3 = Math.abs(Math.sin(hash) * 10000).toString().replace('.', '').padEnd(4, '0').slice(0,4);
        return `6012 ${num1} ${num2} ${num3}`;
    };

    useEffect(() => {
        const fetchLoans = async () => {
            try {
                const res = await fetch('/api/loans?userId=' + profile?.uid);
                if (res.ok) {
                    const data = await res.json();
                    
                    const items: LoanSummary[] = [];
                    let balance = 0;
                    let paid = 0;

                    data.forEach((d: { id: string; type: string; amount: number; status: string; amountPaid: number; createdAt: string }) => {
                        items.push({
                            id: d.id,
                            type: d.type,
                            amount: d.amount,
                            status: d.status,
                            createdAt: d.createdAt ? new Date(d.createdAt).toLocaleDateString('en-IN') : '',
                        });
                        if (d.status === 'approved') {
                            balance += d.amount - (d.amountPaid || 0);
                            paid += d.amountPaid || 0;
                            if (d.type === 'Kisan Credit Card') {
                                setKccLoan({ ...d, amountPaid: d.amountPaid || 0 } as any);
                            }
                        }
                    });

                    setLoans(items);
                    setTotalBalance(balance);
                    setTotalPaid(paid);
                }
            } catch (err) {
                console.error('Error fetching loans:', err);
            } finally {
                setLoadingLoans(false);
            }
        };

        const fetchNews = async () => {
            try {
                const res = await fetch('/api/news');
                const data = await res.json();
                setNews((data.articles || []).slice(0, 4));
            } catch {
                console.error('Failed to fetch news');
            } finally {
                setLoadingNews(false);
            }
        };

        if (profile?.uid) {
            fetchLoans();
        } else {
            setLoadingLoans(false);
        }
        fetchNews();
    }, [profile?.uid]);

    const statusIcon = (status: string) => {
        switch (status) {
            case 'approved':
                return <HiOutlineCheckCircle style={{ color: 'var(--accent-green)' }} />;
            case 'pending':
                return <HiOutlineClock style={{ color: 'var(--accent-amber)' }} />;
            case 'rejected':
                return <HiOutlineExclamationCircle style={{ color: 'var(--accent-red)' }} />;
            default:
                return <HiOutlineClock style={{ color: 'var(--text-muted)' }} />;
        }
    };

    const recentNotifs = notifications.slice(0, 3);

    return (
        <div className={styles.page}>
            <div className="page-header">
                <h1>Welcome back, {profile?.displayName?.split(' ')[0] || 'Farmer'}</h1>
                <p>Here&apos;s an overview of your agricultural finances</p>
            </div>

            <div className={styles.stats}>
                <div className="stat-card">
                    <span className="stat-label">Outstanding Balance</span>
                    <span className="stat-value">₹{totalBalance.toLocaleString('en-IN')}</span>
                    <span className="stat-change neutral">Across all loans</span>
                </div>
                <div className="stat-card">
                    <span className="stat-label">Total Paid</span>
                    <span className="stat-value">₹{totalPaid.toLocaleString('en-IN')}</span>
                    <span className="stat-change positive">Repayment progress</span>
                </div>
                <div className="stat-card">
                    <span className="stat-label">Active Loans</span>
                    <span className="stat-value">{loans.filter((l) => l.status === 'approved').length}</span>
                    <span className="stat-change neutral">Current active</span>
                </div>
                <div className="stat-card">
                    <span className="stat-label">Notifications</span>
                    <span className="stat-value">{notifications.filter((n) => !n.read).length}</span>
                    <span className="stat-change neutral">Unread</span>
                </div>
            </div>

            {kccLoan && (
                <div className={styles.kccWidget}>
                    <div className={styles.creditCard}>
                        <div className={styles.ccHeader}>
                            <div className={styles.ccBrand}>KCC</div>
                            <FcSimCardChip size={32} />
                        </div>
                        <div className={styles.ccNumber}>{generateCCN(kccLoan.id)}</div>
                        <div className={styles.ccFooter}>
                            <div>
                                <div className={styles.ccLabel}>Card Holder</div>
                                <div className={styles.ccValue}>{profile?.displayName?.split(' ')[0] || 'Farmer'}</div>
                            </div>
                            <div>
                                <div className={styles.ccLabel}>Credit Limit</div>
                                <div className={styles.ccValue}>₹{kccLoan.amount.toLocaleString('en-IN')}</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className={styles.grid}>
                <div className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h3><HiOutlineDocumentText /> Loan Applications</h3>
                        <a href="/loans" className={styles.viewAll}>View All</a>
                    </div>
                    {loadingLoans ? (
                        <div className={styles.loading}><div className="spinner" /></div>
                    ) : loans.length === 0 ? (
                        <div className={styles.empty}>
                            <HiOutlineDocumentText size={32} />
                            <p>No loan applications yet</p>
                            <a href="/finance" className="btn btn-primary btn-sm">Apply for a Loan</a>
                        </div>
                    ) : (
                        <div className={styles.loanList}>
                            {loans.slice(0, 5).map((loan) => (
                                <div key={loan.id} className={styles.loanItem}>
                                    <div className={styles.loanIcon}>{statusIcon(loan.status)}</div>
                                    <div className={styles.loanInfo}>
                                        <span className={styles.loanType}>{loan.type}</span>
                                        <span className={styles.loanDate}>{loan.createdAt}</span>
                                    </div>
                                    <div className={styles.loanAmount}>₹{loan.amount.toLocaleString('en-IN')}</div>
                                    <span className={`badge badge-${loan.status === 'approved' ? 'success' : loan.status === 'pending' ? 'warning' : 'danger'}`}>
                                        {loan.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h3><HiOutlineNewspaper /> Agriculture News</h3>
                        <a href="/news" className={styles.viewAll}>View All</a>
                    </div>
                    {loadingNews ? (
                        <div className={styles.loading}><div className="spinner" /></div>
                    ) : news.length === 0 ? (
                        <div className={styles.empty}>
                            <HiOutlineNewspaper size={32} />
                            <p>No news available. Configure your NEWS_API_KEY for updates.</p>
                        </div>
                    ) : (
                        <div className={styles.newsList}>
                            {news.map((article, i) => (
                                <a key={i} href={article.url} target="_blank" rel="noopener noreferrer" className={styles.newsItem}>
                                    <div className={styles.newsContent}>
                                        <span className={styles.newsSource}>{article.source?.name}</span>
                                        <span className={styles.newsTitle}>{article.title}</span>
                                    </div>
                                </a>
                            ))}
                        </div>
                    )}
                </div>

                <div className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h3><HiOutlineCurrencyRupee /> Quick Payment</h3>
                    </div>
                    {totalBalance > 0 ? (
                        <div className={styles.paySection}>
                            <div className={styles.payAmount}>
                                <span>Outstanding</span>
                                <span className={styles.payValue}>₹{totalBalance.toLocaleString('en-IN')}</span>
                            </div>
                            <a href="/loans" className="btn btn-primary btn-lg" style={{ width: '100%' }}>
                                Go to Loans to Pay
                            </a>
                        </div>
                    ) : (
                        <div className={styles.empty}>
                            <HiOutlineCheckCircle size={32} style={{ color: 'var(--accent-green)' }} />
                            <p>No outstanding balance. You&apos;re all caught up!</p>
                        </div>
                    )}
                </div>

                <div className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h3>Recent Updates</h3>
                    </div>
                    {recentNotifs.length === 0 ? (
                        <div className={styles.empty}>
                            <p>No recent updates</p>
                        </div>
                    ) : (
                        <div className={styles.notifList}>
                            {recentNotifs.map((n) => (
                                <div key={n.id} className={styles.notifItem}>
                                    <span className={styles.notifTitle}>{n.title}</span>
                                    <span className={styles.notifMsg}>{n.message}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
