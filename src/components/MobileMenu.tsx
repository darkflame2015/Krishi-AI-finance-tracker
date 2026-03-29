'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    HiOutlineHome,
    HiOutlineNewspaper,
    HiOutlineDocumentText,
    HiOutlineCurrencyRupee,
    HiOutlineUserGroup,
    HiOutlineChartBar,
    HiOutlineCog,
    HiOutlineTrendingUp,
    HiOutlineX,
    HiOutlineLogout,
} from 'react-icons/hi';
import { PiPlantFill } from 'react-icons/pi';
import { useAuth } from '@/context/AuthContext';
import styles from './MobileMenu.module.css';

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

interface MobileMenuProps {
    isOpen: boolean;
    onClose: () => void;
    isAdmin?: boolean;
}

export default function MobileMenu({ isOpen, onClose, isAdmin = false }: MobileMenuProps) {
    const pathname = usePathname();
    const { logout } = useAuth();
    const navItems = isAdmin ? [{ label: 'Loan Approvals', href: '/admin', icon: <HiOutlineHome /> }] : userNavItems;

    if (!isOpen) return null;

    return (
        <>
            <div className={styles.overlay} onClick={onClose} />
            <div className={styles.drawer}>
                <div className={styles.header}>
                    <div className={styles.brand}>
                        <PiPlantFill className={styles.brandIcon} />
                        <span className={styles.brandText}>Krishi AI</span>
                        {isAdmin && <span className={styles.adminBadge}>Admin</span>}
                    </div>
                    <button className={styles.closeBtn} onClick={onClose}>
                        <HiOutlineX />
                    </button>
                </div>

                <nav className={styles.nav}>
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`${styles.navItem} ${pathname === item.href || (item.href !== '/dashboard' && item.href !== '/admin' && pathname.startsWith(item.href)) ? styles.active : ''}`}
                            onClick={onClose}
                        >
                            <span className={styles.navIcon}>{item.icon}</span>
                            <span className={styles.navLabel}>{item.label}</span>
                        </Link>
                    ))}
                    
                    <button 
                        className={styles.logoutBtn} 
                        onClick={async () => {
                            await logout();
                            onClose();
                            window.location.href = '/login';
                        }}
                    >
                        <HiOutlineLogout className={styles.navIcon} />
                        <span className={styles.navLabel}>Log Out</span>
                    </button>
                </nav>
            </div>
        </>
    );
}
