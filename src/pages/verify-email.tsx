import * as React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

import { Button } from '../components/ui/button';

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
            <div className="page page-center">
                <div className="container-tight py-4">
                    <div className="card card-md text-center">
                        <div className="card-body">
                            <h1 className="card-title">
                                {status === 'success' ? 'You are verified' : status === 'error' ? 'Verification issue' : 'Checking your link'}
                            </h1>
                            <p className="text-secondary">{message}</p>
                            {status === 'success' ? (
                                <div className="mt-4">
                                    <Button type="button" onClick={() => router.push('/login')}>
                                        Go to sign in
                                    </Button>
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
