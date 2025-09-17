import type { DatabaseClient } from './supabase.ts';

declare const Deno: {
    env: {
        get(key: string): string | undefined;
    };
};

export type PortalTabs = Array<{
    id: 'gallery' | 'billing' | 'invoices' | 'calendar';
    label: string;
    description: string;
}>;

const DEFAULT_TABS: PortalTabs = [
    { id: 'gallery', label: 'Gallery', description: 'Deliver photo sets and share curated collections.' },
    { id: 'billing', label: 'Billing', description: 'Manage payment preferences and on-file details.' },
    { id: 'invoices', label: 'Invoices', description: 'Review past invoices and payment receipts.' },
    { id: 'calendar', label: 'Calendar', description: 'Track upcoming sessions, deadlines, and reminders.' }
];

const DEFAULT_PORTAL_BASE_URL = 'https://codexapp.com/portal';

export type PortalResult = {
    portalUrl: string;
    tabs: PortalTabs;
    client: Record<string, unknown>;
};

export async function createPortalForClient(
    supabase: DatabaseClient,
    clientId: string,
    nowIso = new Date().toISOString()
): Promise<PortalResult> {
    const configuredBaseUrl = Deno.env.get('CLIENT_PORTAL_BASE_URL');
    const baseUrl = (configuredBaseUrl ?? DEFAULT_PORTAL_BASE_URL).replace(/\/$/, '');
    const portalUrl = `${baseUrl}/${clientId}`;

    const { data: updatedClient, error } = await supabase
        .from('clients')
        .update({ portal_url: portalUrl, updated_at: nowIso })
        .eq('id', clientId)
        .select('*')
        .maybeSingle();

    if (error) {
        throw new Error(error.message ?? 'Failed to update client with portal URL');
    }

    if (!updatedClient) {
        throw new Error('Client not found while assigning portal URL');
    }

    return { portalUrl, tabs: DEFAULT_TABS, client: updatedClient };
}
