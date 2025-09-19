import fs from 'fs/promises';
import path from 'path';

export type PasswordResetEmailResult = {
    sent: boolean;
    message: string;
    logPath?: string;
};

type PasswordResetEmailPayload = {
    email: string;
    name: string | null;
    resetUrl: string;
    expiresAt: string;
};

export async function logPasswordResetEmail({ email, name, resetUrl, expiresAt }: PasswordResetEmailPayload): Promise<PasswordResetEmailResult> {
    if (!email) {
        return {
            sent: false,
            message: 'Password reset email skipped because user has no email address.'
        };
    }

    const timestamp = new Date().toISOString();
    const logDirectory = path.join(process.cwd(), 'content', 'logs');
    await fs.mkdir(logDirectory, { recursive: true });
    const logPath = path.join(logDirectory, 'password-reset-emails.log');

    const logEntry = JSON.stringify({
        timestamp,
        to: email,
        name,
        resetUrl,
        expiresAt,
        message: `Password reset link sent to ${email}`
    });

    await fs.appendFile(logPath, `${logEntry}\n`, 'utf-8');

    return {
        sent: true,
        message: `Logged password reset email to ${email}.`,
        logPath
    };
}
