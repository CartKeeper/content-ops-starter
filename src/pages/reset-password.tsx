import * as React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

import { useNetlifyIdentity } from '../components/auth';

export default function ResetPasswordPage() {
    const identity = useNetlifyIdentity();
    const router = useRouter();
    const [token, setToken] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [confirmPassword, setConfirmPassword] = React.useState('');
    const [submitting, setSubmitting] = React.useState(false);
    const [formError, setFormError] = React.useState<string | null>(null);
    const [success, setSuccess] = React.useState(false);

    React.useEffect(() => {
        if (identity.isReady && identity.isAuthenticated) {
            void router.replace('/dashboard');
        }
    }, [identity.isAuthenticated, identity.isReady, router]);

    React.useEffect(() => {
        if (!router.isReady) {
            return;
        }

        const value = router.query.token;
        if (typeof value === 'string') {
            setToken(value);
        } else {
            setToken('');
        }
    }, [router.isReady, router.query.token]);

    const handleSubmit = React.useCallback(
        async (event: React.FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            if (submitting) {
                return;
            }

            if (!token) {
                setFormError('Your reset link is invalid. Request a new one and try again.');
                return;
            }

            if (password.length < 8) {
                setFormError('Password must be at least 8 characters long.');
                return;
            }

            if (password !== confirmPassword) {
                setFormError('Passwords do not match.');
                return;
            }

            setSubmitting(true);
            setFormError(null);

            try {
                await identity.resetPassword({ token, password });
                setSuccess(true);
                await router.replace('/dashboard');
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Unable to reset password.';
                setFormError(message);
                setSuccess(false);
            } finally {
                setSubmitting(false);
            }
        },
        [confirmPassword, identity, password, router, submitting, token]
    );

    const tokenMissing = router.isReady && !token;

    return (
        <>
            <Head>
                <title>Reset password • Studio CRM</title>
            </Head>
            <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-16 text-slate-100">
                <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/80 p-10 shadow-2xl backdrop-blur">
                    <div className="mb-8 text-center">
                        <p className="text-xs font-semibold uppercase tracking-[0.48em] text-[#4DE5FF]">Choose a new password</p>
                        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white">Reset your password</h1>
                        <p className="mt-2 text-sm text-slate-300">
                            Create a strong password to secure your studio account.
                        </p>
                    </div>
                    {tokenMissing ? (
                        <div className="mb-6 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                            This reset link is missing or invalid. Request a new link from the{' '}
                            <Link href="/forgot-password" className="font-semibold text-[#4DE5FF] hover:text-white">
                                password reset page
                            </Link>
                            .
                        </div>
                    ) : null}
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
                                placeholder="Create a new password"
                                minLength={8}
                            />
                        </div>
                        <div>
                            <label htmlFor="confirm-password" className="block text-sm font-medium text-slate-200">
                                Confirm password
                            </label>
                            <input
                                id="confirm-password"
                                type="password"
                                autoComplete="new-password"
                                required
                                value={confirmPassword}
                                onChange={(event) => setConfirmPassword(event.target.value)}
                                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-[#4DE5FF] focus:ring-2 focus:ring-[#4DE5FF]/60"
                                placeholder="Re-enter your password"
                                minLength={8}
                            />
                        </div>
                        {success ? (
                            <p className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                                Your password has been updated. Redirecting to your dashboard…
                            </p>
                        ) : null}
                        {formError ? (
                            <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">{formError}</p>
                        ) : null}
                        <button
                            type="submit"
                            className="flex w-full items-center justify-center rounded-xl bg-[#4DE5FF] px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-[#86f0ff]"
                            disabled={submitting || tokenMissing}
                        >
                            {submitting ? 'Resetting password…' : 'Reset password'}
                        </button>
                    </form>
                    <p className="mt-6 text-center text-sm text-slate-400">
                        Changed your mind?{' '}
                        <Link href="/login" className="font-semibold text-[#4DE5FF] hover:text-white">
                            Back to sign in
                        </Link>
                    </p>
                </div>
            </div>
        </>
    );
}
