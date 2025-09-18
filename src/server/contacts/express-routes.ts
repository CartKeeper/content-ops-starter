import { randomUUID } from 'crypto';

import type { ContactRecord, ConvertContactResponse } from '../../types/contact';
import { getContactName } from '../../types/contact';
import { readContactsFromDisk, writeContactsToDisk } from './local-store';

type ExpressLikeRequest = {
    params: Record<string, string>;
    body?: Record<string, unknown> | null;
};

type ExpressLikeResponse = {
    status: (code: number) => ExpressLikeResponse;
    json: (body: unknown) => ExpressLikeResponse;
};

type ExpressLikeRouter = {
    get: (path: string, handler: (req: ExpressLikeRequest, res: ExpressLikeResponse) => void | Promise<void>) => ExpressLikeRouter;
    post: (path: string, handler: (req: ExpressLikeRequest, res: ExpressLikeResponse) => void | Promise<void>) => ExpressLikeRouter;
    put: (path: string, handler: (req: ExpressLikeRequest, res: ExpressLikeResponse) => void | Promise<void>) => ExpressLikeRouter;
    delete: (path: string, handler: (req: ExpressLikeRequest, res: ExpressLikeResponse) => void | Promise<void>) => ExpressLikeRouter;
};

type ContactsApiResponse = { data?: ContactRecord | ContactRecord[] | ConvertContactResponse; error?: string };

const STATUS_VALUES: ContactRecord['status'][] = ['lead', 'active', 'client'];

const DEFAULT_PORTAL_TABS: ConvertContactResponse['portal']['tabs'] = [
    {
        id: 'gallery',
        label: 'Gallery',
        description: 'Curated selects, downloads, and hero imagery ready to share.'
    },
    {
        id: 'billing',
        label: 'Billing',
        description: 'Keep payment details, preferences, and history organised.'
    },
    {
        id: 'invoices',
        label: 'Invoices',
        description: 'Review open balances, receipts, and downloadable PDFs.'
    },
    {
        id: 'calendar',
        label: 'Calendar',
        description: 'Sync upcoming shoots, post-production checkpoints, and releases.'
    }
];

function toNullableString(value: unknown): string | null {
    if (value === null || value === undefined) {
        return null;
    }

    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed ? trimmed : null;
    }

    return String(value);
}

function toIsoString(value: unknown): string | undefined {
    if (value === null || value === undefined) {
        return undefined;
    }

    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return value.toISOString();
    }

    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) {
            return undefined;
        }

        const parsed = new Date(trimmed);
        if (!Number.isNaN(parsed.getTime())) {
            return parsed.toISOString();
        }
    }

    return undefined;
}

function normalizeStatus(value: unknown): ContactRecord['status'] {
    if (value === null) {
        return null;
    }

    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (STATUS_VALUES.includes(normalized as ContactRecord['status'])) {
            return normalized as ContactRecord['status'];
        }
    }

    return 'lead';
}

function createPortalSlug(contact: ContactRecord): string {
    const base = getContactName(contact) || contact.business || contact.id;
    return base
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '')
        .replace(/-{2,}/g, '-')
        .slice(0, 64);
}

function buildContactRecord(input: Record<string, unknown>, nowIso: string): ContactRecord {
    const record: ContactRecord = {
        id:
            typeof input.id === 'string' && input.id.trim()
                ? input.id.trim()
                : randomUUID(),
        owner_user_id: toNullableString(input.owner_user_id),
        first_name: toNullableString(input.first_name),
        last_name: toNullableString(input.last_name),
        email: toNullableString(input.email),
        phone: toNullableString(input.phone),
        notes: toNullableString(input.notes),
        address: toNullableString(input.address),
        city: toNullableString(input.city),
        state: toNullableString(input.state),
        business: toNullableString(input.business),
        status: normalizeStatus(input.status),
        created_at: toIsoString(input.created_at) ?? nowIso,
        updated_at: toIsoString(input.updated_at) ?? nowIso
    };

    return record;
}

async function saveContacts(contacts: ContactRecord[], res: ExpressLikeResponse, successCode = 200, data?: ContactsApiResponse['data']) {
    await writeContactsToDisk(contacts);
    res.status(successCode).json({ data: data ?? contacts });
}

async function handleConvertContact(contact: ContactRecord): Promise<ConvertContactResponse> {
    const nowIso = new Date().toISOString();
    const slug = createPortalSlug(contact);
    const clientId = `express-client-${contact.id}`;

    return {
        message: `${getContactName(contact)} converted to a client`,
        client: {
            id: clientId,
            first_name: contact.first_name,
            last_name: contact.last_name,
            email: contact.email,
            phone: contact.phone,
            address: contact.address,
            city: contact.city,
            state: contact.state,
            notes: contact.notes,
            business: contact.business,
            created_at: nowIso,
            updated_at: nowIso
        },
        gallery: {
            id: `express-gallery-${slug || contact.id}`,
            client_id: clientId,
            gallery_name: `${getContactName(contact)} Gallery`,
            gallery_url: null,
            status: 'draft',
            created_at: nowIso
        },
        billing_account: {
            id: `express-billing-${slug || contact.id}`,
            client_id: clientId,
            payment_terms: 'Due on receipt',
            invoice_history: [],
            created_at: nowIso
        },
        portal: {
            url: `/gallery-portal/${slug || contact.id}`,
            tabs: DEFAULT_PORTAL_TABS
        }
    };
}

export function registerContactsRoutes(router: ExpressLikeRouter): ExpressLikeRouter {
    router.get('/contacts', async (_req, res) => {
        const contacts = await readContactsFromDisk();
        const sorted = contacts.sort((a, b) => {
            const getTime = (value?: string | null) => {
                if (!value) {
                    return 0;
                }
                const timestamp = new Date(value).getTime();
                return Number.isNaN(timestamp) ? 0 : timestamp;
            };
            return getTime(b.updated_at ?? b.created_at) - getTime(a.updated_at ?? a.created_at);
        });

        res.status(200).json({ data: sorted });
    });

    router.get('/contacts/:id', async (req, res) => {
        const contacts = await readContactsFromDisk();
        const record = contacts.find((entry) => entry.id === req.params.id);

        if (!record) {
            res.status(404).json({ error: 'Contact not found' });
            return;
        }

        res.status(200).json({ data: record });
    });

    router.post('/contacts', async (req, res) => {
        const payload = req.body ?? {};
        const nowIso = new Date().toISOString();
        const record = buildContactRecord(payload ?? {}, nowIso);

        const hasIdentity = Boolean(
            record.first_name?.trim() ||
                record.last_name?.trim() ||
                record.business?.trim() ||
                record.email?.trim()
        );

        if (!hasIdentity) {
            res.status(400).json({ error: 'Provide at least a name, business, or email for the contact' });
            return;
        }

        const contacts = await readContactsFromDisk();
        if (contacts.some((existing) => existing.id === record.id)) {
            res.status(409).json({ error: 'A contact with this id already exists' });
            return;
        }

        contacts.push(record);
        await saveContacts(contacts, res, 201, record);
    });

    router.put('/contacts/:id', async (req, res) => {
        const contacts = await readContactsFromDisk();
        const index = contacts.findIndex((entry) => entry.id === req.params.id);

        if (index === -1) {
            res.status(404).json({ error: 'Contact not found' });
            return;
        }

        const existing = contacts[index];
        const payload = req.body ?? {};

        const fields: Array<
            Exclude<
                keyof ContactRecord,
                'status' | 'created_at' | 'updated_at'
            >
        > = [
            'owner_user_id',
            'first_name',
            'last_name',
            'email',
            'phone',
            'notes',
            'address',
            'city',
            'state',
            'business'
        ];

        fields.forEach((field) => {
            if (Object.prototype.hasOwnProperty.call(payload, field)) {
                existing[field] = toNullableString(payload[field]);
            }
        });

        if (Object.prototype.hasOwnProperty.call(payload, 'status')) {
            existing.status = normalizeStatus(payload.status);
        }

        if (Object.prototype.hasOwnProperty.call(payload, 'created_at')) {
            existing.created_at = toIsoString(payload.created_at) ?? existing.created_at;
        }

        existing.updated_at = toIsoString(payload.updated_at) ?? new Date().toISOString();

        contacts[index] = existing;
        await saveContacts(contacts, res, 200, existing);
    });

    router.delete('/contacts/:id', async (req, res) => {
        const contacts = await readContactsFromDisk();
        const index = contacts.findIndex((entry) => entry.id === req.params.id);

        if (index === -1) {
            res.status(404).json({ error: 'Contact not found' });
            return;
        }

        const [removed] = contacts.splice(index, 1);
        await saveContacts(contacts, res, 200, removed);
    });

    router.post('/contacts/:id/convert', async (req, res) => {
        const contacts = await readContactsFromDisk();
        const index = contacts.findIndex((entry) => entry.id === req.params.id);

        if (index === -1) {
            res.status(404).json({ error: 'Contact not found' });
            return;
        }

        const [contact] = contacts.splice(index, 1);
        await writeContactsToDisk(contacts);

        const conversion = await handleConvertContact(contact);
        res.status(200).json({ data: conversion });
    });

    return router;
}

export default registerContactsRoutes;
