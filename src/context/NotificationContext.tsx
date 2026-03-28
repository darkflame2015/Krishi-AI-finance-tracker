'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import {
    collection,
    query,
    where,
    orderBy,
    onSnapshot,
    doc,
    updateDoc,
    addDoc,
    serverTimestamp,
    Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from './AuthContext';

export interface Notification {
    id: string;
    userId: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    read: boolean;
    createdAt: Timestamp;
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
        if (!user || !db) {
            setNotifications([]);
            return;
        }

        const q = query(
            collection(db, 'notifications'),
            where('userId', '==', user.uid),
            orderBy('createdAt', 'desc')
        );

        const unsub = onSnapshot(q, (snap) => {
            const items: Notification[] = snap.docs.map((d) => ({
                id: d.id,
                ...d.data(),
            })) as Notification[];
            setNotifications(items);
        });

        return () => unsub();
    }, [user]);

    const unreadCount = notifications.filter((n) => !n.read).length;

    const markAsRead = async (id: string) => {
        await updateDoc(doc(db, 'notifications', id), { read: true });
    };

    const markAllAsRead = useCallback(async () => {
        const unread = notifications.filter((n) => !n.read);
        await Promise.all(unread.map((n) => updateDoc(doc(db, 'notifications', n.id), { read: true })));
    }, [notifications]);

    const sendNotification = async (
        userId: string,
        title: string,
        message: string,
        type: Notification['type'] = 'info'
    ) => {
        await addDoc(collection(db, 'notifications'), {
            userId,
            title,
            message,
            type,
            read: false,
            createdAt: serverTimestamp(),
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
