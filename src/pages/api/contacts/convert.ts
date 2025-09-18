import type { NextApiRequest, NextApiResponse } from 'next';

import { readContactsFromDisk, writeContactsToDisk } from '../../../server/contacts/local-store';
import type { ContactRecord, ConvertContactResponse } from '../../../types/contact';
import { getContactName } from '../../../types/contact';
import { getSupabaseClient } from '../../../utils/supabase-client';

type ConvertResponse = {
    data?: unknown;
    error?: string;
};

type HandlerResult = { status: number; body: ConvertResponse };

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

function createPortalSlug(contact: ContactRecord): string {
    const base = getContactName(contact) || contact.business || contact.id;
    return base
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '')
        .replace(/-{2,}/g, '-')
        .slice(0, 64);
}

async function convertContactLocally(contactId: string): Promise<HandlerResult> {
    const contacts = await readContactsFromDisk();
    const index = contacts.findIndex((contact) => contact.id === contactId);

    if (index === -1) {
        return { status: 404, body: { error: 'Contact not found' } };
    }

    const [contact] = contacts.splice(index, 1);
    await writeContactsToDisk(contacts);

    const nowIso = new Date().toISOString();
    const slug = createPortalSlug(contact);
    const clientId = `local-client-${contact.id}`;

    const response: ConvertContactResponse = {
        message: `${getContactName(contact)} converted to a client (local mode)`,
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
            id: `local-gallery-${slug || contact.id}`,
            client_id: clientId,
            gallery_name: `${getContactName(contact)} Gallery`,
            gallery_url: null,
            status: 'draft',
            created_at: nowIso
        },
        billing_account: {
            id: `local-billing-${slug || contact.id}`,
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

    return { status: 200, body: { data: response } };
}

function parseContactId(body: unknown): string | null {
    if (!body || typeof body !== 'object') {
        return null;
    }

    const payload = body as Record<string, unknown>;
    const direct = payload.contactId ?? payload.contact_id;

    if (typeof direct === 'string') {
        const trimmed = direct.trim();
        return trimmed.length > 0 ? trimmed : null;
    }

    return null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ConvertResponse>) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

    const contactId = parseContactId(req.body);

    if (!contactId) {
        return res.status(400).json({ error: 'contactId is required' });
    }

    let supabase;

    try {
        supabase = getSupabaseClient();
    } catch (error) {
        console.warn('Supabase configuration unavailable for contact conversion. Using local store.', error);
    }

    if (!supabase) {
        const result = await convertContactLocally(contactId);
        return res.status(result.status).json(result.body);
    }

    const { data, error } = await supabase.functions.invoke('convert_contact_to_client', {
        body: { contact_id: contactId }
    });

    if (error) {
        const status = typeof error.status === 'number' ? error.status : error.message === 'Contact already a Client' ? 409 : 400;
        return res.status(status).json({ error: error.message ?? 'Failed to convert contact' });
    }

    if (!data) {
        return res.status(502).json({ error: 'Supabase function did not return a payload' });
    }

    return res.status(200).json({ data });
}
