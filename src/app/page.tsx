'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (profile?.role === 'admin') {
      router.replace('/admin');
    } else {
      router.replace('/dashboard');
    }
  }, [user, profile, loading, router]);

  return (
    <div className="loading-container">
      <div className="spinner" />
      <p style={{ color: 'var(--text-muted)' }}>Loading Krishi AI...</p>
    </div>
  );
}
