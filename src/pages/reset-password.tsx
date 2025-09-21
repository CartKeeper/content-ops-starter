import * as React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

import { useNetlifyIdentity } from '../components/auth';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

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
            <div className="page page-center">
                <div className="container-tight py-4">
                    <div className="card card-md">
                        <div className="card-body">
                            <h1 className="card-title">Set a new password</h1>
                            <p className="text-secondary mb-4">Choose a strong password to keep your workspace secure.</p>
                            <form onSubmit={handleSubmit} className="space-y-3">
                                <div className="mb-3">
                                    <Label htmlFor="password">New password</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        autoComplete="new-password"
                                        required
                                        value={password}
                                        onChange={(event) => setPassword(event.target.value)}
                                        placeholder="Minimum 8 characters"
                                    />
                                </div>
                                <div className="mb-3">
                                    <Label htmlFor="confirmPassword">Confirm password</Label>
                                    <Input
                                        id="confirmPassword"
                                        type="password"
                                        autoComplete="new-password"
                                        required
                                        value={confirmPassword}
                                        onChange={(event) => setConfirmPassword(event.target.value)}
                                        placeholder="Re-enter your password"
                                    />
                                </div>
                                {error ? <div className="alert alert-danger">{error}</div> : null}
                                {message ? <div className="alert alert-success">{message}</div> : null}
                                <Button type="submit" className="w-100" isLoading={submitting}>
                                    {submitting ? 'Updating password…' : 'Update password'}
                                </Button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
