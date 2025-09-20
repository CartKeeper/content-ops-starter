import * as React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

import { useNetlifyIdentity } from '../components/auth';

export default function SignupPage() {
    const identity = useNetlifyIdentity();
    const router = useRouter();

    React.useEffect(() => {
        if (identity.isReady && identity.isAuthenticated) {
            void router.replace('/dashboard');
        }
    }, [identity.isAuthenticated, identity.isReady, router]);

    return (
        <>
            <Head>
                <title>Create account • Studio CRM</title>
            </Head>
            <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-16 text-slate-100">
                <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/80 p-10 shadow-2xl backdrop-blur">
                    <div className="mb-8 text-center">
                        <p className="text-xs font-semibold uppercase tracking-[0.48em] text-[#4DE5FF]">Get started</p>
                        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white">Create your studio account</h1>
                        <p className="mt-2 text-sm text-slate-300">
                            Sign up to connect calendars, manage contacts, and ship projects faster.
                        </p>
                    </div>
                    <div className="space-y-6 rounded-2xl border border-slate-800/60 bg-slate-950/60 p-6">
                        <p className="text-sm text-slate-300">
                            Accounts are created by an administrator so we can assign the correct role and permissions from day
                            one. Ask your studio admin to send an invitation email.
                        </p>
                        <p className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-xs text-slate-400">
                            Invites include a verification link and a temporary password so you can sign in securely and finish
                            setting up your profile.
                        </p>
                    </div>
                    <p className="mt-6 text-center text-sm text-slate-400">
                        Already have an account?{' '}
                        <Link href="/login" className="font-semibold text-[#4DE5FF] hover:text-white">
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </>
    );
}
