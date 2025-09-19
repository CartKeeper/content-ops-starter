import * as React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

import { useNetlifyIdentity } from '../components/auth';

export default function ForgotPasswordPage() {
    const identity = useNetlifyIdentity();
    const router = useRouter();
    const [email, setEmail] = React.useState('');
    const [submitting, setSubmitting] = React.useState(false);
    const [formError, setFormError] = React.useState<string | null>(null);
    const [success, setSuccess] = React.useState(false);
    const [submittedEmail, setSubmittedEmail] = React.useState('');

    React.useEffect(() => {
        if (identity.isReady && identity.isAuthenticated) {
            void router.replace('/dashboard');
        }
    }, [identity.isAuthenticated, identity.isReady, router]);

    const handleSubmit = React.useCallback(
        async (event: React.FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            if (submitting) {
                return;
            }

            setSubmitting(true);
            setFormError(null);

            try {
                const normalized = email.trim().toLowerCase();
                await identity.requestPasswordReset(normalized);
                setSubmittedEmail(normalized);
                setSuccess(true);
            } catch (error) {
                const message =
                    error instanceof Error ? error.message : 'We were unable to send reset instructions. Please try again.';
                setFormError(message);
                setSuccess(false);
            } finally {
                setSubmitting(false);
            }
        },
        [email, identity, submitting]
    );

    return (
        <>
            <Head>
                <title>Forgot password • Studio CRM</title>
            </Head>
            <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-16 text-slate-100">
                <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/80 p-10 shadow-2xl backdrop-blur">
                    <div className="mb-8 text-center">
                        <p className="text-xs font-semibold uppercase tracking-[0.48em] text-[#4DE5FF]">Reset access</p>
                        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white">Forgot your password?</h1>
                        <p className="mt-2 text-sm text-slate-300">
                            Enter the email associated with your studio. We&apos;ll send instructions to reset your password.
                        </p>
                    </div>
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-slate-200">
                                Email
                            </label>
                            <input
                                id="email"
                                type="email"
                                autoComplete="email"
                                required
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-[#4DE5FF] focus:ring-2 focus:ring-[#4DE5FF]/60"
                                placeholder="you@studio.com"
                            />
                        </div>
                        {success ? (
                            <p className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                                If an account exists for {submittedEmail || email.trim()}, you&apos;ll receive a reset link shortly.
                            </p>
                        ) : null}
                        {formError ? (
                            <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">{formError}</p>
                        ) : null}
                        <button
                            type="submit"
                            className="flex w-full items-center justify-center rounded-xl bg-[#4DE5FF] px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-[#86f0ff]"
                            disabled={submitting}
                        >
                            {submitting ? 'Sending reset link…' : 'Send reset link'}
                        </button>
                    </form>
                    <p className="mt-6 text-center text-sm text-slate-400">
                        Remember your password?{' '}
                        <Link href="/login" className="font-semibold text-[#4DE5FF] hover:text-white">
                            Back to sign in
                        </Link>
                    </p>
                </div>
            </div>
        </>
    );
}
