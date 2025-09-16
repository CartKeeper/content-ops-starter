import type { NextApiRequest, NextApiResponse } from 'next';
import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import dayjs from 'dayjs';

import {
    DEFAULT_INVOICE_CURRENCY,
    type InvoiceLineItem,
    type InvoiceRecord,
    type InvoiceStatus,
    type InvoiceTemplateId
} from '../../../types/invoice';
import { generateInvoicePdf } from '../../../server/invoices/generator';
import { sendInvoiceEmail, type InvoiceEmailResult } from '../../../server/invoices/mailer';
import { createStripePaymentLink } from '../../../server/invoices/stripe';

type ResourceKey = 'bookings' | 'invoices' | 'galleries';

type ResourceConfig = {
    file: string;
    type: string;
};

const RESOURCE_CONFIG: Record<ResourceKey, ResourceConfig> = {
    bookings: { file: 'crm-bookings.json', type: 'CrmBookings' },
    invoices: { file: 'crm-invoices.json', type: 'CrmInvoices' },
    galleries: { file: 'crm-galleries.json', type: 'CrmGalleries' }
};

const DATA_DIRECTORY = path.join(process.cwd(), 'content', 'data');

const INVOICE_STATUSES: InvoiceStatus[] = ['Draft', 'Sent', 'Paid', 'Overdue'];
const INVOICE_TEMPLATES: InvoiceTemplateId[] = ['classic', 'minimal', 'branded'];

type NormalizedInvoiceResult = {
    invoice: InvoiceRecord;
    sendEmail: boolean;
    generatePaymentLink: boolean;
};

async function readRecords<T>(config: ResourceConfig): Promise<T[]> {
    const filePath = path.join(DATA_DIRECTORY, config.file);

    try {
        const raw = await fs.readFile(filePath, 'utf-8');
        const parsed = JSON.parse(raw) as { items?: T[] } | T[];

        if (Array.isArray(parsed)) {
            return parsed as T[];
        }

        if (parsed && Array.isArray(parsed.items)) {
            return parsed.items as T[];
        }
    } catch (error) {
        // If the file doesn't exist yet we'll create it on write
    }

    return [];
}

async function writeRecords<T>(config: ResourceConfig, records: T[]): Promise<void> {
    const filePath = path.join(DATA_DIRECTORY, config.file);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    const payload = JSON.stringify({ type: config.type, items: records }, null, 4);
    await fs.writeFile(filePath, `${payload}\n`, 'utf-8');
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseString(value: unknown, fallback: string): string {
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed) {
            return trimmed;
        }
    }
    return fallback;
}

function parseDateValue(value: unknown, fallback: string): string {
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed && dayjs(trimmed).isValid()) {
            return trimmed;
        }
    }
    return fallback;
}

function parseNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === 'string') {
        const cleaned = value.replace(/[^0-9.,-]/g, '').replace(/,/g, '.');
        if (!cleaned) {
            return null;
        }
        const parsed = Number.parseFloat(cleaned);
        return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
}

function parseBoolean(value: unknown, defaultValue: boolean): boolean {
    if (typeof value === 'boolean') {
        return value;
    }

    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (normalized === 'true') {
            return true;
        }
        if (normalized === 'false') {
            return false;
        }
    }

    return defaultValue;
}

function roundTo(value: number, precision = 2): number {
    const factor = 10 ** precision;
    return Math.round((value + Number.EPSILON) * factor) / factor;
}

function normalizeInvoiceLineItems(value: unknown, fallbackDescription: string): InvoiceLineItem[] {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .map((item, index) => {
            if (!isPlainObject(item)) {
                return null;
            }

            const description = parseString(item.description, `${fallbackDescription} ${index + 1}`);
            const quantityValue = parseNumber(item.quantity);
            const totalValue = parseNumber(item.total);
            const unitPriceValue = parseNumber(item.unitPrice);

            const quantity = quantityValue !== null && quantityValue > 0 ? quantityValue : 1;

            let total = totalValue !== null && totalValue > 0 ? totalValue : null;
            let unitPrice = unitPriceValue !== null && unitPriceValue > 0 ? unitPriceValue : null;

            if (total === null && unitPrice !== null) {
                total = unitPrice * quantity;
            } else if (total !== null && unitPrice === null) {
                unitPrice = total / quantity;
            } else if (total === null && unitPrice === null) {
                return null;
            }

            const roundedQuantity = roundTo(quantity, 3);
            const roundedUnitPrice = roundTo(unitPrice ?? 0);
            const roundedTotal = roundTo(total ?? roundedUnitPrice * roundedQuantity);

            if (roundedTotal <= 0) {
                return null;
            }

            const id =
                typeof item.id === 'string' && item.id.trim() ? item.id.trim() : `item-${index + 1}`;

            return {
                id,
                description,
                quantity: roundedQuantity,
                unitPrice: roundedUnitPrice,
                total: roundedTotal
            } satisfies InvoiceLineItem;
        })
        .filter((item): item is InvoiceLineItem => Boolean(item));
}

function sanitizeCustomFields(value: unknown): Record<string, string | boolean> | undefined {
    if (!isPlainObject(value)) {
        return undefined;
    }

    const result: Record<string, string | boolean> = {};

    Object.entries(value).forEach(([key, entry]) => {
        if (typeof entry === 'string') {
            result[key] = entry;
        } else if (typeof entry === 'boolean') {
            result[key] = entry;
        }
    });

    return Object.keys(result).length > 0 ? result : undefined;
}

function normalizeInvoiceRecord(payload: Record<string, unknown>): NormalizedInvoiceResult {
    const id = parseString(payload.id, randomUUID());
    const client = parseString(payload.client, 'New client');
    const project = parseString(payload.project, 'New project');
    const issueDate = parseDateValue(payload.issueDate, dayjs().format('YYYY-MM-DD'));
    const dueDate = parseDateValue(payload.dueDate, dayjs(issueDate).add(30, 'day').format('YYYY-MM-DD'));
    const status =
        typeof payload.status === 'string' && INVOICE_STATUSES.includes(payload.status as InvoiceStatus)
            ? (payload.status as InvoiceStatus)
            : 'Sent';
    const template =
        typeof payload.template === 'string' && INVOICE_TEMPLATES.includes(payload.template as InvoiceTemplateId)
            ? (payload.template as InvoiceTemplateId)
            : 'classic';

    let currency = parseString(payload.currency, DEFAULT_INVOICE_CURRENCY).toUpperCase();
    if (currency.length !== 3) {
        currency = DEFAULT_INVOICE_CURRENCY;
    }

    let taxRate = parseNumber(payload.taxRate) ?? 0;
    if (taxRate > 1) {
        taxRate = taxRate / 100;
    }
    taxRate = roundTo(taxRate, 4);

    const lineItems = normalizeInvoiceLineItems(payload.lineItems, project);

    if (lineItems.length === 0) {
        const fallbackAmount = parseNumber(payload.amount) ?? 0;
        if (fallbackAmount > 0) {
            lineItems.push({
                id: 'item-1',
                description: project,
                quantity: 1,
                unitPrice: roundTo(fallbackAmount),
                total: roundTo(fallbackAmount)
            });
        }
    }

    const subtotal = roundTo(lineItems.reduce((total, item) => total + item.total, 0));
    const taxTotal = roundTo(subtotal * taxRate);
    const total = roundTo(subtotal + taxTotal);
    const amount = total;

    const customFields = sanitizeCustomFields(payload.customFields);
    const sendEmail = parseBoolean(payload.sendEmail, true);
    const generatePaymentLink = parseBoolean(payload.generatePaymentLink, true);
    const paymentLink =
        typeof payload.paymentLink === 'string' && payload.paymentLink.trim() ? payload.paymentLink.trim() : undefined;
    const notes = typeof payload.notes === 'string' && payload.notes.trim() ? payload.notes.trim() : undefined;
    const clientEmail =
        typeof payload.clientEmail === 'string' && payload.clientEmail.trim() ? payload.clientEmail.trim() : undefined;
    const clientAddress =
        typeof payload.clientAddress === 'string' && payload.clientAddress.trim()
            ? payload.clientAddress.trim()
            : undefined;
    const pdfUrl = typeof payload.pdfUrl === 'string' && payload.pdfUrl.trim() ? payload.pdfUrl.trim() : undefined;
    const lastSentAt =
        typeof payload.lastSentAt === 'string' && payload.lastSentAt.trim() ? payload.lastSentAt.trim() : undefined;

    const invoice: InvoiceRecord = {
        id,
        client,
        clientEmail,
        clientAddress,
        project,
        issueDate,
        dueDate,
        status,
        currency,
        amount,
        taxRate,
        lineItems,
        totals: {
            subtotal,
            taxTotal,
            total
        },
        notes,
        pdfUrl,
        template,
        paymentLink,
        lastSentAt,
        customFields
    };

    return { invoice, sendEmail, generatePaymentLink };
}

function parseRequestId(req: NextApiRequest): string | null {
    const { id } = req.query;

    if (Array.isArray(id)) {
        return typeof id[0] === 'string' ? id[0] : null;
    }

    if (typeof id === 'string' && id.trim()) {
        return id.trim();
    }

    return null;
}

function applyInvoiceUpdate(existing: InvoiceRecord, payload: Record<string, unknown>): InvoiceRecord {
    const next: InvoiceRecord = { ...existing };

    if (typeof payload.status === 'string' && INVOICE_STATUSES.includes(payload.status as InvoiceStatus)) {
        next.status = payload.status as InvoiceStatus;
    }

    if (typeof payload.notes === 'string') {
        const trimmed = payload.notes.trim();
        next.notes = trimmed || undefined;
    }

    if (typeof payload.paymentLink === 'string') {
        const trimmed = payload.paymentLink.trim();
        next.paymentLink = trimmed || existing.paymentLink;
    } else if (payload.paymentLink === null) {
        next.paymentLink = undefined;
    }

    if (typeof payload.lastSentAt === 'string') {
        const trimmed = payload.lastSentAt.trim();
        next.lastSentAt = trimmed || existing.lastSentAt;
    }

    return next;
}

function parseResourceKey(value: string | string[] | undefined): ResourceKey | null {
    if (!value) {
        return null;
    }

    const key = Array.isArray(value) ? value[0] : value;

    if (key === 'bookings' || key === 'invoices' || key === 'galleries') {
        return key;
    }

    return null;
}

function ensureRecordId(resource: ResourceKey, records: Array<{ id?: unknown }>, payload: Record<string, unknown>) {
    if (typeof payload.id === 'string' && payload.id.trim() !== '') {
        return payload;
    }

    const result: Record<string, unknown> = { ...payload };

    if (resource === 'invoices') {
        const numericIds = records
            .map((record) => {
                const idValue = record.id;
                if (typeof idValue === 'string') {
                    const parsed = Number.parseInt(idValue, 10);
                    return Number.isFinite(parsed) ? parsed : null;
                }
                if (typeof idValue === 'number' && Number.isFinite(idValue)) {
                    return idValue;
                }
                return null;
            })
            .filter((value): value is number => value !== null);

        const nextId = numericIds.length > 0 ? Math.max(...numericIds) + 1 : 1000;
        result.id = String(nextId);
        return result;
    }

    const prefix = resource === 'bookings' ? 'bk' : 'gal';
    result.id = `${prefix}-${randomUUID().slice(0, 8)}`;
    return result;
}

function parsePayload(body: NextApiRequest['body']): Record<string, unknown> | null {
    if (!body) {
        return null;
    }

    if (typeof body === 'object') {
        return body as Record<string, unknown>;
    }

    if (typeof body === 'string') {
        try {
            const parsed = JSON.parse(body);
            return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : null;
        } catch (error) {
            return null;
        }
    }

    return null;
}

async function handleGet(req: NextApiRequest, res: NextApiResponse, config: ResourceConfig) {
    const records = await readRecords(config);
    return res.status(200).json({ data: records });
}

async function handlePost(
    req: NextApiRequest,
    res: NextApiResponse,
    resourceKey: ResourceKey,
    config: ResourceConfig
) {
    const payload = parsePayload(req.body);

    if (!payload) {
        return res.status(400).json({ error: 'Request body must be a JSON object.' });
    }

    if (resourceKey === 'invoices') {
        const invoices = await readRecords<InvoiceRecord>(config);
        const recordWithId = ensureRecordId(resourceKey, invoices, payload);
        const { invoice, sendEmail, generatePaymentLink } = normalizeInvoiceRecord(recordWithId);

        if (!invoice.template) {
            invoice.template = 'classic';
        }

        if (generatePaymentLink && !invoice.paymentLink && invoice.amount > 0) {
            const paymentLink = await createStripePaymentLink(invoice);
            if (paymentLink) {
                invoice.paymentLink = paymentLink;
            }
        }

        const generated = await generateInvoicePdf(invoice);
        invoice.pdfUrl = generated.publicUrl;

        let emailResult: InvoiceEmailResult | null = null;
        if (sendEmail) {
            emailResult = await sendInvoiceEmail(invoice, generated.publicUrl);
            if (emailResult.sent) {
                invoice.lastSentAt = new Date().toISOString();
            }
        }

        invoices.push(invoice);
        await writeRecords(config, invoices);

        return res.status(201).json({ data: invoice, meta: { email: emailResult, pdf: generated } });
    }

    const records = await readRecords<Record<string, unknown>>(config);
    const recordWithId = ensureRecordId(resourceKey, records, payload);
    records.push(recordWithId);
    await writeRecords(config, records);

    return res.status(201).json({ data: recordWithId });
}

async function handlePut(
    req: NextApiRequest,
    res: NextApiResponse,
    resourceKey: ResourceKey,
    config: ResourceConfig
) {
    const payload = parsePayload(req.body) ?? {};
    const id = parseRequestId(req);

    if (!id) {
        return res.status(400).json({ error: 'An id query parameter is required to update a record.' });
    }

    if (resourceKey === 'invoices') {
        const invoices = await readRecords<InvoiceRecord>(config);
        const index = invoices.findIndex((invoice) => invoice.id === id);

        if (index === -1) {
            return res.status(404).json({ error: 'Invoice not found.' });
        }

        const updated = applyInvoiceUpdate(invoices[index], payload);
        invoices[index] = updated;
        await writeRecords(config, invoices);

        return res.status(200).json({ data: updated });
    }

    const records = await readRecords<Record<string, unknown>>(config);
    const index = records.findIndex((record) => {
        const recordId = typeof record.id === 'string' ? record.id : typeof record.id === 'number' ? String(record.id) : null;
        return recordId === id;
    });

    if (index === -1) {
        return res.status(404).json({ error: 'Record not found.' });
    }

    records[index] = { ...records[index], ...payload };
    await writeRecords(config, records);

    return res.status(200).json({ data: records[index] });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const resourceKey = parseResourceKey(req.query.resource);

    if (!resourceKey) {
        return res.status(404).json({ error: 'Unknown CRM resource.' });
    }

    const config = RESOURCE_CONFIG[resourceKey];

    try {
        switch (req.method) {
            case 'GET':
                return await handleGet(req, res, config);
            case 'POST':
                return await handlePost(req, res, resourceKey, config);
            case 'PUT':
                return await handlePut(req, res, resourceKey, config);
            default:
                res.setHeader('Allow', ['GET', 'POST', 'PUT']);
                return res.status(405).json({ error: `Method ${req.method} not allowed.` });
        }
    } catch (error) {
        console.error('CRM resource handler error', error);
        return res.status(500).json({ error: 'Unexpected server error.' });
    }
}

