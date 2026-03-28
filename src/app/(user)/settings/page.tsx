'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { updateProfile } from 'firebase/auth';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import styles from './settings.module.css';

export default function SettingsPage() {
    const { user, profile } = useAuth();
    const [name, setName] = useState(profile?.displayName || '');
    const [region, setRegion] = useState(profile?.region || '');
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState('');

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !profile) return;
        setSaving(true);
        try {
            // Update Firebase Auth profile
            await updateProfile(user, { displayName: name });

            // Update Supabase profile
            if (isSupabaseConfigured) {
                await supabase.from('users').update({
                    displayName: name,
                    region: region,
                }).eq('uid', user.uid);
            }

            setSuccess('Profile updated successfully!');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            console.error('Failed to update profile:', err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className={styles.page}>
            <div className="page-header">
                <h1>Settings</h1>
                <p>Manage your profile and preferences</p>
            </div>

            <div className={styles.card}>
                <h3>Profile Information</h3>

                {success && (
                    <div className={styles.success}>{success}</div>
                )}

                <form onSubmit={handleSave} className={styles.form}>
                    <div className="form-group">
                        <label>Full Name</label>
                        <input
                            type="text"
                            className="form-input"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter your full name"
                        />
                    </div>

                    <div className="form-group">
                        <label>Email</label>
                        <input
                            type="email"
                            className="form-input"
                            value={profile?.email || ''}
                            disabled
                            style={{ opacity: 0.6 }}
                        />
                        <span className={styles.hint}>Email cannot be changed</span>
                    </div>

                    <div className="form-group">
                        <label>Region</label>
                        <select
                            className="form-input"
                            value={region}
                            onChange={(e) => setRegion(e.target.value)}
                        >
                            <option value="">Select your region</option>
                            <option>Andhra Pradesh</option>
                            <option>Bihar</option>
                            <option>Gujarat</option>
                            <option>Haryana</option>
                            <option>Karnataka</option>
                            <option>Kerala</option>
                            <option>Madhya Pradesh</option>
                            <option>Maharashtra</option>
                            <option>Punjab</option>
                            <option>Rajasthan</option>
                            <option>Tamil Nadu</option>
                            <option>Telangana</option>
                            <option>Uttar Pradesh</option>
                            <option>West Bengal</option>
                            <option>Other</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Account Role</label>
                        <input
                            type="text"
                            className="form-input"
                            value={profile?.role || 'user'}
                            disabled
                            style={{ opacity: 0.6, textTransform: 'capitalize' }}
                        />
                    </div>

                    <button type="submit" className="btn btn-primary" disabled={saving}>
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </form>
            </div>
        </div>
    );
}
