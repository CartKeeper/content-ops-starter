import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import type { SessionPayload } from '../../../lib/jwt';
import { supabaseAdmin } from '../../../lib/supabase-admin';
import { authenticateRequest } from '../../../utils/api-auth';

const STATUS_VALUES = ['Lead', 'Active', 'Inactive'] as const;

type ClientStatus = (typeof STATUS_VALUES)[number];

type ClientRecord = {
    id: string;
    created_at: string;
    updated_at: string;
    name: string;
    email: string | null;
    phone: string | null;
    status: ClientStatus;
    outstanding_cents: number;
    last_activity: string | null;
    upcoming_shoot: string | null;
    portal_url: string | null;
    portal_enabled: boolean;
    tags: string[] | null;
};

type ClientsResponse = {
    data: ClientRecord[];
    page: number;
    pageSize: number;
    total: number;
};

const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function optionalTrimmedString() {
    return z
        .union([z.string(), z.undefined()])
        .transform<string | undefined>((value) => {
            if (typeof value !== 'string') {
                return undefined;
            }
            const trimmed = value.trim();
            return trimmed.length ? trimmed : undefined;
        });
}

const emailSchema = optionalTrimmedString().refine((value) => !value || EMAIL_REGEX.test(value), {
    message: 'Enter a valid email address'
});

const phoneSchema = optionalTrimmedString();

const upcomingShootSchema = z
    .union([z.string(), z.undefined()])
    .transform<string | null>((value) => {
        if (typeof value !== 'string') {
            return null;
        }
        const trimmed = value.trim();
        return trimmed.length ? trimmed : null;
    })
    .refine((value) => value === null || !Number.isNaN(Date.parse(value)), {
        message: 'Invalid date'
    })
    .transform((value): string | null => {
        if (value === null) {
            return null;
        }
        return new Date(value).toISOString().slice(0, 10);
    });

const tagsSchema = z
    .union([z.string(), z.array(z.string()), z.undefined()])
    .transform<string[]>((value) => {
        if (!value) {
            return [];
        }
        const source = Array.isArray(value) ? value : value.split(',');
        return source.map((tag) => tag.trim()).filter((tag) => tag.length > 0);
    });

const createClientSchema = z.object({
    name: z.string().trim().min(1, 'Name is required'),
    email: emailSchema,
    phone: phoneSchema,
    status: z.enum(STATUS_VALUES).default('Lead'),
    upcoming_shoot: upcomingShootSchema,
    tags: tagsSchema
});

type CreateClientInput = z.infer<typeof createClientSchema>;

type SortOption = {
    column: keyof ClientRecord | 'created_at' | 'updated_at';
    ascending: boolean;
    nullsFirst?: boolean;
};

const SORT_MAP: Record<string, SortOption> = {
    'name-asc': { column: 'name', ascending: true },
    'name-desc': { column: 'name', ascending: false },
    'created-desc': { column: 'created_at', ascending: false },
    'created-asc': { column: 'created_at', ascending: true },
    'status-asc': { column: 'status', ascending: true },
    'status-desc': { column: 'status', ascending: false },
    'outstanding-desc': { column: 'outstanding_cents', ascending: false },
    'upcoming-asc': { column: 'upcoming_shoot', ascending: true, nullsFirst: false },
    'upcoming-desc': { column: 'upcoming_shoot', ascending: false, nullsFirst: true }
};

function normaliseSearch(value: string): string {
    return value
        .trim()
        .replace(/[\0\n\r\t\v\f]/g, ' ')
        .replace(/[%_]/g, (match) => `\\${match}`);
}

async function generateNextClientNumber(): Promise<string> {
    const now = new Date();
    const year = now.getUTCFullYear();
    const prefix = `C-${year}-`;

    const { data, error } = await supabaseAdmin
        .from('clients')
        .select('client_number')
        .like('client_number', `${prefix}%`)
        .order('client_number', { ascending: false })
        .limit(1);

    if (error) {
        throw new Error(error.message ?? 'Failed to generate client number');
    }

    const latest = data?.[0]?.client_number ?? '';
    const parsed = Number.parseInt(latest.replace(prefix, ''), 10);
    const nextSequence = Number.isFinite(parsed) && parsed >= 0 ? parsed + 1 : 1;

    return `${prefix}${String(nextSequence).padStart(3, '0')}`;
}

function splitName(fullName: string): { first_name: string | null; last_name: string | null } {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 0) {
        return { first_name: null, last_name: null };
    }
    if (parts.length === 1) {
        return { first_name: parts[0], last_name: null };
    }
    return {
        first_name: parts[0],
        last_name: parts.slice(1).join(' ')
    };
}

function parseStatusFilters(value: string | string[] | undefined): ClientStatus[] {
    if (!value) {
        return [];
    }
    const input = Array.isArray(value) ? value : value.split(',');
    const allowed = new Set<ClientStatus>(STATUS_VALUES);
    return input
        .map((entry) => entry.trim())
        .map((entry) => {
            const match = STATUS_VALUES.find((status) => status.toLowerCase() === entry.toLowerCase());
            return match;
        })
        .filter((entry): entry is ClientStatus => Boolean(entry) && allowed.has(entry as ClientStatus));
}

async function handleGet(
    req: NextApiRequest,
    res: NextApiResponse<ClientsResponse | { error: string }>,
    session: SessionPayload
) {
    const searchParam = typeof req.query.search === 'string' ? req.query.search : '';
    const statusFilters = parseStatusFilters(req.query.status);
    const sortKey = typeof req.query.sort === 'string' ? req.query.sort : 'name-asc';
    const pageValue = typeof req.query.page === 'string' ? Number.parseInt(req.query.page, 10) : NaN;
    const pageSizeValue = typeof req.query.pageSize === 'string' ? Number.parseInt(req.query.pageSize, 10) : NaN;
    const page = Number.isFinite(pageValue) && pageValue > 0 ? pageValue : 1;
    const pageSizeCandidate = Number.isFinite(pageSizeValue) && pageSizeValue > 0 ? pageSizeValue : 25;
    const pageSize = Math.min(pageSizeCandidate, 100);
    const offset = (page - 1) * pageSize;

    const sortOption = SORT_MAP[sortKey] ?? SORT_MAP['name-asc'];

    const canViewAll = session.role === 'admin' || session.permissions.canManageUsers;

    let query = supabaseAdmin
        .from('clients')
        .select(
            'id, created_at, updated_at, name, email, phone, status, outstanding_cents, last_activity, upcoming_shoot, portal_url, portal_enabled, tags',
            { count: 'exact' }
        )
        .order(sortOption.column, { ascending: sortOption.ascending, nullsFirst: sortOption.nullsFirst });

    if (!canViewAll) {
        query = query.eq('owner_user_id', session.userId);
    }

    if (searchParam.trim()) {
        const value = normaliseSearch(searchParam);
        const like = `%${value}%`;
        query = query.or(`name.ilike.${like},email.ilike.${like},phone.ilike.${like}`);
    }

    if (statusFilters.length > 0) {
        query = query.in('status', statusFilters);
    }

    const { data, error, count } = await query.range(offset, offset + pageSize - 1);

    if (error) {
        console.error('Failed to fetch clients', error);
        return res.status(500).json({ error: error.message ?? 'Failed to load clients' });
    }

    const resultData = data ?? [];

    return res.status(200).json({
        data: resultData,
        page,
        pageSize,
        total: typeof count === 'number' ? count : resultData.length
    });
}

async function handlePost(
    req: NextApiRequest,
    res: NextApiResponse<{ data: ClientRecord } | { error: string; fieldErrors?: Record<string, string> }>,
    session: SessionPayload
) {
    const parseResult = createClientSchema.safeParse(req.body ?? {});

    if (!parseResult.success) {
        const fieldErrors: Record<string, string> = {};
        for (const issue of parseResult.error.issues) {
            const path = issue.path[0];
            if (typeof path === 'string' && !fieldErrors[path]) {
                fieldErrors[path] = issue.message;
            }
        }
        return res.status(400).json({ error: 'Validation failed', fieldErrors });
    }

    const payload: CreateClientInput = parseResult.data;

    const clientNumber = await generateNextClientNumber();
    const { first_name, last_name } = splitName(payload.name);

    const insertPayload = {
        name: payload.name,
        email: payload.email ?? null,
        phone: payload.phone ?? null,
        status: payload.status,
        upcoming_shoot: payload.upcoming_shoot,
        tags: payload.tags.length > 0 ? payload.tags : null,
        outstanding_cents: 0,
        portal_enabled: false,
        last_activity: null,
        first_name,
        last_name,
        client_number: clientNumber,
        owner_user_id: session.userId
    };

    const { data, error } = await supabaseAdmin
        .from('clients')
        .insert([insertPayload])
        .select('id, created_at, updated_at, name, email, phone, status, outstanding_cents, last_activity, upcoming_shoot, portal_url, portal_enabled, tags')
        .single();

    if (error) {
        if (error.code === '23505') {
            return res.status(409).json({ error: 'A client with this email already exists.', fieldErrors: { email: 'Email already exists' } });
        }

        console.error('Failed to create client', error);
        return res.status(500).json({ error: error.message ?? 'Failed to create client' });
    }

    return res.status(201).json({ data: data as ClientRecord });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    res.setHeader('Content-Type', 'application/json');

    const session = await authenticateRequest(req);
    if (!session) {
        return res.status(401).json({ error: 'Authentication required.' });
    }

    if (!session.emailVerified) {
        return res.status(403).json({ error: 'Verify your email to access clients.' });
    }

    if (req.method === 'GET') {
        return handleGet(req, res, session);
    }

    if (req.method === 'POST') {
        try {
            return await handlePost(req, res, session);
        } catch (error) {
            console.error('Unhandled error creating client', error);
            return res.status(500).json({ error: 'Failed to create client' });
        }
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}
