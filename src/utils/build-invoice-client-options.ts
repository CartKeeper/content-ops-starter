import { clients as baseClients } from '../data/crm';
import type { InvoiceRecord } from '../types/invoice';

export type InvoiceClientOption = {
    id: string;
    name: string;
    email?: string;
    address?: string;
    defaultPackageIds?: string[];
    defaultItemIds?: string[];
};

export type InvoiceClientDirectoryEntry = {
    id?: string;
    name?: string;
    email?: string;
    address?: string;
    defaultPackageIds?: string[];
    defaultItemIds?: string[];
};

function createSlug(value: string): string {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
}

export function buildInvoiceClientOptions(
    invoices: InvoiceRecord[],
    directoryEntries: InvoiceClientDirectoryEntry[] = []
): InvoiceClientOption[] {
    const map = new Map<string, InvoiceClientOption>();

    baseClients.forEach((client) => {
        map.set(client.id, {
            id: client.id,
            name: client.name,
            email: client.email,
            address: undefined,
            defaultPackageIds: client.defaultPackageIds,
            defaultItemIds: client.defaultItemIds
        });
    });

    directoryEntries.forEach((entry) => {
        const name = entry.name?.trim();
        if (!name) {
            return;
        }

        const existingByName = Array.from(map.values()).find((option) => option.name === name);
        const resolvedId = entry.id?.trim() || existingByName?.id || `crm-${createSlug(name)}`;

        const existing = map.get(resolvedId) || existingByName;
        const normalized: InvoiceClientOption = {
            id: resolvedId,
            name,
            email: entry.email ?? existing?.email,
            address: entry.address ?? existing?.address,
            defaultPackageIds: entry.defaultPackageIds ?? existing?.defaultPackageIds,
            defaultItemIds: entry.defaultItemIds ?? existing?.defaultItemIds
        };

        map.set(resolvedId, normalized);
    });

    invoices.forEach((invoice) => {
        const name = invoice.client?.trim();
        if (!name) {
            return;
        }

        const existing = Array.from(map.values()).find((option) => option.name === name);
        if (existing) {
            return;
        }

        const slug = createSlug(name);
        map.set(`invoice-${slug}`, {
            id: `invoice-${slug}`,
            name,
            email: invoice.clientEmail,
            address: invoice.clientAddress,
            defaultPackageIds: [],
            defaultItemIds: []
        });
    });

    return Array.from(map.values()).sort((first, second) => first.name.localeCompare(second.name));
}
