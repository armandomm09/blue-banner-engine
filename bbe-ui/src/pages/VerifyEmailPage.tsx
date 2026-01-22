import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function VerifyEmailPage() {
    const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
    const [message, setMessage] = useState('Verifying your email...');
    const navigate = useNavigate();

    useEffect(() => {
        const handleEmailVerification = async () => {
            try {
                // Get the hash from the URL (Supabase sends verification links with hash)
                const hashParams = new URLSearchParams(window.location.hash.substring(1));
                const accessToken = hashParams.get('access_token');
                const type = hashParams.get('type');

                if (type === 'signup' && accessToken) {
                    // The user clicked the verification link
                    // Supabase automatically verifies the email when they land here
                    const { data, error } = await supabase.auth.getSession();

                    if (error) throw error;

                    if (data.session) {
                        setStatus('success');
                        setMessage('Email verified successfully! Redirecting to login...');

                        // Sign out and redirect to login
                        await supabase.auth.signOut();
                        setTimeout(() => {
                            navigate('/login');
                        }, 2000);
                    }
                } else {
                    setStatus('error');
                    setMessage('Invalid verification link.');
                }
            } catch (error: any) {
                console.error('Verification error:', error);
                setStatus('error');
                setMessage(error.message || 'Verification failed. Please try again.');
            }
        };

        handleEmailVerification();
    }, [navigate]);

    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-6 font-['Poppins']">
            <div className="w-full max-w-md rounded-2xl bg-card p-8 shadow-2xl shadow-black/40 border border-border text-center">
                <div className="mb-6">
                    {status === 'verifying' && (
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
                            <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent/30 border-t-accent"></div>
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10 ring-1 ring-green-500/30">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8 text-green-400">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 ring-1 ring-red-500/30">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8 text-red-400">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                            </svg>
                        </div>
                    )}

                    <h1 className="text-2xl font-bold text-white mb-2">
                        {status === 'verifying' && 'Verifying Email'}
                        {status === 'success' && 'Email Verified!'}
                        {status === 'error' && 'Verification Failed'}
                    </h1>

                    <p className="text-text-muted">{message}</p>
                </div>

                {status === 'error' && (
                    <button
                        onClick={() => navigate('/login')}
                        className="mt-4 w-full rounded-lg bg-accent py-3 font-semibold text-background transition-all hover:bg-accent/90"
                    >
                        Go to Login
                    </button>
                )}
            </div>
        </div>
    );
}
