import * as React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

export default function VerifyEmailPage() {
    const router = useRouter();
    const { token } = router.query;
    const [status, setStatus] = React.useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = React.useState('Verifying your email…');

    React.useEffect(() => {
        const verificationToken = typeof token === 'string' ? token : Array.isArray(token) ? token[0] : null;
        if (!verificationToken) {
            setStatus('error');
            setMessage('Verification token is missing. Double-check the link in your email.');
            return;
        }

        async function verify() {
            try {
                const response = await fetch(`/api/auth/verify-email?token=${verificationToken}`);
                const payload = await response.json().catch(() => null);

                if (!response.ok) {
                    const error = payload?.error ?? 'We were unable to verify your email.';
                    setStatus('error');
                    setMessage(error);
                    return;
                }

                setStatus('success');
                setMessage(payload?.message ?? 'Email verified! You can sign in now.');
            } catch (error) {
                console.error('Verification failed', error);
                setStatus('error');
                setMessage('We were unable to verify your email. Try again or request a new invitation.');
            }
        }

        void verify();
    }, [token]);

    return (
        <>
            <Head>
                <title>Email verification • Studio CRM</title>
            </Head>
            <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-16 text-slate-100">
                <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900/80 p-10 text-center shadow-2xl backdrop-blur">
                    <p className="text-xs font-semibold uppercase tracking-[0.48em] text-[#4DE5FF]">Email Verification</p>
                    <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white">
                        {status === 'success' ? 'You are verified' : status === 'error' ? 'Verification issue' : 'Checking your link'}
                    </h1>
                    <p className="mt-4 text-sm text-slate-300">{message}</p>
                    {status === 'success' ? (
                        <button
                            type="button"
                            onClick={() => router.push('/login')}
                            className="mt-8 inline-flex items-center justify-center rounded-xl bg-[#4DE5FF] px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-[#86f0ff]"
                        >
                            Go to sign in
                        </button>
                    ) : null}
                </div>
            </div>
        </>
    );
}
