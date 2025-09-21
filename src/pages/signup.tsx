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
            <div className="page page-center">
                <div className="container-tight py-4">
                    <div className="text-center mb-4">
                        <h1 className="h2">Create your studio account</h1>
                        <p className="text-secondary">
                            Sign up to connect calendars, manage contacts, and ship projects faster.
                        </p>
                    </div>
                    <div className="card card-md">
                        <div className="card-body">
                            <p className="text-secondary">
                                Accounts are created by an administrator so we can assign the correct role and permissions from day
                                one. Ask your studio admin to send an invitation email.
                            </p>
                            <div className="alert alert-info mt-3" role="status">
                                Invites include a verification link and a temporary password so you can sign in securely and finish
                                setting up your profile.
                            </div>
                        </div>
                    </div>
                    <div className="text-center text-secondary mt-3">
                        Already have an account?{' '}
                        <Link href="/login">Sign in</Link>
                    </div>
                </div>
            </div>
        </>
    );
}
