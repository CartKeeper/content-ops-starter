import { jsonResponse, parseJsonRequest } from '../_shared/response.ts';
import { createSupabaseClient } from '../_shared/supabase.ts';
import { createPortalForClient, type PortalTabs } from '../_shared/portal.ts';

const ALLOWED_METHODS = ['POST'];

type PortalRequest = {
    client_id?: string;
};

type PortalResponse = {
    message: string;
    portal_url: string;
    tabs: PortalTabs;
    client: Record<string, unknown>;
};

Deno.serve(async (request) => {
    if (!ALLOWED_METHODS.includes(request.method)) {
        return jsonResponse(
            { error: `Method ${request.method} Not Allowed` },
            { status: 405, headers: { Allow: ALLOWED_METHODS.join(', ') } }
        );
    }

    try {
        const { client_id: clientId } = await parseJsonRequest<PortalRequest>(request);

        if (!clientId || clientId.trim() === '') {
            return jsonResponse({ error: 'client_id is required' }, { status: 400 });
        }

        const supabase = createSupabaseClient();

        const { data: existingClient, error } = await supabase.from('clients').select('id').eq('id', clientId).maybeSingle();

        if (error) {
            throw new Error(error.message ?? 'Failed to verify client');
        }

        if (!existingClient) {
            return jsonResponse({ error: 'Client not found' }, { status: 404 });
        }

        const result = await createPortalForClient(supabase, clientId);

        const response: PortalResponse = {
            message: 'Portal created',
            portal_url: result.portalUrl,
            tabs: result.tabs,
            client: result.client
        };

        return jsonResponse(response, { status: 200 });
    } catch (error) {
        console.error('create_portal error', error);
        const message = error instanceof Error ? error.message : 'Unexpected error creating portal';
        return jsonResponse({ error: message }, { status: 500 });
    }
});
