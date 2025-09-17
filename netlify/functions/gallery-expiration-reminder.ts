import type { Handler } from '@netlify/functions';
import dayjs from 'dayjs';
import fs from 'fs/promises';
import path from 'path';

import type { GalleryRecord } from '../../src/data/crm';
import {
    sendGalleryExpirationReminder,
    type GalleryReminderConfig,
    type GalleryReminderResult
} from '../../src/server/galleries/mailer';

export const config = {
    schedule: '@daily'
};

const GALLERIES_FILE_PATH = path.join(process.cwd(), 'content', 'data', 'crm-galleries.json');
const DEFAULT_FROM_EMAIL = 'no-reply@averyloganstudio.com';

type GalleryCollectionPayload = {
    items?: GalleryRecord[];
};

async function readGalleries(): Promise<GalleryRecord[]> {
    try {
        const raw = await fs.readFile(GALLERIES_FILE_PATH, 'utf-8');
        const parsed = JSON.parse(raw) as GalleryCollectionPayload | GalleryRecord[];

        if (Array.isArray(parsed)) {
            return parsed as GalleryRecord[];
        }

        if (parsed && Array.isArray(parsed.items)) {
            return parsed.items as GalleryRecord[];
        }
    } catch (error) {
        // If no file exists yet we'll return an empty collection
    }

    return [];
}

async function writeGalleries(galleries: GalleryRecord[]): Promise<void> {
    const payload = JSON.stringify({ type: 'CrmGalleries', items: galleries }, null, 4);
    await fs.mkdir(path.dirname(GALLERIES_FILE_PATH), { recursive: true });
    await fs.writeFile(GALLERIES_FILE_PATH, `${payload}\n`, 'utf-8');
}

function shouldSendReminder(gallery: GalleryRecord, referenceDate: dayjs.Dayjs): boolean {
    if (gallery.status !== 'Delivered') {
        return false;
    }

    if (!gallery.deliveredAt || !gallery.expiresAt || gallery.reminderSentAt) {
        return false;
    }

    const deliveredAt = dayjs(gallery.deliveredAt);
    const expiresAt = dayjs(gallery.expiresAt);

    if (!deliveredAt.isValid() || !expiresAt.isValid()) {
        return false;
    }

    const reminderWindowStart = deliveredAt.add(11, 'month').startOf('day');

    return (
        referenceDate.isSame(reminderWindowStart, 'day') || referenceDate.isAfter(reminderWindowStart)
    ) && referenceDate.isBefore(expiresAt.startOf('day'));
}

export const handler: Handler = async () => {
    try {
        const galleries = await readGalleries();
        const referenceDate = dayjs().startOf('day');

        const fromEmail = process.env.GALLERY_REMINDER_FROM_EMAIL?.trim() || DEFAULT_FROM_EMAIL;
        const optOutUrl = process.env.GALLERY_REMINDER_OPT_OUT_URL?.trim();

        const mailerConfig: GalleryReminderConfig = {
            fromEmail,
            optOutUrl: optOutUrl || undefined
        };

        const reminderResults: Array<GalleryReminderResult & { id: string }> = [];
        let hasUpdates = false;

        for (const gallery of galleries) {
            if (!shouldSendReminder(gallery, referenceDate)) {
                continue;
            }

            const result = await sendGalleryExpirationReminder(gallery, mailerConfig);
            reminderResults.push({ ...result, id: gallery.id });

            if (result.sent) {
                gallery.reminderSentAt = new Date().toISOString();
                hasUpdates = true;
            }
        }

        if (hasUpdates) {
            await writeGalleries(galleries);
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                processed: galleries.length,
                reminders: reminderResults
            })
        };
    } catch (error) {
        console.error('gallery-expiration-reminder scheduled function failed', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to process gallery expiration reminders.' })
        };
    }
};
