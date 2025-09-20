import { getContactName } from '../types/contact';
import type { ContactRecord } from '../types/contact';

export type ContactStage = 'new' | 'warm' | 'hot';

export type ContactSummary = {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    stage: ContactStage;
    status: ContactRecord['status'];
    ownerId: string | null;
    business: string | null;
    createdAt: string | null;
    updatedAt: string | null;
};

export function deriveStage(status: ContactRecord['status'] | null | undefined): ContactStage {
    if (status === 'client') {
        return 'hot';
    }

    if (status === 'active') {
        return 'warm';
    }

    return 'new';
}

export function toContactSummary(contact: ContactRecord): ContactSummary {
    return {
        id: contact.id,
        name: getContactName(contact),
        email: contact.email,
        phone: contact.phone,
        stage: deriveStage(contact.status),
        status: contact.status ?? 'lead',
        ownerId: contact.owner_user_id,
        business: contact.business ?? null,
        createdAt: contact.created_at ?? null,
        updatedAt: contact.updated_at ?? null,
    };
}
