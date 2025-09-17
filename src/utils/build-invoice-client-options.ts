import { clients as baseClients } from '../data/crm';
import type { InvoiceRecord } from '../types/invoice';

export type InvoiceClientOption = {
    id: string;
    name: string;
    email?: string;
    address?: string;
};

function createSlug(value: string): string {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
}

export function buildInvoiceClientOptions(invoices: InvoiceRecord[]): InvoiceClientOption[] {
    const map = new Map<string, InvoiceClientOption>();

    baseClients.forEach((client) => {
        map.set(client.id, {
            id: client.id,
            name: client.name,
            email: client.email,
            address: undefined
        });
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
            address: invoice.clientAddress
        });
    });

    return Array.from(map.values()).sort((first, second) => first.name.localeCompare(second.name));
}
