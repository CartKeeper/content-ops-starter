import { jsonResponse, parseJsonRequest } from '../_shared/response.ts';
import { createSupabaseClient } from '../_shared/supabase.ts';
import { buildClientPayload, deriveClientName, generateNextClientNumber, type ContactRecord } from '../_shared/clients.ts';
import { createPortalForClient, type PortalTabs } from '../_shared/portal.ts';

const ALLOWED_METHODS = ['POST'];

type ConvertRequest = {
    contact_id?: string;
};

type ConvertResponse = {
    message: string;
    client: Record<string, unknown>;
    gallery: Record<string, unknown> | null;
    billing_account: Record<string, unknown> | null;
    portal: {
        url: string;
        tabs: PortalTabs;
    };
};

async function resolveContact(supabase: ReturnType<typeof createSupabaseClient>, contactId: string) {
    const { data, error } = await supabase.from('contacts').select('*').eq('id', contactId).maybeSingle();

    if (error) {
        throw new Error(error.message ?? 'Unable to load contact');
    }

    if (!data) {
        const notFound = new Error('Contact not found');
        notFound.name = 'NotFoundError';
        throw notFound;
    }

    return data as ContactRecord;
}

async function ensureClientDoesNotExist(
    supabase: ReturnType<typeof createSupabaseClient>,
    contact: ContactRecord
): Promise<void> {
    if (contact.id) {
        const { data, error } = await supabase
            .from('clients')
            .select('id')
            .eq('contact_id', contact.id)
            .limit(1)
            .maybeSingle();

        if (error && error.code !== 'PGRST116') {
            throw new Error(error.message ?? 'Unable to check existing client by contact');
        }

        if (data) {
            const duplicate = new Error('Contact already a Client');
            duplicate.name = 'DuplicateClientError';
            throw duplicate;
        }
    }

    if (contact.email) {
        const trimmedEmail = contact.email.trim();
        const normalizedEmail = trimmedEmail.toLowerCase();
        const { data, error } = await supabase
            .from('clients')
            .select('id')
            .or(`email.eq.${trimmedEmail},email.eq.${normalizedEmail}`)
            .limit(1)
            .maybeSingle();

        if (error && error.code !== 'PGRST116') {
            throw new Error(error.message ?? 'Unable to check existing client by email');
        }

        if (data) {
            const duplicate = new Error('Contact already a Client');
            duplicate.name = 'DuplicateClientError';
            throw duplicate;
        }
    }
}

async function createClientResources(
    supabase: ReturnType<typeof createSupabaseClient>,
    contact: ContactRecord,
    nowIso: string
) {
    const clientNumber = await generateNextClientNumber(supabase, new Date(nowIso));
    const clientPayload = buildClientPayload(contact, clientNumber, nowIso);

    const { data: createdClient, error: clientError } = await supabase.from('clients').insert(clientPayload).select('*').maybeSingle();

    if (clientError) {
        throw new Error(clientError.message ?? 'Failed to create client record');
    }

    if (!createdClient) {
        throw new Error('Client record was not returned after insert');
    }

    const clientName = deriveClientName(contact);

    const { data: createdGallery, error: galleryError } = await supabase
        .from('galleries')
        .insert({
            id: crypto.randomUUID(),
            client_id: clientPayload.id,
            gallery_name: `${clientName} Gallery`,
            gallery_url: null,
            status: 'draft',
            created_at: nowIso
        })
        .select('*')
        .maybeSingle();

    if (galleryError) {
        throw new Error(galleryError.message ?? 'Failed to create gallery record');
    }

    const { data: billingAccount, error: billingError } = await supabase
        .from('billing_accounts')
        .insert({
            id: crypto.randomUUID(),
            client_id: clientPayload.id,
            payment_terms: 'Due on receipt',
            invoice_history: [],
            created_at: nowIso
        })
        .select('*')
        .maybeSingle();

    if (billingError) {
        throw new Error(billingError.message ?? 'Failed to create billing account');
    }

    const { data: linkedClient, error: linkError } = await supabase
        .from('clients')
        .update({
            gallery_id: createdGallery?.id ?? null,
            billing_id: billingAccount?.id ?? null,
            updated_at: nowIso
        })
        .eq('id', clientPayload.id)
        .select('*')
        .maybeSingle();

    if (linkError) {
        throw new Error(linkError.message ?? 'Failed to link client relationships');
    }

    return { client: linkedClient ?? createdClient, gallery: createdGallery, billingAccount };
}

Deno.serve(async (request) => {
    if (!ALLOWED_METHODS.includes(request.method)) {
        return jsonResponse(
            { error: `Method ${request.method} Not Allowed` },
            { status: 405, headers: { Allow: ALLOWED_METHODS.join(', ') } }
        );
    }

    try {
        const { contact_id: contactId } = await parseJsonRequest<ConvertRequest>(request);

        if (!contactId || contactId.trim() === '') {
            return jsonResponse({ error: 'contact_id is required' }, { status: 400 });
        }

        const supabase = createSupabaseClient();
        const nowIso = new Date().toISOString();

        const contact = await resolveContact(supabase, contactId);
        await ensureClientDoesNotExist(supabase, contact);

        const { client, gallery, billingAccount } = await createClientResources(supabase, contact, nowIso);
        const portal = await createPortalForClient(supabase, client.id as string, nowIso);

        const response: ConvertResponse = {
            message: 'Client successfully created from contact',
            client: portal.client,
            gallery: gallery ?? null,
            billing_account: billingAccount ?? null,
            portal: { url: portal.portalUrl, tabs: portal.tabs }
        };

        return jsonResponse(response, { status: 201 });
    } catch (error) {
        console.error('convert_contact_to_client error', error);
        const message = error instanceof Error ? error.message : 'Unexpected error converting contact';

        if (error instanceof Error) {
            if (error.name === 'NotFoundError') {
                return jsonResponse({ error: message }, { status: 404 });
            }

            if (error.name === 'DuplicateClientError') {
                return jsonResponse({ error: message }, { status: 409 });
            }
        }

        return jsonResponse({ error: message }, { status: 500 });
    }
});
