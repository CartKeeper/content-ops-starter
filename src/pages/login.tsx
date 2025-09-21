import * as React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

import { ApertureMark } from '../components/crm';
import { useNetlifyIdentity } from '../components/auth';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

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
            <div className="page page-center">
                <div className="container-tight py-4">
                    <div className="text-center mb-4">
                        <ApertureMark className="icon icon-lg text-primary" aria-hidden />
                        <h1 className="mt-3 h2">Welcome back</h1>
                        <p className="text-secondary">
                            Sign in to manage schedules, clients, and production workflows inside Aperture Studio CRM.
                        </p>
                    </div>
                    <div className="card card-md">
                        <div className="card-body">
                            <form onSubmit={handleSubmit} className="space-y-3">
                                <div className="mb-3">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        autoComplete="email"
                                        required
                                        value={email}
                                        onChange={(event) => setEmail(event.target.value)}
                                        placeholder="you@aperture.studio"
                                    />
                                </div>
                                <div className="mb-3">
                                    <div className="d-flex justify-content-between align-items-center">
                                        <Label htmlFor="password">Password</Label>
                                        <Link href="/reset-password" className="text-secondary">
                                            Forgot password?
                                        </Link>
                                    </div>
                                    <Input
                                        id="password"
                                        type="password"
                                        autoComplete="current-password"
                                        required
                                        value={password}
                                        onChange={(event) => setPassword(event.target.value)}
                                        placeholder="Enter your password"
                                    />
                                </div>
                                {formError ? (
                                    <div className="alert alert-danger" role="alert" aria-live="polite">
                                        {formError}
                                    </div>
                                ) : null}
                                <Button type="submit" className="w-100" isLoading={submitting}>
                                    {submitting ? 'Signing in…' : 'Sign in'}
                                </Button>
                            </form>
                        </div>
                    </div>
                    <div className="text-center text-secondary mt-3">
                        Need an account?{' '}
                        <Link href="/signup">Create one now</Link>
                    </div>
                </div>
            </div>
        </>
    );
}
