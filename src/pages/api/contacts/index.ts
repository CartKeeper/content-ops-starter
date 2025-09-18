import type { NextApiRequest, NextApiResponse } from 'next';
import { randomUUID } from 'crypto';
import type { ContactRecord } from '../../../types/contact';
import { createCrudHandler } from '../../../utils/create-crud-handler';
import { getSupabaseClient } from '../../../utils/supabase-client';
import { readContactsFromDisk, writeContactsToDisk } from '../../../server/contacts/local-store';

const ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'DELETE'] as const;

const FIELD_KEY_MAP: Record<string, keyof ContactRecord | 'id'> = {
    id: 'id',
    owner_user_id: 'owner_user_id',
    ownerUserId: 'owner_user_id',
    first_name: 'first_name',
    firstName: 'first_name',
    last_name: 'last_name',
    lastName: 'last_name',
    email: 'email',
    phone: 'phone',
    notes: 'notes',
    address: 'address',
    city: 'city',
    state: 'state',
    business: 'business',
    created_at: 'created_at',
    createdAt: 'created_at',
    updated_at: 'updated_at',
    updatedAt: 'updated_at'
};

function parseId(value: unknown): string | undefined {
    if (Array.isArray(value)) {
        return parseId(value[0]);
    }

    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed ? trimmed : undefined;
    }

    return undefined;
}

function parseBodyObject(body: unknown): Record<string, unknown> | null {
    if (!body) {
        return null;
    }

    if (typeof body === 'string') {
        const trimmed = body.trim();
        if (!trimmed) {
            return null;
        }

        try {
            const parsed = JSON.parse(trimmed);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                return parsed as Record<string, unknown>;
            }
        } catch (error) {
            return null;
        }

        return null;
    }

    if (typeof body === 'object' && !Array.isArray(body)) {
        return body as Record<string, unknown>;
    }

    return null;
}

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

function normalizeKeys(input: Record<string, unknown>): Record<string, unknown> {
    const normalized: Record<string, unknown> = {};

    Object.entries(input).forEach(([key, value]) => {
        const mapped = FIELD_KEY_MAP[key] ?? key;
        normalized[mapped] = value;
    });

    return normalized;
}

type SanitizedFields = {
    id?: string;
    values: Partial<ContactRecord>;
    touched: Set<keyof ContactRecord>;
};

function sanitizeFields(input: Record<string, unknown>): SanitizedFields {
    const normalized = normalizeKeys(input);
    const values: Partial<ContactRecord> = {};
    const touched = new Set<keyof ContactRecord>();

    const id = parseId(normalized.id);

    const setString = (key: keyof ContactRecord) => {
        if (Object.prototype.hasOwnProperty.call(normalized, key)) {
            values[key] = toNullableString(normalized[key]);
            touched.add(key);
        }
    };

    setString('owner_user_id');
    setString('first_name');
    setString('last_name');
    setString('email');
    setString('phone');
    setString('notes');
    setString('address');
    setString('city');
    setString('state');
    setString('business');

    if (Object.prototype.hasOwnProperty.call(normalized, 'created_at')) {
        const iso = toIsoString(normalized.created_at);
        if (iso) {
            values.created_at = iso;
            touched.add('created_at');
        }
    }

    if (Object.prototype.hasOwnProperty.call(normalized, 'updated_at')) {
        const iso = toIsoString(normalized.updated_at);
        if (iso) {
            values.updated_at = iso;
            touched.add('updated_at');
        }
    }

    return { id, values, touched };
}

type ContactsApiResponse = { data?: ContactRecord | ContactRecord[]; error?: string };

type Handler = (req: NextApiRequest, res: NextApiResponse<ContactsApiResponse>) => Promise<void>;

async function handleGetLocal(req: NextApiRequest, res: NextApiResponse<ContactsApiResponse>): Promise<void> {
    const contacts = await readContactsFromDisk();
    const id = parseId(req.query.id);

    if (id) {
        const record = contacts.find((contact) => contact.id === id);
        if (!record) {
            res.status(404).json({ error: 'Contact not found' });
            return;
        }
        res.status(200).json({ data: record });
        return;
    }

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
}

async function handlePostLocal(req: NextApiRequest, res: NextApiResponse<ContactsApiResponse>): Promise<void> {
    const payload = parseBodyObject(req.body);

    if (!payload) {
        res.status(400).json({ error: 'Request body must be a JSON object' });
        return;
    }

    const { id: providedId, values } = sanitizeFields(payload);
    const nowIso = new Date().toISOString();
    const contacts = await readContactsFromDisk();

    const id = providedId ?? randomUUID();
    if (contacts.some((contact) => contact.id === id)) {
        res.status(409).json({ error: 'A contact with this id already exists' });
        return;
    }

    const hasNameOrBusiness = Boolean(
        (values.first_name && values.first_name.trim?.()) ||
            (values.last_name && values.last_name.trim?.()) ||
            (values.business && values.business.trim?.()) ||
            (values.email && values.email.trim?.())
    );

    if (!hasNameOrBusiness) {
        res.status(400).json({ error: 'Provide at least a name, business, or email for the contact' });
        return;
    }

    const createdAt = typeof values.created_at === 'string' ? values.created_at : nowIso;
    const updatedAt = typeof values.updated_at === 'string' ? values.updated_at : createdAt;

    const record: ContactRecord = {
        id,
        owner_user_id: typeof values.owner_user_id === 'string' ? values.owner_user_id : null,
        first_name: typeof values.first_name === 'string' ? values.first_name : null,
        last_name: typeof values.last_name === 'string' ? values.last_name : null,
        email: typeof values.email === 'string' ? values.email : null,
        phone: typeof values.phone === 'string' ? values.phone : null,
        notes: typeof values.notes === 'string' ? values.notes : null,
        address: typeof values.address === 'string' ? values.address : null,
        city: typeof values.city === 'string' ? values.city : null,
        state: typeof values.state === 'string' ? values.state : null,
        business: typeof values.business === 'string' ? values.business : null,
        created_at: createdAt,
        updated_at: updatedAt
    };

    contacts.push(record);
    await writeContactsToDisk(contacts);

    res.status(201).json({ data: record });
}

async function handlePutLocal(req: NextApiRequest, res: NextApiResponse<ContactsApiResponse>): Promise<void> {
    const payload = parseBodyObject(req.body) ?? {};
    const { id: bodyId, values, touched } = sanitizeFields(payload);

    const id = parseId(req.query.id) ?? bodyId;
    if (!id) {
        res.status(400).json({ error: 'Contact id is required' });
        return;
    }

    if (touched.size === 0) {
        res.status(400).json({ error: 'No fields provided for update' });
        return;
    }

    const contacts = await readContactsFromDisk();
    const index = contacts.findIndex((contact) => contact.id === id);

    if (index === -1) {
        res.status(404).json({ error: 'Contact not found' });
        return;
    }

    const record = { ...contacts[index] } as ContactRecord;

    touched.forEach((key) => {
        const value = values[key];
        if (typeof value === 'string' || value === null) {
            record[key] = value;
        }
    });

    if (!touched.has('updated_at')) {
        record.updated_at = new Date().toISOString();
    }

    contacts[index] = record;
    await writeContactsToDisk(contacts);

    res.status(200).json({ data: record });
}

async function handleDeleteLocal(req: NextApiRequest, res: NextApiResponse<ContactsApiResponse>): Promise<void> {
    const payload = parseBodyObject(req.body) ?? {};
    const { id: bodyId } = sanitizeFields(payload);

    const id = parseId(req.query.id) ?? bodyId;
    if (!id) {
        res.status(400).json({ error: 'Contact id is required' });
        return;
    }

    const contacts = await readContactsFromDisk();
    const index = contacts.findIndex((contact) => contact.id === id);

    if (index === -1) {
        res.status(404).json({ error: 'Contact not found' });
        return;
    }

    const [removed] = contacts.splice(index, 1);
    await writeContactsToDisk(contacts);

    res.status(200).json({ data: removed ?? null });
}

const localHandler: Handler = async (req, res) => {
    res.setHeader('Content-Type', 'application/json');

    const method = req.method ?? 'GET';
    if (!ALLOWED_METHODS.includes(method as (typeof ALLOWED_METHODS)[number])) {
        res.setHeader('Allow', ALLOWED_METHODS.join(', '));
        res.status(405).json({ error: `Method ${method} Not Allowed` });
        return;
    }

    switch (method) {
        case 'GET':
            await handleGetLocal(req, res);
            break;
        case 'POST':
            await handlePostLocal(req, res);
            break;
        case 'PUT':
            await handlePutLocal(req, res);
            break;
        case 'DELETE':
            await handleDeleteLocal(req, res);
            break;
        default:
            res.setHeader('Allow', ALLOWED_METHODS.join(', '));
            res.status(405).json({ error: `Method ${method} Not Allowed` });
    }
};

let supabaseConfigured = true;
try {
    getSupabaseClient();
} catch (error) {
    supabaseConfigured = false;
}

const supabaseHandler = createCrudHandler('contacts');

const handler: Handler = (req, res) => {
    if (supabaseConfigured) {
        return supabaseHandler(req, res);
    }
    return localHandler(req, res);
};

export default handler;
