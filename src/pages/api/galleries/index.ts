import type { NextApiRequest, NextApiResponse } from 'next';
import dayjs from 'dayjs';

import { getSupabaseClient } from '../../../utils/supabase-client';

const ALLOWED_METHODS = ['GET', 'POST'] as const;
const ALLOWED_STATUSES = ['draft', 'live', 'archived'] as const;

function parseString(value: unknown): string | null {
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed) {
            return trimmed;
        }
    }
    return null;
}

function parseStatus(value: unknown): string | null {
    if (typeof value !== 'string') {
        return null;
    }
    const normalized = value.trim().toLowerCase();
    if (ALLOWED_STATUSES.includes(normalized as (typeof ALLOWED_STATUSES)[number])) {
        return normalized;
    }
    return null;
}

function parseBoolean(value: unknown): boolean | null {
    if (typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (normalized === 'true') {
            return true;
        }
        if (normalized === 'false') {
            return false;
        }
    }
    return null;
}

function parseIsoDate(value: unknown): string | null {
    if (typeof value !== 'string') {
        return null;
    }
    const trimmed = value.trim();
    if (!trimmed) {
        return null;
    }
    const parsed = dayjs(trimmed);
    return parsed.isValid() ? parsed.toISOString() : null;
}

type GalleriesResponse = {
    data?: unknown;
    error?: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<GalleriesResponse>) {
    if (!ALLOWED_METHODS.includes(req.method as (typeof ALLOWED_METHODS)[number])) {
        res.setHeader('Allow', ALLOWED_METHODS);
        res.status(405).json({ error: `Method ${req.method} Not Allowed` });
        return;
    }

    try {
        const supabase = getSupabaseClient();

        if (req.method === 'GET') {
            const statusFilter = parseStatus(req.query.status);
            const clientId = parseString(Array.isArray(req.query.clientId) ? req.query.clientId[0] : req.query.clientId);
            const search = parseString(Array.isArray(req.query.search) ? req.query.search[0] : req.query.search);
            const includeArchived = parseBoolean(req.query.includeArchived);

            let query = supabase
                .from('galleries')
                .select(
                    `id, client_id, gallery_name, gallery_url, status, created_at, deliver_by, expires_at, published_at, published_url, published_by, dropbox_sync_cursor`
                )
                .order('created_at', { ascending: false });

            if (statusFilter) {
                query = query.eq('status', statusFilter);
            }

            if (clientId) {
                query = query.eq('client_id', clientId);
            }

            if (search) {
                query = query.ilike('gallery_name', `%${search}%`);
            }

            if (!includeArchived) {
                query = query.neq('status', 'archived');
            }

            const { data, error } = await query;

            if (error) {
                console.error('Failed to list galleries', error);
                res.status(500).json({ error: 'Unable to load galleries from Supabase.' });
                return;
            }

            res.status(200).json({ data: data ?? [] });
            return;
        }

        const body = typeof req.body === 'string' ? safeParseJson(req.body) : req.body;

        if (!body || typeof body !== 'object' || Array.isArray(body)) {
            res.status(400).json({ error: 'Request body must be a JSON object.' });
            return;
        }

        const payload = body as Record<string, unknown>;

        const galleryName = parseString(payload.galleryName);
        const clientId = parseString(payload.clientId);
        const status = parseStatus(payload.status) ?? 'draft';
        const galleryUrl = parseString(payload.galleryUrl);
        const deliverBy = parseIsoDate(payload.deliverBy ?? payload.deliveryDueDate);
        const expiresAt = parseIsoDate(payload.expiresAt);
        const dropboxSyncCursor = parseString(payload.dropboxSyncCursor);
        const welcomeMessage = parseString(payload.welcomeMessage);
        const portalPassword = parseString(payload.portalPassword);
        const portalHint = parseString(payload.portalHint);
        const defaultView = parseString(payload.defaultView);

        if (!galleryName) {
            res.status(400).json({ error: 'galleryName is required.' });
            return;
        }

        if (!clientId) {
            res.status(400).json({ error: 'clientId is required.' });
            return;
        }

        const insertPayload: Record<string, unknown> = {
            gallery_name: galleryName,
            client_id: clientId,
            status,
            gallery_url: galleryUrl,
            deliver_by: deliverBy,
            expires_at: expiresAt,
            dropbox_sync_cursor: dropboxSyncCursor,
            welcome_message: welcomeMessage,
            portal_password: portalPassword,
            portal_hint: portalHint,
            default_view: defaultView
        };

        const { data, error } = await supabase
            .from('galleries')
            .insert(insertPayload)
            .select(
                `id, client_id, gallery_name, gallery_url, status, created_at, deliver_by, expires_at, dropbox_sync_cursor, welcome_message, portal_password, portal_hint, default_view`
            )
            .single();

        if (error) {
            console.error('Failed to create gallery', error);
            res.status(500).json({ error: 'Unable to create gallery.' });
            return;
        }

        res.status(201).json({ data });
    } catch (error) {
        console.error('Unhandled galleries API error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

function safeParseJson(value: string): Record<string, unknown> | null {
    const trimmed = value.trim();
    if (!trimmed) {
        return null;
    }

    try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            return parsed as Record<string, unknown>;
        }
    } catch (error) {
        console.error('Failed to parse JSON request body', error);
    }

    return null;
}
