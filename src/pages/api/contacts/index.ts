import { randomUUID } from 'crypto';

import type { NextApiRequest, NextApiResponse } from 'next';

import type { SessionPayload } from '../../../lib/jwt';
import type { ContactRecord } from '../../../types/contact';
import { authenticateRequest } from '../../../utils/api-auth';
import { getSupabaseClient } from '../../../utils/supabase-client';
import { readContactsFromDisk, writeContactsToDisk } from '../../../server/contacts/local-store';
import { readCmsCollection } from '../../../utils/read-cms-collection';

type ErrorResponse = { error: string };

type OwnerOption = { id: string; name: string | null };

type ContactListResponse = {
    data: ContactRecord[];
    meta: {
        page: number;
        pageSize: number;
        total: number;
        availableFilters: {
            owners: OwnerOption[];
            statuses: Array<NonNullable<ContactRecord['status']>>;
        };
    };
};

type ContactSingleResponse = { data: ContactRecord };

type ContactsResponse = ContactListResponse | ContactSingleResponse | ErrorResponse;

type SupabaseClient = ReturnType<typeof getSupabaseClient>;

const ALLOWED_METHODS = ['GET', 'POST'] as const;

const SORT_FIELDS = new Set(['name-asc', 'name-desc', 'created-desc', 'created-asc', 'updated-desc', 'updated-asc']);

const STAGE_STATUS_MAP: Record<string, Array<ContactRecord['status'] | null>> = {
    new: ['lead', null],
    warm: ['active'],
    hot: ['client'],
};

function parseListParam(value: string | string[] | undefined): string[] {
    if (!value) {
        return [];
    }

    if (Array.isArray(value)) {
        return value
            .flatMap((entry) => entry.split(','))
            .map((entry) => entry.trim())
            .filter(Boolean);
    }

    return value
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);
}

function parsePositiveInteger(value: string | string[] | undefined, fallback: number, min = 1, max = 100): number {
    if (!value) {
        return fallback;
    }

    const candidate = Array.isArray(value) ? Number.parseInt(value[0] ?? '', 10) : Number.parseInt(value, 10);
    if (!Number.isFinite(candidate)) {
        return fallback;
    }

    return Math.min(Math.max(candidate, min), max);
}

function normalizeSort(value: string | string[] | undefined): string {
    const candidate = Array.isArray(value) ? value[0] : value;
    if (candidate && SORT_FIELDS.has(candidate)) {
        return candidate;
    }
    return 'name-asc';
}

type ParsedQuery = {
    search: string;
    stages: string[];
    statuses: string[];
    owners: string[];
    sort: string;
    page: number;
    pageSize: number;
};

function parseQuery(req: NextApiRequest): ParsedQuery {
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const stages = parseListParam(req.query.stage);
    const statuses = parseListParam(req.query.status);
    const owners = parseListParam(req.query.owner);
    const sort = normalizeSort(req.query.sort);
    const page = parsePositiveInteger(req.query.page, 1, 1, 1000);
    const pageSize = parsePositiveInteger(req.query.pageSize, 10, 1, 100);

    return { search, stages, statuses, owners, sort, page, pageSize };
}

function normalizeStatuses(stages: string[], statuses: string[]): Array<ContactRecord['status'] | null> {
    if (stages.length === 0 && statuses.length === 0) {
        return [];
    }

    const set = new Set<ContactRecord['status'] | null>();
    statuses.forEach((status) => {
        if (status === 'lead' || status === 'active' || status === 'client') {
            set.add(status);
        }
    });

    stages.forEach((stage) => {
        const mapped = STAGE_STATUS_MAP[stage];
        if (mapped) {
            mapped.forEach((status) => set.add(status ?? null));
        }
    });

    return Array.from(set);
}

async function fetchSupabaseFilterOptions(
    supabase: SupabaseClient,
    ownerUserId: string | null,
    canViewAll: boolean
) {

    let ownerQuery = supabase
        .from('contacts')
        .select('owner_user_id', { distinct: true })
        .not('owner_user_id', 'is', null);

    if (!canViewAll && ownerUserId) {
        ownerQuery = ownerQuery.eq('owner_user_id', ownerUserId);
    }

    const { data: ownerRows } = await ownerQuery;

    const ownerIds = Array.from(
        new Set<string>(
            (ownerRows ?? [])
                .map((row) => row?.owner_user_id)
                .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
        )
    );

    let ownerDetails: OwnerOption[] = ownerIds.map((id) => ({ id, name: null }));

    if (ownerIds.length > 0) {
        const { data: users } = await supabase
            .from('users')
            .select('id,name')
            .in('id', ownerIds);

        if (Array.isArray(users) && users.length > 0) {
            const nameMap = new Map<string, string | null>();
            users.forEach((user) => {
                if (user && typeof user.id === 'string') {
                    nameMap.set(user.id, typeof user.name === 'string' ? user.name : null);
                }
            });
            ownerDetails = ownerIds.map((id) => ({ id, name: nameMap.get(id) ?? null }));
        }
    }

    let statusQuery = supabase.from('contacts').select('status', { distinct: true }).not('status', 'is', null);

    if (!canViewAll && ownerUserId) {
        statusQuery = statusQuery.eq('owner_user_id', ownerUserId);
    }

    const { data: statusRows } = await statusQuery;

    const statuses = Array.from(
        new Set<NonNullable<ContactRecord['status']>>(
            (statusRows ?? [])
                .map((row) => row?.status)
                .filter((value): value is NonNullable<ContactRecord['status']> => value === 'lead' || value === 'active' || value === 'client')
        )
    ).sort();

    return {
        owners: ownerDetails,
        statuses,
    };
}

function applySupabaseSorting(query: ReturnType<typeof getSupabaseClient>['from'], sort: string) {
    switch (sort) {
        case 'name-desc':
            return query.order('last_name', { ascending: false, nullsFirst: false }).order('first_name', { ascending: false, nullsFirst: false }).order('business', { ascending: false, nullsFirst: false });
        case 'created-asc':
            return query.order('created_at', { ascending: true, nullsFirst: false });
        case 'created-desc':
            return query.order('created_at', { ascending: false, nullsFirst: false });
        case 'updated-asc':
            return query
                .order('updated_at', { ascending: true, nullsFirst: false })
                .order('created_at', { ascending: true, nullsFirst: false });
        case 'updated-desc':
            return query
                .order('updated_at', { ascending: false, nullsFirst: false })
                .order('created_at', { ascending: false, nullsFirst: false });
        case 'name-asc':
        default:
            return query
                .order('last_name', { ascending: true, nullsFirst: false })
                .order('first_name', { ascending: true, nullsFirst: false })
                .order('business', { ascending: true, nullsFirst: false });
    }
}

async function handleGetSupabase(
    req: NextApiRequest,
    res: NextApiResponse<ContactsResponse>,
    session: SessionPayload,
    supabase: SupabaseClient
) {

    const contactIdParam = req.query.id;
    const rawContactId = Array.isArray(contactIdParam) ? contactIdParam[0] : contactIdParam;
    const contactId = typeof rawContactId === 'string' ? rawContactId.trim() : null;

    const canViewAll = session.role === 'admin' || session.permissions.canManageUsers;

    if (contactId) {
        let singleQuery = supabase.from('contacts').select('*').eq('id', contactId);

        if (!canViewAll) {
            singleQuery = singleQuery.eq('owner_user_id', session.userId);
        }

        const { data, error, status } = await singleQuery.single();
        const record = (data ?? null) as ContactRecord | null;

        if (error || !record) {
            const notFound = status === 404 || status === 406 || error?.code === 'PGRST116';

            if (!notFound) {
                console.error('Failed to fetch contact from Supabase', error);
            }

            res.status(notFound ? 404 : 500).json({ error: notFound ? 'Contact not found.' : 'Unable to load contact.' });
            return;
        }

        res.status(200).json({ data: record });
        return;
    }

    const queryState = parseQuery(req);
    const normalizedStatuses = normalizeStatuses(queryState.stages, queryState.statuses);
    const includeUnassignedOwner = queryState.owners.includes('unassigned');
    const ownerIds = canViewAll
        ? queryState.owners.filter((owner) => owner && owner !== 'unassigned')
        : [session.userId];

    const from = (queryState.page - 1) * queryState.pageSize;
    const to = from + queryState.pageSize - 1;

    let query = supabase.from('contacts').select('*', { count: 'exact' });

    if (!canViewAll) {
        query = query.eq('owner_user_id', session.userId);
    }

    if (queryState.search) {
        const escaped = queryState.search.replace(/%/g, '\\%').replace(/_/g, '\\_');
        const pattern = `%${escaped}%`;
        query = query.or(
            [
                `first_name.ilike.${pattern}`,
                `last_name.ilike.${pattern}`,
                `email.ilike.${pattern}`,
                `phone.ilike.${pattern}`,
                `business.ilike.${pattern}`,
            ].join(',')
        );
    }

    if (normalizedStatuses.length > 0) {
        const withoutNull = normalizedStatuses.filter((status): status is NonNullable<ContactRecord['status']> => Boolean(status));
        const includeNull = normalizedStatuses.some((status) => status === null);

        if (withoutNull.length > 0 && includeNull) {
            query = query.or(`status.in.(${withoutNull.join(',')}),status.is.null`);
        } else if (withoutNull.length > 0) {
            query = query.in('status', withoutNull);
        } else if (includeNull) {
            query = query.is('status', null);
        }
    }

    if (ownerIds.length > 0 || includeUnassignedOwner) {
        if (ownerIds.length > 0 && includeUnassignedOwner) {
            query = query.or(`owner_user_id.in.(${ownerIds.join(',')}),owner_user_id.is.null`);
        } else if (ownerIds.length > 0) {
            query = query.in('owner_user_id', ownerIds);
        } else {
            query = query.is('owner_user_id', null);
        }
    }

    query = applySupabaseSorting(query, queryState.sort);
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
        console.error('Failed to fetch contacts from Supabase', error);
        res.status(500).json({ error: 'Unable to load contacts' });
        return;
    }

    const filters = await fetchSupabaseFilterOptions(
        supabase,
        canViewAll ? null : session.userId,
        canViewAll
    );

    res.status(200).json({
        data: data ?? [],
        meta: {
            page: queryState.page,
            pageSize: queryState.pageSize,
            total: typeof count === 'number' ? count : data?.length ?? 0,
            availableFilters: filters,
        },
    });
}

type CreateContactPayload = {
    first_name?: unknown;
    last_name?: unknown;
    firstName?: unknown;
    lastName?: unknown;
    name?: unknown;
    email?: unknown;
    phone?: unknown;
    address?: unknown;
    city?: unknown;
    state?: unknown;
    notes?: unknown;
    business?: unknown;
};

function parseContactBody(body: unknown): CreateContactPayload | null {
    if (!body || typeof body !== 'object') {
        return null;
    }

    return body as CreateContactPayload;
}

function splitName(name: string): { first: string | null; last: string | null } {
    const parts = name
        .split(/\s+/)
        .map((part) => part.trim())
        .filter(Boolean);

    if (parts.length === 0) {
        return { first: null, last: null };
    }

    const [first, ...rest] = parts;
    return {
        first: first ?? null,
        last: rest.length > 0 ? rest.join(' ') : null,
    };
}

function sanitizeString(value: unknown): string | null {
    if (typeof value !== 'string') {
        return null;
    }
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
}

async function handlePostSupabase(
    req: NextApiRequest,
    res: NextApiResponse<ContactsResponse>,
    session: SessionPayload,
    supabase: SupabaseClient
) {
    const payload = parseContactBody(req.body);

    if (!payload) {
        res.status(400).json({ error: 'Request body must be a JSON object' });
        return;
    }

    let first = sanitizeString(payload.first_name ?? payload.firstName);
    let last = sanitizeString(payload.last_name ?? payload.lastName);

    if (!first && !last) {
        const name = sanitizeString(payload.name);
        if (name) {
            const parsed = splitName(name);
            first = parsed.first;
            last = parsed.last;
        }
    }

    const email = sanitizeString(payload.email);
    const phone = sanitizeString(payload.phone);
    const address = sanitizeString(payload.address);
    const city = sanitizeString(payload.city);
    const state = sanitizeString(payload.state);
    const business = sanitizeString(payload.business);
    const notes = sanitizeString(payload.notes);

    if (!first && !last && !business && !email) {
        res.status(400).json({ error: 'Provide at least a first name, last name, business, or email for the contact' });
        return;
    }

    const now = new Date().toISOString();

    const insertPayload = {
        first_name: first,
        last_name: last,
        email,
        phone,
        address,
        city,
        state,
        business,
        notes,
        created_at: now,
        updated_at: now,
    } satisfies Partial<ContactRecord>;

    const { data, error } = await supabase
        .from('contacts')
        .insert({ ...insertPayload, owner_user_id: session.userId })
        .select()
        .single();

    if (error || !data) {
        console.error('Failed to create contact in Supabase', error);
        if (error && error.code === '23505') {
            res.status(409).json({ error: 'A contact with this email already exists for this owner.' });
            return;
        }
        res.status(500).json({ error: error?.message ?? 'Unable to save contact' });
        return;
    }

    res.status(201).json({ data: data as ContactRecord });
}

function coerceString(value: unknown): string | null {
    if (typeof value !== 'string') {
        return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

function coerceIsoString(value: unknown): string | null {
    if (typeof value !== 'string') {
        return null;
    }

    const trimmed = value.trim();
    if (!trimmed) {
        return null;
    }

    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function coerceStatus(value: unknown): ContactRecord['status'] {
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (normalized === 'lead' || normalized === 'active' || normalized === 'client') {
            return normalized;
        }
    }

    return null;
}

function normalizeLocalContact(record: Partial<ContactRecord> & Record<string, unknown>): ContactRecord {
    return {
        id: typeof record.id === 'string' && record.id.trim() ? record.id.trim() : randomUUID(),
        owner_user_id: coerceString(record.owner_user_id),
        first_name: coerceString(record.first_name),
        last_name: coerceString(record.last_name),
        email: coerceString(record.email),
        phone: coerceString(record.phone),
        notes: coerceString(record.notes),
        address: coerceString(record.address),
        city: coerceString(record.city),
        state: coerceString(record.state),
        business: coerceString(record.business),
        status: coerceStatus(record.status),
        created_at: coerceIsoString(record.created_at),
        updated_at: coerceIsoString(record.updated_at),
    } satisfies ContactRecord;
}

function compareNullableString(
    a: string | null | undefined,
    b: string | null | undefined,
    ascending: boolean
): number {
    const aHasValue = typeof a === 'string' && a.trim().length > 0;
    const bHasValue = typeof b === 'string' && b.trim().length > 0;

    if (!aHasValue && !bHasValue) {
        return 0;
    }

    if (!aHasValue) {
        return 1;
    }

    if (!bHasValue) {
        return -1;
    }

    const aValue = a.trim().toLowerCase();
    const bValue = b.trim().toLowerCase();

    if (aValue === bValue) {
        return 0;
    }

    const comparison = aValue < bValue ? -1 : 1;
    return ascending ? comparison : -comparison;
}

function compareIsoDates(
    a: string | null | undefined,
    b: string | null | undefined,
    ascending: boolean
): number {
    const parse = (value: string | null | undefined) => {
        if (!value || typeof value !== 'string') {
            return null;
        }
        const trimmed = value.trim();
        if (!trimmed) {
            return null;
        }
        const timestamp = Date.parse(trimmed);
        return Number.isNaN(timestamp) ? null : timestamp;
    };

    const aTime = parse(a);
    const bTime = parse(b);

    if (aTime === bTime) {
        return 0;
    }

    if (aTime === null) {
        return 1;
    }

    if (bTime === null) {
        return -1;
    }

    return ascending ? aTime - bTime : bTime - aTime;
}

function sortLocalContacts(records: ContactRecord[], sort: string): ContactRecord[] {
    const sorted = [...records];

    switch (sort) {
        case 'name-desc':
            sorted.sort((a, b) => {
                const last = compareNullableString(a.last_name, b.last_name, false);
                if (last !== 0) {
                    return last;
                }
                const first = compareNullableString(a.first_name, b.first_name, false);
                if (first !== 0) {
                    return first;
                }
                return compareNullableString(a.business, b.business, false);
            });
            break;
        case 'created-asc':
            sorted.sort((a, b) => compareIsoDates(a.created_at, b.created_at, true));
            break;
        case 'created-desc':
            sorted.sort((a, b) => compareIsoDates(a.created_at, b.created_at, false));
            break;
        case 'updated-asc':
            sorted.sort((a, b) => {
                const primary = compareIsoDates(a.updated_at, b.updated_at, true);
                if (primary !== 0) {
                    return primary;
                }
                return compareIsoDates(a.created_at, b.created_at, true);
            });
            break;
        case 'updated-desc':
            sorted.sort((a, b) => {
                const primary = compareIsoDates(a.updated_at, b.updated_at, false);
                if (primary !== 0) {
                    return primary;
                }
                return compareIsoDates(a.created_at, b.created_at, false);
            });
            break;
        case 'name-asc':
        default:
            sorted.sort((a, b) => {
                const last = compareNullableString(a.last_name, b.last_name, true);
                if (last !== 0) {
                    return last;
                }
                const first = compareNullableString(a.first_name, b.first_name, true);
                if (first !== 0) {
                    return first;
                }
                return compareNullableString(a.business, b.business, true);
            });
            break;
    }

    return sorted;
}

async function buildLocalOwnerOptions(
    contacts: ContactRecord[],
    canViewAll: boolean,
    session: SessionPayload
): Promise<OwnerOption[]> {
    const ownerIds = new Set<string>();
    contacts.forEach((record) => {
        const id = typeof record.owner_user_id === 'string' ? record.owner_user_id.trim() : '';
        if (id) {
            ownerIds.add(id);
        }
    });

    const users = await readCmsCollection<{ id?: string; name?: string | null }>('crm-users.json');
    const nameMap = new Map<string, string | null>();
    users.forEach((user) => {
        const id = typeof user?.id === 'string' ? user.id.trim() : '';
        if (id) {
            nameMap.set(id, typeof user?.name === 'string' ? user.name : null);
        }
    });

    if (!canViewAll) {
        if (ownerIds.has(session.userId) || nameMap.has(session.userId)) {
            return [{ id: session.userId, name: nameMap.get(session.userId) ?? null }];
        }
        return [];
    }

    return Array.from(ownerIds)
        .map((id) => ({ id, name: nameMap.get(id) ?? null }))
        .sort((a, b) => {
            const aLabel = (a.name ?? a.id).toLowerCase();
            const bLabel = (b.name ?? b.id).toLowerCase();
            if (aLabel < bLabel) {
                return -1;
            }
            if (aLabel > bLabel) {
                return 1;
            }
            return 0;
        });
}

function buildLocalStatusOptions(contacts: ContactRecord[]): Array<NonNullable<ContactRecord['status']>> {
    return Array.from(
        new Set(
            contacts
                .map((record) => (typeof record.status === 'string' ? record.status.trim().toLowerCase() : null))
                .filter((value): value is NonNullable<ContactRecord['status']> =>
                    value === 'lead' || value === 'active' || value === 'client'
                )
        )
    ).sort();
}

function matchesSearch(record: ContactRecord, search: string): boolean {
    const term = search.trim().toLowerCase();
    if (!term) {
        return true;
    }

    const fields = [
        record.first_name,
        record.last_name,
        record.email,
        record.phone,
        record.business,
    ];

    return fields.some((value) => (typeof value === 'string' ? value.toLowerCase().includes(term) : false));
}

function matchesStatuses(
    record: ContactRecord,
    statuses: Array<ContactRecord['status'] | null>
): boolean {
    if (statuses.length === 0) {
        return true;
    }

    const includeNull = statuses.some((status) => status === null);
    const normalized = new Set(
        statuses.filter((status): status is NonNullable<ContactRecord['status']> => Boolean(status))
    );

    const value = record.status ?? null;

    if (value === null) {
        return includeNull;
    }

    return normalized.size === 0 ? includeNull : normalized.has(value);
}

function matchesOwner(
    record: ContactRecord,
    ownerIds: string[],
    includeUnassigned: boolean
): boolean {
    if (ownerIds.length === 0 && !includeUnassigned) {
        return true;
    }

    const ownerId = typeof record.owner_user_id === 'string' ? record.owner_user_id.trim() : '';
    if (ownerId && ownerIds.includes(ownerId)) {
        return true;
    }

    if (!ownerId && includeUnassigned) {
        return true;
    }

    return ownerIds.length === 0 && includeUnassigned && !ownerId;
}

async function handleGetLocal(
    req: NextApiRequest,
    res: NextApiResponse<ContactsResponse>,
    session: SessionPayload
) {
    const canViewAll = session.role === 'admin' || session.permissions.canManageUsers;
    const queryState = parseQuery(req);
    const normalizedStatuses = normalizeStatuses(queryState.stages, queryState.statuses);
    const includeUnassignedOwner = queryState.owners.includes('unassigned');
    const ownerIds = canViewAll
        ? queryState.owners.filter((owner) => owner && owner !== 'unassigned')
        : [session.userId];

    const rawContacts = await readContactsFromDisk();
    const normalizedContacts = rawContacts.map((record) => normalizeLocalContact(record ?? {}));
    const accessibleContacts = canViewAll
        ? normalizedContacts
        : normalizedContacts.filter((record) => record.owner_user_id === session.userId);

    const filters = {
        owners: await buildLocalOwnerOptions(accessibleContacts, canViewAll, session),
        statuses: buildLocalStatusOptions(accessibleContacts),
    };

    let filtered = accessibleContacts.filter((record) => matchesSearch(record, queryState.search));

    filtered = filtered.filter((record) => matchesStatuses(record, normalizedStatuses));

    filtered = filtered.filter((record) => matchesOwner(record, ownerIds, includeUnassignedOwner));

    const sorted = sortLocalContacts(filtered, queryState.sort);
    const total = sorted.length;
    const from = (queryState.page - 1) * queryState.pageSize;
    const to = from + queryState.pageSize;
    const pageData = sorted.slice(from, to);

    res.status(200).json({
        data: pageData,
        meta: {
            page: queryState.page,
            pageSize: queryState.pageSize,
            total,
            availableFilters: filters,
        },
    });
}

async function handlePostLocal(
    req: NextApiRequest,
    res: NextApiResponse<ContactsResponse>,
    session: SessionPayload
) {
    const payload = parseContactBody(req.body);

    if (!payload) {
        res.status(400).json({ error: 'Request body must be a JSON object' });
        return;
    }

    let first = sanitizeString(payload.first_name ?? payload.firstName);
    let last = sanitizeString(payload.last_name ?? payload.lastName);

    if (!first && !last) {
        const name = sanitizeString(payload.name);
        if (name) {
            const parsed = splitName(name);
            first = parsed.first;
            last = parsed.last;
        }
    }

    const email = sanitizeString(payload.email);
    const phone = sanitizeString(payload.phone);
    const address = sanitizeString(payload.address);
    const city = sanitizeString(payload.city);
    const state = sanitizeString(payload.state);
    const business = sanitizeString(payload.business);
    const notes = sanitizeString(payload.notes);

    if (!first && !last && !business && !email) {
        res.status(400).json({ error: 'Provide at least a first name, last name, business, or email for the contact' });
        return;
    }

    const now = new Date().toISOString();
    const newRecord: ContactRecord = {
        id: randomUUID(),
        owner_user_id: session.userId,
        first_name: first,
        last_name: last,
        email,
        phone,
        address,
        city,
        state,
        business,
        notes,
        status: 'lead',
        created_at: now,
        updated_at: now,
    };

    const existing = (await readContactsFromDisk()).map((record) => normalizeLocalContact(record ?? {}));

    if (email) {
        const normalizedEmail = email.toLowerCase();
        const conflict = existing.some(
            (record) => record.owner_user_id === session.userId && record.email?.toLowerCase() === normalizedEmail
        );

        if (conflict) {
            res.status(409).json({ error: 'A contact with this email already exists for this owner.' });
            return;
        }
    }

    existing.push(newRecord);
    await writeContactsToDisk(existing);

    res.status(201).json({ data: newRecord });
}

async function handler(req: NextApiRequest, res: NextApiResponse<ContactsResponse>) {
    res.setHeader('Content-Type', 'application/json');

    const method = req.method ?? 'GET';

    if (!ALLOWED_METHODS.includes(method as (typeof ALLOWED_METHODS)[number])) {
        res.setHeader('Allow', ALLOWED_METHODS.join(', '));
        res.status(405).json({ error: `Method ${method} Not Allowed` });
        return;
    }

    let supabase: SupabaseClient | null = null;

    try {
        supabase = getSupabaseClient();
    } catch (error) {
        console.warn('Supabase client unavailable. Falling back to local contacts data.', error);
    }

    const session = await authenticateRequest(req);
    if (!session) {
        res.status(401).json({ error: 'Authentication required.' });
        return;
    }

    if (!session.emailVerified) {
        res.status(403).json({ error: 'Verify your email to manage contacts.' });
        return;
    }

    if (method === 'GET') {
        if (supabase) {
            await handleGetSupabase(req, res, session, supabase);
        } else {
            await handleGetLocal(req, res, session);
        }
        return;
    }

    if (method === 'POST') {
        if (supabase) {
            await handlePostSupabase(req, res, session, supabase);
        } else {
            await handlePostLocal(req, res, session);
        }
    }
}

export default handler;
