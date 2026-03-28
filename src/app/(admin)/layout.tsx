'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import styles from './adminLayout.module.css';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { user, profile, loading } = useAuth();
    const router = useRouter();

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
            <main className={styles.main}>
                {children}
            </main>
        </div>
    );
}
