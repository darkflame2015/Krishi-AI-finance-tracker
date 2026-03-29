'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useNotifications, Notification } from '@/context/NotificationContext';
import { useState } from 'react';
import {
    HiOutlineHome,
    HiOutlineNewspaper,
    HiOutlineDocumentText,
    HiOutlineCurrencyRupee,
    HiOutlineUserGroup,
    HiOutlineChartBar,
    HiOutlineCog,
    HiOutlineBell,
    HiOutlineLogout,
    HiOutlineTrendingUp,
} from 'react-icons/hi';
import { PiPlantFill } from 'react-icons/pi';
import styles from './Sidebar.module.css';

interface NavItem {
    label: string;
    href: string;
    icon: React.ReactNode;
}

const userNavItems: NavItem[] = [
    { label: 'Dashboard', href: '/dashboard', icon: <HiOutlineHome /> },
    { label: 'News', href: '/news', icon: <HiOutlineNewspaper /> },
    { label: 'Loans', href: '/loans', icon: <HiOutlineDocumentText /> },
    { label: 'Finance', href: '/finance', icon: <HiOutlineCurrencyRupee /> },
    { label: 'Groups', href: '/groups', icon: <HiOutlineUserGroup /> },
    { label: 'Analytics', href: '/analytics', icon: <HiOutlineChartBar /> },
    { label: 'Crop Analytics', href: '/crop-analytics', icon: <HiOutlineTrendingUp /> },
    { label: 'Settings', href: '/settings', icon: <HiOutlineCog /> },
];

const adminNavItems: NavItem[] = [
    { label: 'Loan Approvals', href: '/admin', icon: <HiOutlineHome /> },
];

export default function Sidebar({ isAdmin = false }: { isAdmin?: boolean }) {
    const pathname = usePathname();
    const { profile, logout } = useAuth();
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
    const [showNotifications, setShowNotifications] = useState(false);

    const navItems = isAdmin ? adminNavItems : userNavItems;

    const formatTime = (n: Notification) => {
        if (!n.createdAt) return '';
        const date = new Date(n.createdAt);
        // eslint-disable-next-line react-hooks/purity
        const diff = Date.now() - date.getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        return `${Math.floor(hours / 24)}d ago`;
    };

    return (
        <>
            <aside className={styles.sidebar}>
                <div className={styles.brand}>
                    <PiPlantFill className={styles.brandIcon} />
                    <span className={styles.brandText}>Krishi AI</span>
                    {isAdmin && <span className={styles.adminBadge}>Admin</span>}
                </div>

                <nav className={styles.nav}>
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`${styles.navItem} ${pathname === item.href || (item.href !== '/dashboard' && item.href !== '/admin' && pathname.startsWith(item.href)) ? styles.active : ''}`}
                        >
                            <span className={styles.navIcon}>{item.icon}</span>
                            <span className={styles.navLabel}>{item.label}</span>
                        </Link>
                    ))}
                </nav>

                <div className={styles.bottom}>
                    <button
                        className={styles.notifBtn}
                        onClick={() => setShowNotifications(!showNotifications)}
                    >
                        <HiOutlineBell />
                        {unreadCount > 0 && <span className={styles.notifCount}>{unreadCount}</span>}
                    </button>

                    <div className={styles.user}>
                        <div className={styles.avatar}>
                            {profile?.displayName?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div className={styles.userInfo}>
                            <span className={styles.userName}>{profile?.displayName || 'User'}</span>
                            <span className={styles.userRole}>{profile?.role || 'user'}</span>
                        </div>
                    </div>

                    <button className={styles.logoutBtn} onClick={async () => {
                        await logout();
                        window.location.href = '/login';
                    }}>
                        <HiOutlineLogout />
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>

            {showNotifications && (
                <div className={styles.notifOverlay} onClick={() => setShowNotifications(false)}>
                    <div className={styles.notifPanel} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.notifHeader}>
                            <h3>Notifications</h3>
                            {unreadCount > 0 && (
                                <button className={styles.markAllBtn} onClick={markAllAsRead}>
                                    Mark all read
                                </button>
                            )}
                        </div>
                        <div className={styles.notifList}>
                            {notifications.length === 0 ? (
                                <div className={styles.noNotifs}>No notifications yet</div>
                            ) : (
                                notifications.slice(0, 20).map((n) => (
                                    <div
                                        key={n.id}
                                        className={`${styles.notifItem} ${!n.read ? styles.unread : ''}`}
                                        onClick={() => markAsRead(n.id)}
                                    >
                                        <div
                                            className={styles.notifDot}
                                            data-type={n.type}
                                        />
                                        <div className={styles.notifContent}>
                                            <span className={styles.notifTitle}>{n.title}</span>
                                            <span className={styles.notifMsg}>{n.message}</span>
                                            <span className={styles.notifTime}>{formatTime(n)}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
