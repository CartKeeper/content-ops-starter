import fs from 'fs/promises';
import path from 'path';

export type InvitationEmailInput = {
    email: string;
    name?: string | null;
    temporaryPassword: string;
    verificationUrl: string;
    invitedBy: string;
};

export type PasswordResetEmailInput = {
    email: string;
    name?: string | null;
    resetUrl: string;
};

export type MailerResult = {
    sent: boolean;
    message: string;
    logPath?: string;
};

const LOG_DIRECTORY = path.join(process.cwd(), 'content', 'logs');

async function appendLog(fileName: string, payload: Record<string, unknown>): Promise<MailerResult> {
    await fs.mkdir(LOG_DIRECTORY, { recursive: true });
    const logPath = path.join(LOG_DIRECTORY, fileName);
    const entry = JSON.stringify({ ...payload, timestamp: new Date().toISOString() });
    await fs.appendFile(logPath, `${entry}\n`, 'utf-8');
    return { sent: true, message: 'Email logged for delivery.', logPath };
}

export async function sendUserInvitationEmail(input: InvitationEmailInput): Promise<MailerResult> {
    const subject = 'You have been invited to Aperture Studio CRM';
    const preview = [
        `To: ${input.email}`,
        `Subject: ${subject}`,
        `Temporary password: ${input.temporaryPassword}`,
        `Verification link: ${input.verificationUrl}`,
    ];

    return appendLog('user-invitations.log', {
        type: 'invitation',
        subject,
        invitedBy: input.invitedBy,
        email: input.email,
        name: input.name ?? null,
        temporaryPassword: input.temporaryPassword,
        verificationUrl: input.verificationUrl,
        preview,
    });
}

export async function sendPasswordResetEmail(input: PasswordResetEmailInput): Promise<MailerResult> {
    const subject = 'Reset your Aperture Studio CRM password';

    return appendLog('user-password-resets.log', {
        type: 'password-reset',
        subject,
        email: input.email,
        name: input.name ?? null,
        resetUrl: input.resetUrl,
    });
}
