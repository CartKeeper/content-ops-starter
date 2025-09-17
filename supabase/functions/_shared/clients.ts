import type { DatabaseClient } from './supabase.ts';

export type ContactRecord = {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    notes: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    business: string | null;
    owner_user_id: string | null;
};

export type ClientPayload = {
    id: string;
    owner_user_id: string | null;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    notes: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    business: string | null;
    contact_id: string | null;
    client_number: string;
    created_at: string;
    updated_at: string;
};

export async function generateNextClientNumber(
    supabase: DatabaseClient,
    now: Date = new Date()
): Promise<string> {
    const year = now.getUTCFullYear();
    const prefix = `C-${year}-`;
    const { data, error } = await supabase
        .from('clients')
        .select('client_number')
        .like('client_number', `${prefix}%`)
        .order('client_number', { ascending: false })
        .limit(1);

    if (error) {
        throw new Error(error.message ?? 'Failed to generate client number');
    }

    let nextSequence = 1;

    if (data && data.length > 0) {
        const latest = data[0]?.client_number ?? '';
        const parsed = Number.parseInt(latest.replace(prefix, ''), 10);
        if (Number.isFinite(parsed) && parsed >= 0) {
            nextSequence = parsed + 1;
        }
    }

    return `${prefix}${String(nextSequence).padStart(3, '0')}`;
}

export function deriveClientName(contact: ContactRecord): string {
    const parts = [contact.first_name?.trim(), contact.last_name?.trim()].filter((part): part is string => Boolean(part));
    if (parts.length === 0) {
        return contact.business?.trim() ?? 'New client';
    }
    return parts.join(' ');
}

export function buildClientPayload(contact: ContactRecord, clientNumber: string, nowIso: string): ClientPayload {
    return {
        id: crypto.randomUUID(),
        owner_user_id: contact.owner_user_id,
        first_name: contact.first_name,
        last_name: contact.last_name,
        email: contact.email,
        phone: contact.phone,
        notes: contact.notes,
        address: contact.address,
        city: contact.city,
        state: contact.state,
        business: contact.business,
        contact_id: contact.id,
        client_number: clientNumber,
        created_at: nowIso,
        updated_at: nowIso
    };
}
