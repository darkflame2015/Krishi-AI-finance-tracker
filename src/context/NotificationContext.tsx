'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
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

const STORAGE_KEY = 'krishi_notifications';

function getStoredNotifications(): Notification[] {
    if (typeof window === 'undefined') return [];
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

function setStoredNotifications(notifications: Notification[]): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
    } catch (err) {
        console.error('Failed to save notifications:', err);
    }
}

export function NotificationProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);

    useEffect(() => {
        if (!user) {
            setNotifications([]);
            return;
        }
        
        const stored = getStoredNotifications();
        const userNotifications = stored.filter(n => n.userId === user.uid);
        setNotifications(userNotifications);
    }, [user]);

    useEffect(() => {
        if (user && notifications.length > 0) {
            const allNotifications = getStoredNotifications();
            const otherNotifications = allNotifications.filter(n => n.userId !== user.uid);
            setStoredNotifications([...otherNotifications, ...notifications]);
        }
    }, [notifications, user]);

    const unreadCount = notifications.filter((n) => !n.read).length;

    const markAsRead = async (id: string) => {
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    };

    const markAllAsRead = useCallback(async () => {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }, []);

    const sendNotification = async (
        userId: string,
        title: string,
        message: string,
        type: Notification['type'] = 'info'
    ) => {
        const newNotification: Notification = {
            id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            userId,
            title,
            message,
            type,
            read: false,
            createdAt: new Date().toISOString(),
        };
        
        setNotifications((prev) => [newNotification, ...prev]);
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
