import * as React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

import { ApertureMark } from '../components/crm';
import { useNetlifyIdentity } from '../components/auth';

export default function LoginPage() {
    const identity = useNetlifyIdentity();
    const router = useRouter();
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [submitting, setSubmitting] = React.useState(false);
    const [formError, setFormError] = React.useState<string | null>(null);

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
                await identity.login(email, password);
                await router.replace('/dashboard');
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Unable to log in.';
                setFormError(message);
            } finally {
                setSubmitting(false);
            }
        },
        [email, identity, password, router, submitting]
    );

    return (
        <>
            <Head>
                <title>Sign in · Aperture Studio CRM</title>
            </Head>
            <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
                <main className="flex flex-1 items-center justify-center px-6 py-12 sm:px-10 lg:px-12">
                    <div className="relative w-full max-w-xl">
                        <div
                            className="absolute -inset-1 rounded-[32px] bg-gradient-to-br from-[#4DE5FF]/30 via-[#6C4DFF]/20 to-transparent opacity-80 blur-2xl"
                            aria-hidden
                        />
                        <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-slate-900/80 p-8 shadow-[0_25px_60px_-30px_rgba(15,23,42,0.9)] backdrop-blur-xl sm:p-10">
                            <div className="flex flex-col items-center gap-5 text-center">
                                <div className="flex items-center gap-3">
                                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950/80 shadow-inner ring-1 ring-white/10">
                                        <ApertureMark className="h-9 w-9 text-slate-950" aria-hidden />
                                    </span>
                                    <span className="hidden text-left text-sm font-semibold uppercase tracking-[0.48em] text-slate-300 sm:block">
                                        <span className="bg-gradient-to-r from-[#4DE5FF] via-[#6C4DFF] to-[#B686FF] bg-clip-text text-transparent">
                                            Aperture
                                        </span>{' '}
                                        Studio CRM
                                    </span>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <p className="text-sm font-semibold uppercase tracking-[0.48em] text-slate-300 sm:hidden">
                                        <span className="bg-gradient-to-r from-[#4DE5FF] via-[#6C4DFF] to-[#B686FF] bg-clip-text text-transparent">
                                            Aperture
                                        </span>{' '}
                                        Studio CRM
                                    </p>
                                    <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">Welcome back</h1>
                                    <p className="text-sm text-slate-300 sm:text-base">
                                        Sign in to manage schedules, clients, and production workflows inside Aperture Studio CRM.
                                    </p>
                                </div>
                            </div>
                            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                                <div className="space-y-2">
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
                                        className="w-full rounded-2xl border border-slate-700/70 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-[#4DE5FF] focus:ring-2 focus:ring-[#4DE5FF]/60 sm:text-base"
                                        placeholder="you@aperture.studio"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <label htmlFor="password" className="font-medium text-slate-200">
                                            Password
                                        </label>
                                        <Link href="/reset-password" className="font-medium text-[#4DE5FF] transition hover:text-white">
                                            Forgot password?
                                        </Link>
                                    </div>
                                    <input
                                        id="password"
                                        type="password"
                                        autoComplete="current-password"
                                        required
                                        value={password}
                                        onChange={(event) => setPassword(event.target.value)}
                                        className="w-full rounded-2xl border border-slate-700/70 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-[#4DE5FF] focus:ring-2 focus:ring-[#4DE5FF]/60 sm:text-base"
                                        placeholder="Enter your password"
                                    />
                                </div>
                                {formError ? (
                                    <p
                                        className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200"
                                        role="alert"
                                        aria-live="polite"
                                    >
                                        {formError}
                                    </p>
                                ) : null}
                                <button
                                    type="submit"
                                    className="flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-[#4DE5FF] via-[#6C4DFF] to-[#B686FF] px-4 py-3 text-sm font-semibold text-slate-950 shadow-[0_12px_30px_-15px_rgba(77,229,255,0.9)] transition hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4DE5FF]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 sm:text-base"
                                    disabled={submitting}
                                >
                                    {submitting ? 'Signing in…' : 'Sign in'}
                                </button>
                            </form>
                            <p className="mt-6 text-center text-sm text-slate-400">
                                Need an account?{' '}
                                <Link href="/signup" className="font-semibold text-[#4DE5FF] transition hover:text-white">
                                    Create one now
                                </Link>
                            </p>
                        </div>
                    </div>
                </main>
                <footer className="px-6 pb-6 text-center text-xs text-slate-500">
                    Powered by Codex
                </footer>
            </div>
        </>
    );
}
