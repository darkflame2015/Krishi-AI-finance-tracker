'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { FcGoogle } from 'react-icons/fc';
import { HiOutlineMail, HiOutlineLockClosed, HiOutlineUser } from 'react-icons/hi';
import { PiPlantFill } from 'react-icons/pi';
import styles from './login.module.css';

export default function LoginPage() {
    const { loginWithEmail, registerWithEmail, loginWithGoogle, loading } = useAuth();
    const router = useRouter();
    const [isRegister, setIsRegister] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        try {
            if (isRegister) {
                await registerWithEmail(email, password, name);
            } else {
                await loginWithEmail(email, password);
            }
            router.push('/');
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
            setError(errorMessage.replace('Firebase: ', '').replace(/\(auth\/.*\)/, '').trim());
        } finally {
            setSubmitting(false);
        }
    };

    const handleGoogle = async () => {
        setError('');
        try {
            await loginWithGoogle();
            router.push('/');
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Google sign-in failed';
            setError(errorMessage);
        }
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner" />
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.leftPanel}>
                <div className={styles.brandContent}>
                    <div className={styles.logo}>
                        <PiPlantFill />
                        <span>Krishi AI</span>
                    </div>
                    <h1 className={styles.heroTitle}>Smart Finance for Indian Agriculture</h1>
                    <p className={styles.heroDesc}>
                        Empowering farmers with AI-driven analytics, seamless loan management,
                        and real-time market insights.
                    </p>
                    <div className={styles.features}>
                        <div className={styles.feature}>
                            <div className={styles.featureDot} />
                            <span>AI-Powered Crop Analytics</span>
                        </div>
                        <div className={styles.feature}>
                            <div className={styles.featureDot} />
                            <span>Kisan Credit Card Management</span>
                        </div>
                        <div className={styles.feature}>
                            <div className={styles.featureDot} />
                            <span>FPO Group Finance Tracking</span>
                        </div>
                        <div className={styles.feature}>
                            <div className={styles.featureDot} />
                            <span>Real-time Market Prices</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className={styles.rightPanel}>
                <div className={styles.formWrapper}>
                    <h2 className={styles.formTitle}>
                        {isRegister ? 'Create Account' : 'Welcome Back'}
                    </h2>
                    <p className={styles.formSubtitle}>
                        {isRegister
                            ? 'Start managing your agricultural finances'
                            : 'Sign in to your Krishi AI account'}
                    </p>

                    <button className={styles.googleBtn} onClick={handleGoogle} type="button">
                        <FcGoogle size={20} />
                        Continue with Google
                    </button>

                    <div className={styles.divider}>
                        <span>or</span>
                    </div>

                    <form onSubmit={handleSubmit} className={styles.form}>
                        {isRegister && (
                            <div className={styles.inputGroup}>
                                <HiOutlineUser className={styles.inputIcon} />
                                <input
                                    type="text"
                                    placeholder="Full Name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                    className={styles.input}
                                />
                            </div>
                        )}

                        <div className={styles.inputGroup}>
                            <HiOutlineMail className={styles.inputIcon} />
                            <input
                                type="email"
                                placeholder="Email address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className={styles.input}
                            />
                        </div>

                        <div className={styles.inputGroup}>
                            <HiOutlineLockClosed className={styles.inputIcon} />
                            <input
                                type="password"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                                className={styles.input}
                            />
                        </div>

                        {error && <div className={styles.error}>{error}</div>}

                        <button
                            type="submit"
                            className={`btn btn-primary btn-lg ${styles.submitBtn}`}
                            disabled={submitting}
                        >
                            {submitting ? 'Please wait...' : isRegister ? 'Create Account' : 'Sign In'}
                        </button>
                    </form>

                    <p className={styles.switchText}>
                        {isRegister ? 'Already have an account?' : "Don't have an account?"}
                        <button
                            className={styles.switchBtn}
                            onClick={() => {
                                setIsRegister(!isRegister);
                                setError('');
                            }}
                        >
                            {isRegister ? 'Sign In' : 'Create Account'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}
