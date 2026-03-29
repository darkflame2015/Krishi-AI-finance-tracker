'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import MobileMenu from '@/components/MobileMenu';
import { HiOutlineMenu } from 'react-icons/hi';
import styles from './adminLayout.module.css';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { user, profile, loading } = useAuth();
    const router = useRouter();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        if (loading) return;
        if (!user) {
            router.replace('/login');
            return;
        }
        if (profile?.role !== 'admin') {
            router.replace('/dashboard');
        }
    }, [user, profile, loading, router]);

    if (loading || !user || profile?.role !== 'admin') {
        return (
            <div className="loading-container">
                <div className="spinner" />
            </div>
        );
    }

    return (
        <div className={styles.layout}>
            <Sidebar isAdmin />
            <MobileMenu isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} isAdmin />
            
            <main className={styles.main}>
                <header className={styles.mobileHeader}>
                    <button 
                        className={styles.menuBtn}
                        onClick={() => setMobileMenuOpen(true)}
                        aria-label="Open menu"
                    >
                        <HiOutlineMenu />
                    </button>
                    <span className={styles.mobileBrand}>Krishi AI Admin</span>
                </header>
                {children}
            </main>
        </div>
    );
}
