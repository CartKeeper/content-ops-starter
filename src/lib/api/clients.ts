import slugify from 'slugify';

import { clients as legacyClients } from '../../data/crm';
import type { InvoiceStatus } from '../../types/invoice';
import { readCmsCollection } from '../../utils/read-cms-collection';

type CmsClient = {
    id?: string;
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    notes?: string;
    related_projects?: string[];
    owner?: string;
    defaultPackageIds?: string[];
    defaultItemIds?: string[];
};

type CmsInvoice = {
    id?: string;
    client?: string;
    amount?: number;
    due_date?: string;
    status?: string;
    pdf_url?: string;
    owner?: string;
};

export type ClientStatus = 'Active' | 'Lead' | 'Lost';

export type ClientTableRow = {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    status: ClientStatus;
    invoices: number;
    outstandingBalanceCents: number;
    lastActivityAt: string | null;
    lastShootAt: string | null;
    upcomingShootAt: string | null;
    portalUrl: string | null;
    tags: string[];
    owner: string | null;
    hasPortal: boolean;
};

export type ClientInvoiceSummary = {
    id: string;
    amountCents: number;
    dueDate: string | null;
    status: InvoiceStatus;
    pdfUrl: string | null;
    owner: string | null;
};

export type ClientProfile = ClientTableRow & {
    address: string | null;
    notes: string | null;
    relatedProjects: string[];
    defaultPackageIds: string[];
    defaultItemIds: string[];
    invoicesHistory: ClientInvoiceSummary[];
};

export type ClientDashboardData = {
    rows: ClientTableRow[];
    profiles: Record<string, ClientProfile>;
};

const PACKAGE_LABELS: Record<string, string> = {
    'pkg-brand-launch': 'Brand Launch',
    'pkg-retainer-lite': 'Content Retainer'
};

const ITEM_LABELS: Record<string, string> = {
    'svc-creative-direction': 'Creative Direction',
    'svc-retouching-batch': 'Retouching',
    'svc-social-cutdowns': 'Social Deliverables',
    'svc-monthly-retainer': 'Monthly Retainer'
};

const STATUS_NORMALISATION: Record<string, ClientStatus> = {
    active: 'Active',
    lead: 'Lead',
    lost: 'Lost'
};

const INVOICE_STATUS_MAP: Record<string, InvoiceStatus> = {
    Draft: 'Draft',
    draft: 'Draft',
    Sent: 'Sent',
    sent: 'Sent',
    Paid: 'Paid',
    paid: 'Paid',
    Overdue: 'Overdue',
    overdue: 'Overdue'
};

function createSlug(value: string): string {
    return slugify(value, { lower: true, strict: true });
}

function normaliseStatus(value: string | undefined): ClientStatus {
    if (!value) {
        return 'Lead';
    }

    return STATUS_NORMALISATION[value.toLowerCase()] ?? 'Lead';
}

function parseInvoiceStatus(value: string | undefined): InvoiceStatus {
    if (!value) {
        return 'Draft';
    }

    return INVOICE_STATUS_MAP[value] ?? INVOICE_STATUS_MAP[value.toLowerCase()] ?? 'Draft';
}

export async function loadClientDashboardData(): Promise<ClientDashboardData> {
    const [cmsClients, cmsInvoices] = await Promise.all([
        readCmsCollection<CmsClient>('crm-clients.json'),
        readCmsCollection<CmsInvoice>('crm-invoices.json')
    ]);

    const cmsClientsByName = new Map<string, CmsClient>();
    cmsClients.forEach((client) => {
        if (!client?.name) {
            return;
        }
        cmsClientsByName.set(client.name.trim().toLowerCase(), client);
    });

    type InternalClient = ClientProfile & { invoicesAccumulator: ClientInvoiceSummary[] };

    const clientsByName = new Map<string, InternalClient>();

    legacyClients.forEach((client) => {
        const nameKey = client.name.trim().toLowerCase();
        const cms = cmsClientsByName.get(nameKey);

        const tags = new Set<string>();
        client.defaultPackageIds?.forEach((id) => {
            const label = PACKAGE_LABELS[id];
            if (label) {
                tags.add(label);
            }
        });
        client.defaultItemIds?.forEach((id) => {
            const label = ITEM_LABELS[id];
            if (label) {
                tags.add(label);
            }
        });

        const slug = createSlug(client.name);
        const portalUrl = `/portal/${slug}`;

        clientsByName.set(nameKey, {
            id: cms?.id ?? client.id ?? slug,
            name: client.name,
            email: cms?.email ?? client.email ?? null,
            phone: cms?.phone ?? client.phone ?? null,
            status: normaliseStatus(client.status),
            invoices: 0,
            outstandingBalanceCents: 0,
            lastActivityAt: null,
            lastShootAt: client.lastShoot ?? null,
            upcomingShootAt: client.upcomingShoot ?? null,
            portalUrl,
            tags: Array.from(tags),
            owner: cms?.owner ?? client.ownerName ?? null,
            hasPortal: true,
            address: cms?.address ?? null,
            notes: cms?.notes ?? null,
            relatedProjects: Array.isArray(cms?.related_projects) ? cms?.related_projects ?? [] : [],
            defaultPackageIds: cms?.defaultPackageIds ?? client.defaultPackageIds ?? [],
            defaultItemIds: cms?.defaultItemIds ?? client.defaultItemIds ?? [],
            invoicesHistory: [],
            invoicesAccumulator: []
        });
    });

    cmsClients.forEach((client) => {
        if (!client?.name) {
            return;
        }
        const key = client.name.trim().toLowerCase();
        if (clientsByName.has(key)) {
            return;
        }

        const slug = createSlug(client.name);
        const tags = new Set<string>();
        client.defaultPackageIds?.forEach((id) => {
            const label = PACKAGE_LABELS[id];
            if (label) {
                tags.add(label);
            }
        });
        client.defaultItemIds?.forEach((id) => {
            const label = ITEM_LABELS[id];
            if (label) {
                tags.add(label);
            }
        });

        clientsByName.set(key, {
            id: client.id ?? slug,
            name: client.name,
            email: client.email ?? null,
            phone: client.phone ?? null,
            status: 'Lead',
            invoices: 0,
            outstandingBalanceCents: 0,
            lastActivityAt: null,
            lastShootAt: null,
            upcomingShootAt: null,
            portalUrl: `/portal/${slug}`,
            tags: Array.from(tags),
            owner: client.owner ?? null,
            hasPortal: false,
            address: client.address ?? null,
            notes: client.notes ?? null,
            relatedProjects: Array.isArray(client.related_projects) ? client.related_projects ?? [] : [],
            defaultPackageIds: client.defaultPackageIds ?? [],
            defaultItemIds: client.defaultItemIds ?? [],
            invoicesHistory: [],
            invoicesAccumulator: []
        });
    });

    cmsInvoices.forEach((invoice, index) => {
        if (!invoice?.client) {
            return;
        }

        const key = invoice.client.trim().toLowerCase();
        if (!clientsByName.has(key)) {
            const slug = createSlug(invoice.client);
            clientsByName.set(key, {
                id: invoice.id ?? slug,
                name: invoice.client,
                email: null,
                phone: null,
                status: 'Lead',
                invoices: 0,
                outstandingBalanceCents: 0,
                lastActivityAt: null,
                lastShootAt: null,
                upcomingShootAt: null,
                portalUrl: `/portal/${slug}`,
                tags: [],
                owner: invoice.owner ?? null,
                hasPortal: false,
                address: null,
                notes: null,
                relatedProjects: [],
                defaultPackageIds: [],
                defaultItemIds: [],
                invoicesHistory: [],
                invoicesAccumulator: []
            });
        }

        const entry = clientsByName.get(key)!;
        const amountCents = Math.round((invoice.amount ?? 0) * 100);
        const dueDate = invoice.due_date ?? null;
        const status = parseInvoiceStatus(invoice.status);

        entry.invoices += 1;
        if (status !== 'Paid') {
            entry.outstandingBalanceCents += amountCents;
        }

        if (!entry.lastActivityAt || (dueDate && entry.lastActivityAt < dueDate)) {
            entry.lastActivityAt = dueDate;
        }

        entry.invoicesAccumulator.push({
            id: invoice.id ?? `${entry.id}-${index}`,
            amountCents,
            dueDate,
            status,
            pdfUrl: invoice.pdf_url ?? null,
            owner: invoice.owner ?? null
        });
    });

    const profiles: Record<string, ClientProfile> = {};

    const rows: ClientTableRow[] = Array.from(clientsByName.values())
        .map((entry) => {
            const invoicesHistory = [...entry.invoicesAccumulator]
                .sort((a, b) => {
                    if (!a.dueDate) return 1;
                    if (!b.dueDate) return -1;
                    return a.dueDate < b.dueDate ? 1 : -1;
                });

            const lastInvoiceDue = invoicesHistory[0]?.dueDate ?? null;
            const lastActivityAt = entry.lastActivityAt || lastInvoiceDue || entry.lastShootAt;

            const { invoicesAccumulator: _accumulator, ...rest } = entry;

            const profile: ClientProfile = {
                ...rest,
                lastActivityAt,
                invoicesHistory
            };

            profiles[profile.id] = profile;

            return {
                id: profile.id,
                name: profile.name,
                email: profile.email,
                phone: profile.phone,
                status: profile.status,
                invoices: profile.invoices,
                outstandingBalanceCents: profile.outstandingBalanceCents,
                lastActivityAt: profile.lastActivityAt,
                lastShootAt: profile.lastShootAt,
                upcomingShootAt: profile.upcomingShootAt,
                portalUrl: profile.portalUrl,
                tags: profile.tags,
                owner: profile.owner,
                hasPortal: profile.hasPortal
            } satisfies ClientTableRow;
        })
        .sort((a, b) => a.name.localeCompare(b.name));

    return { rows, profiles };
}

