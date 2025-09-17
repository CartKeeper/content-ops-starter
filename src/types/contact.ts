export type ContactRecord = {
    id: string;
    owner_user_id: string | null;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    notes: string | null;
    created_at: string | null;
    updated_at: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    business: string | null;
};

export type ConvertContactResponse = {
    message: string;
    client: Record<string, unknown>;
    gallery: Record<string, unknown> | null;
    billing_account: Record<string, unknown> | null;
    portal: {
        url: string;
        tabs: Array<{
            id: 'gallery' | 'billing' | 'invoices' | 'calendar';
            label: string;
            description: string;
        }>;
    };
};

export function getContactName(contact: ContactRecord): string {
    const parts = [contact.first_name?.trim(), contact.last_name?.trim()].filter((value): value is string => Boolean(value));
    if (parts.length === 0) {
        return contact.business?.trim() ?? 'New contact';
    }
    return parts.join(' ');
}

export function getContactInitials(contact: ContactRecord): string {
    const parts = [contact.first_name, contact.last_name]
        .map((value) => (typeof value === 'string' && value.trim().length > 0 ? value.trim()[0]?.toUpperCase() : null))
        .filter((value): value is string => Boolean(value));

    if (parts.length === 0 && contact.business) {
        return contact.business.trim().slice(0, 2).toUpperCase();
    }

    return parts.slice(0, 2).join('') || 'C';
}
