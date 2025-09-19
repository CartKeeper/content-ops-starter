import type { NextApiRequest, NextApiResponse } from 'next';
import dayjs from 'dayjs';

import { getSupabaseClient } from '../../../../utils/supabase-client';
import type { ZapierWebhookPayload } from '../../../../types/zapier';

const ALLOWED_METHODS = ['POST'] as const;

type PublishResponse = {
    data?: unknown;
    error?: string;
};

type PublishBody = {
    publishUrl?: string | null;
    publishTarget?: string | null;
    publishedBy?: string | null;
    payload?: ZapierWebhookPayload | Record<string, unknown> | null;
    triggerZapier?: boolean;
};

function parseId(value: string | string[] | undefined): string | null {
    if (Array.isArray(value)) {
        return parseId(value[0]);
    }
    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed || null;
    }
    return null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<PublishResponse>) {
    if (!ALLOWED_METHODS.includes(req.method as (typeof ALLOWED_METHODS)[number])) {
        res.setHeader('Allow', ALLOWED_METHODS);
        res.status(405).json({ error: `Method ${req.method} Not Allowed` });
        return;
    }

    const galleryId = parseId(req.query.id);
    if (!galleryId) {
        res.status(400).json({ error: 'Gallery id is required.' });
        return;
    }

    try {
        const body: PublishBody = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body as PublishBody);
        const publishUrl = typeof body.publishUrl === 'string' ? body.publishUrl.trim() || null : null;
        const publishTarget = typeof body.publishTarget === 'string' ? body.publishTarget : 'client-portal';
        const publishedBy = typeof body.publishedBy === 'string' ? body.publishedBy : null;
        const payload = body.payload ?? null;
        const triggerZapier = body.triggerZapier !== false;

        const supabase = getSupabaseClient();
        const publishedAt = dayjs().toISOString();

        const { data: gallery, error } = await supabase
            .from('galleries')
            .update({
                status: 'live',
                published_at: publishedAt,
                published_url: publishUrl,
                published_by: publishedBy
            })
            .eq('id', galleryId)
            .select(
                `id, client_id, gallery_name, status, published_at, published_url, published_by, deliver_by, expires_at`
            )
            .maybeSingle();

        if (error) {
            console.error('Failed to publish gallery', error);
            res.status(500).json({ error: 'Unable to publish gallery.' });
            return;
        }

        if (!gallery) {
            res.status(404).json({ error: 'Gallery not found.' });
            return;
        }

        const { error: logError } = await supabase.from('gallery_publications').insert({
            gallery_id: galleryId,
            publish_target: publishTarget,
            status: 'success',
            payload,
            published_at: publishedAt,
            published_by: publishedBy,
            publish_url: publishUrl
        });

        if (logError) {
            console.error('Failed to log gallery publication', logError);
        }

        if (triggerZapier) {
            await supabase.from('zapier_webhook_events').insert({
                event_type: 'gallery.published',
                status: 'processed',
                payload: {
                    event: 'gallery.published',
                    galleryId,
                    galleryName: gallery.gallery_name,
                    clientId: gallery.client_id,
                    publishUrl,
                    publishedAt,
                    deliveryDueDate: gallery.deliver_by,
                    expiresAt: gallery.expires_at
                },
                received_at: publishedAt
            });
        }

        res.status(200).json({ data: gallery });
    } catch (error) {
        console.error('Unhandled gallery publish error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
