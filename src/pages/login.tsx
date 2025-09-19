import * as React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

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
                <title>Sign in • Studio CRM</title>
            </Head>
            <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-16 text-slate-100">
                <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/80 p-10 shadow-2xl backdrop-blur">
                    <div className="mb-8 text-center">
                        <p className="text-xs font-semibold uppercase tracking-[0.48em] text-[#4DE5FF]">Welcome back</p>
                        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white">Sign in to your studio</h1>
                        <p className="mt-2 text-sm text-slate-300">
                            Manage calendars, clients, and production with a unified workspace.
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
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-slate-200">
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-[#4DE5FF] focus:ring-2 focus:ring-[#4DE5FF]/60"
                                placeholder="Enter your password"
                            />
                        </div>
                        {formError ? (
                            <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                                {formError}
                            </p>
                        ) : null}
                        <button
                            type="submit"
                            className="flex w-full items-center justify-center rounded-xl bg-[#4DE5FF] px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-[#86f0ff]"
                            disabled={submitting}
                        >
                            {submitting ? 'Signing in…' : 'Sign in'}
                        </button>
                    </form>
                    <p className="mt-6 text-center text-sm text-slate-400">
                        Need an account?{' '}
                        <Link href="/signup" className="font-semibold text-[#4DE5FF] hover:text-white">
                            Create one now
                        </Link>
                    </p>
                </div>
            </div>
        </>
    );
}
