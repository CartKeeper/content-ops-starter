import dayjs from 'dayjs';

import type { ContactRecord, ConvertContactResponse } from '../../types/contact';

export type ContactStage = 'new' | 'warm' | 'hot';

export type ContactTableRow = {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    stage: ContactStage;
    status: NonNullable<ContactRecord['status']>;
    lastInteractionAt: string | null;
    owner: string | null;
    tags: string[];
    business: string | null;
};

export type ContactDashboardData = {
    rows: ContactTableRow[];
    total: number;
    converted: number;
    needsFollowUp: number;
    newThisMonth: number;
};

const OWNER_LABELS: Record<string, string> = {
    'demo-user-001': 'Avery Logan',
    'demo-user-002': 'Jordan Lee'
};

const CONTACT_TAGS: Record<string, string[]> = {
    'contact-avery-cooper': ['Architecture', 'High Value'],
    'contact-emilia-cho': ['E-commerce', 'Warm Lead'],
    'contact-julian-ross': ['Enterprise', 'High Value'],
    'contact-leah-montoya': ['Wedding', 'Instagram']
};

function getStageFromStatus(status: ContactRecord['status']): ContactStage {
    if (status === 'client') {
        return 'hot';
    }

    if (status === 'active') {
        return 'warm';
    }

    return 'new';
}

export function mapContactToRow(contact: ContactRecord): ContactTableRow {
    const status = contact.status ?? 'lead';

    const tags = CONTACT_TAGS[contact.id] ?? [];

    return {
        id: contact.id,
        name: [contact.first_name, contact.last_name].filter(Boolean).join(' ').trim() || contact.business || 'New contact',
        email: contact.email,
        phone: contact.phone,
        stage: getStageFromStatus(status),
        status,
        lastInteractionAt: contact.updated_at ?? contact.created_at,
        owner: OWNER_LABELS[contact.owner_user_id ?? ''] ?? null,
        tags,
        business: contact.business ?? null
    };
}

export function buildContactDashboardData(records: ContactRecord[]): ContactDashboardData {
    const rows = records.map(mapContactToRow);

    const now = dayjs();
    const newThisMonth = rows.filter((row) => {
        if (!row.lastInteractionAt) {
            return false;
        }
        const date = dayjs(row.lastInteractionAt);
        return date.isValid() && date.isSame(now, 'month');
    }).length;

    const converted = rows.filter((row) => row.status === 'client').length;
    const needsFollowUp = rows.filter((row) => row.stage !== 'hot' && row.lastInteractionAt).length;

    return {
        rows,
        total: rows.length,
        converted,
        needsFollowUp,
        newThisMonth
    };
}

export async function fetchContacts(basePath = ''): Promise<ContactRecord[]> {
    const endpoint = `${basePath}/api/contacts`.replace(/\/+/, '/');
    const response = await fetch(endpoint);

    if (!response.ok) {
        throw new Error('Unable to load contacts');
    }

    const payload = (await response.json()) as { data?: ContactRecord[] };
    return Array.isArray(payload.data) ? payload.data : [];
}

export async function convertContactToClient(contactId: string): Promise<ConvertContactResponse> {
    const response = await fetch(`/api/contacts/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId })
    });

    const payload = (await response.json()) as { data?: ConvertContactResponse; error?: string };

    if (!response.ok) {
        throw new Error(payload.error ?? 'Unable to convert contact');
    }

    if (!payload.data) {
        throw new Error('Conversion response missing data');
    }

    return payload.data;
}

