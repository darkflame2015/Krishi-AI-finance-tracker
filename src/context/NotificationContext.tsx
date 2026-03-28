'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from './AuthContext';

export interface Notification {
    id: string;
    userId: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    read: boolean;
    createdAt: string;
}

interface NotificationContextType {
    notifications: Notification[];
    unreadCount: number;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    sendNotification: (userId: string, title: string, message: string, type?: Notification['type']) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);

    useEffect(() => {
        if (!user || !isSupabaseConfigured) {
            setNotifications([]);
            return;
        }

        const fetchNotifications = async () => {
            const { data } = await supabase
                .from('notifications')
                .select('*')
                .eq('userId', user.uid)
                .order('createdAt', { ascending: false });

            if (data) setNotifications(data as Notification[]);
        };

        fetchNotifications();

        const channel = supabase.channel(`public:notifications:userId=eq.${user.uid}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'notifications', filter: `userId=eq.${user.uid}` },
                (payload) => {
                    fetchNotifications();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    const unreadCount = notifications.filter((n) => !n.read).length;

    const markAsRead = async (id: string) => {
        if (!isSupabaseConfigured) return;
        await supabase.from('notifications').update({ read: true }).eq('id', id);
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    };

    const markAllAsRead = useCallback(async () => {
        if (!isSupabaseConfigured) return;
        const unread = notifications.filter((n) => !n.read);
        if (unread.length === 0) return;

        await supabase.from('notifications').update({ read: true }).in('id', unread.map(n => n.id));
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }, [notifications]);

    const sendNotification = async (
        userId: string,
        title: string,
        message: string,
        type: Notification['type'] = 'info'
    ) => {
        if (!isSupabaseConfigured) return;
        await supabase.from('notifications').insert({
            userId,
            title,
            message,
            type,
            read: false,
        });
    };

    return (
        <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead, sendNotification }}>
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotifications() {
    const ctx = useContext(NotificationContext);
    if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
    return ctx;
}
