import * as React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

import { useNetlifyIdentity } from '../components/auth';

export default function ResetPasswordPage() {
    const identity = useNetlifyIdentity();
    const router = useRouter();
    const { token } = router.query;
    const [password, setPassword] = React.useState('');
    const [confirmPassword, setConfirmPassword] = React.useState('');
    const [submitting, setSubmitting] = React.useState(false);
    const [message, setMessage] = React.useState<string | null>(null);
    const [error, setError] = React.useState<string | null>(null);

    const resetToken = React.useMemo(() => {
        return typeof token === 'string' ? token : Array.isArray(token) ? token[0] : '';
    }, [token]);

    const handleSubmit = React.useCallback(
        async (event: React.FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            if (submitting) {
                return;
            }

            if (password.length < 8) {
                setError('Password must be at least 8 characters long.');
                return;
            }

            if (password !== confirmPassword) {
                setError('Passwords must match.');
                return;
            }

            if (!resetToken) {
                setError('Reset token is missing. Follow the link from your email again.');
                return;
            }

            setSubmitting(true);
            setError(null);
            setMessage(null);

            try {
                const response = await fetch('/api/auth/reset-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ token: resetToken, password }),
                });

                const payload = await response.json().catch(() => null);

                if (!response.ok) {
                    const errorMessage = payload?.error ?? 'Unable to reset password.';
                    setError(errorMessage);
                    return;
                }

                setMessage('Password updated. Redirecting to your workspace…');
                await identity.refresh();
                void router.replace('/dashboard');
            } catch (submitError) {
                const errorMessage = submitError instanceof Error ? submitError.message : 'Unable to reset password.';
                setError(errorMessage);
            } finally {
                setSubmitting(false);
            }
        },
        [confirmPassword, identity, password, resetToken, router, submitting],
    );

    return (
        <>
            <Head>
                <title>Reset password • Studio CRM</title>
            </Head>
            <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-16 text-slate-100">
                <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/80 p-10 shadow-2xl backdrop-blur">
                    <div className="mb-8 text-center">
                        <p className="text-xs font-semibold uppercase tracking-[0.48em] text-[#4DE5FF]">Secure access</p>
                        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white">Set a new password</h1>
                        <p className="mt-2 text-sm text-slate-300">
                            Choose a strong password to keep your workspace secure.
                        </p>
                    </div>
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-slate-200">
                                New password
                            </label>
                            <input
                                id="password"
                                type="password"
                                autoComplete="new-password"
                                required
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-[#4DE5FF] focus:ring-2 focus:ring-[#4DE5FF]/60"
                                placeholder="Minimum 8 characters"
                            />
                        </div>
                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-200">
                                Confirm password
                            </label>
                            <input
                                id="confirmPassword"
                                type="password"
                                autoComplete="new-password"
                                required
                                value={confirmPassword}
                                onChange={(event) => setConfirmPassword(event.target.value)}
                                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-[#4DE5FF] focus:ring-2 focus:ring-[#4DE5FF]/60"
                                placeholder="Re-enter your password"
                            />
                        </div>
                        {error ? (
                            <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                                {error}
                            </p>
                        ) : null}
                        {message ? (
                            <p className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                                {message}
                            </p>
                        ) : null}
                        <button
                            type="submit"
                            className="flex w-full items-center justify-center rounded-xl bg-[#4DE5FF] px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-[#86f0ff]"
                            disabled={submitting}
                        >
                            {submitting ? 'Updating password…' : 'Update password'}
                        </button>
                    </form>
                </div>
            </div>
        </>
    );
}
