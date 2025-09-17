import fs from 'fs/promises';
import path from 'path';
import dayjs from 'dayjs';

import type { GalleryRecord } from '../../data/crm';

export const GALLERY_DELIVERY_EMAIL_FIELD = 'deliveryEmail';

export type GalleryReminderConfig = {
    fromEmail: string;
    optOutUrl?: string;
};

export type GalleryReminderResult = {
    sent: boolean;
    message: string;
    logPath?: string;
};

function resolveDeliveryEmail(gallery: GalleryRecord): string | null {
    const candidate = gallery.customFields?.[GALLERY_DELIVERY_EMAIL_FIELD];
    if (typeof candidate === 'string') {
        const trimmed = candidate.trim();
        return trimmed || null;
    }
    return null;
}

function buildEmailBody(gallery: GalleryRecord, expirationDate: string, optOutUrl?: string): string {
    const expiresLabel = dayjs(expirationDate).format('MMMM D, YYYY');
    const lines = [
        `Hi ${gallery.client},`,
        '',
        `We hope you're enjoying the "${gallery.shootType}" gallery. This is a friendly reminder that access expires on ${expiresLabel}.`,
        'Download the full-resolution files and favorites before the link is closed to keep a local backup.',
        optOutUrl ? `Prefer not to receive gallery reminders? Manage your preference here: ${optOutUrl}` : null,
        '',
        'With gratitude,',
        'Avery Logan Studio'
    ];

    return lines.filter(Boolean).join('\n');
}

export async function sendGalleryExpirationReminder(
    gallery: GalleryRecord,
    config: GalleryReminderConfig
): Promise<GalleryReminderResult> {
    const deliveryEmail = resolveDeliveryEmail(gallery);

    if (!gallery.expiresAt) {
        return {
            sent: false,
            message: `Gallery ${gallery.id} does not have an expiration date; skipping reminder.`
        };
    }

    if (!deliveryEmail) {
        return {
            sent: false,
            message: `Gallery ${gallery.id} is missing a delivery email; skipping reminder.`
        };
    }

    const timestamp = new Date().toISOString();
    const subject = `Your gallery expires on ${dayjs(gallery.expiresAt).format('MMMM D, YYYY')}`;
    const body = buildEmailBody(gallery, gallery.expiresAt, config.optOutUrl);

    const logDirectory = path.join(process.cwd(), 'content', 'logs');
    await fs.mkdir(logDirectory, { recursive: true });
    const logPath = path.join(logDirectory, 'gallery-reminders.log');

    const logEntry = JSON.stringify({
        timestamp,
        galleryId: gallery.id,
        client: gallery.client,
        projectId: gallery.projectId ?? null,
        to: deliveryEmail,
        from: config.fromEmail,
        subject,
        expiresAt: gallery.expiresAt,
        optOutUrl: config.optOutUrl ?? null,
        body
    });

    await fs.appendFile(logPath, `${logEntry}\n`, 'utf-8');

    return {
        sent: true,
        message: `Logged gallery expiration reminder for ${gallery.client} <${deliveryEmail}>.`,
        logPath
    };
}
