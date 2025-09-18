export type InvoiceStatus = 'Draft' | 'Sent' | 'Paid' | 'Overdue';

export type InvoiceTemplateId = 'classic' | 'minimal' | 'branded';

export type InvoiceLineItem = {
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
};

export type InvoiceCatalogItem = {
    id: string;
    name: string;
    description: string;
    defaultQuantity: number;
    quantityPresets?: number[];
    unitPrice: number;
    unitLabel?: string;
    tags?: string[];
};

export type InvoicePackageItemOverride = {
    catalogItemId: string;
    description?: string;
    quantity?: number;
    unitPrice?: number;
};

export type InvoicePackage = {
    id: string;
    name: string;
    description?: string;
    itemIds: string[];
    overrides?: InvoicePackageItemOverride[];
    lineItems: InvoiceLineItem[];
    notes?: string;
};

export type InvoiceTotals = {
    subtotal: number;
    taxTotal: number;
    total: number;
};

export type InvoiceRecord = {
    id: string;
    client: string;
    clientEmail?: string;
    clientAddress?: string;
    project: string;
    issueDate: string;
    dueDate: string;
    status: InvoiceStatus;
    currency: string;
    amount: number;
    taxRate: number;
    lineItems: InvoiceLineItem[];
    totals: InvoiceTotals;
    notes?: string;
    pdfUrl?: string;
    template: InvoiceTemplateId;
    paymentLink?: string;
    lastSentAt?: string;
    customFields?: Record<string, string | boolean>;
    ownerId?: string;
    ownerName?: string;
};

export const DEFAULT_INVOICE_CURRENCY = 'USD';
