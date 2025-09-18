import type { NextApiRequest, NextApiResponse } from 'next';
import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import dayjs from 'dayjs';

import {
    DEFAULT_INVOICE_CURRENCY,
    type InvoiceCatalogItem,
    type InvoiceLineItem,
    type InvoicePackage,
    type InvoicePackageItemOverride,
    type InvoiceRecord,
    type InvoiceStatus,
    type InvoiceTemplateId
} from '../../../types/invoice';
import type { GalleryRecord, GalleryStatus } from '../../../data/crm';
import { generateInvoicePdf } from '../../../server/invoices/generator';
import { sendInvoiceEmail, type InvoiceEmailResult } from '../../../server/invoices/mailer';
import { createStripePaymentLink } from '../../../server/invoices/stripe';

type ResourceKey =
    | 'bookings'
    | 'clients'
    | 'galleries'
    | 'invoices'
    | 'invoice-items'
    | 'invoice-packages';

type ResourceConfig = {
    file: string;
    type: string;
};

const RESOURCE_CONFIG: Record<ResourceKey, ResourceConfig> = {
    bookings: { file: 'crm-bookings.json', type: 'CrmBookings' },
    clients: { file: 'crm-clients.json', type: 'CrmClients' },
    galleries: { file: 'crm-galleries.json', type: 'CrmGalleries' },
    invoices: { file: 'crm-invoices.json', type: 'CrmInvoices' },
    'invoice-items': { file: 'crm-invoice-items.json', type: 'CrmInvoiceItems' },
    'invoice-packages': { file: 'crm-invoice-packages.json', type: 'CrmInvoicePackages' }
};

const DATA_DIRECTORY = path.join(process.cwd(), 'content', 'data');

const INVOICE_STATUSES: InvoiceStatus[] = ['Draft', 'Sent', 'Paid', 'Overdue'];
const GALLERY_STATUSES: GalleryStatus[] = ['Delivered', 'Pending'];
const INVOICE_TEMPLATES: InvoiceTemplateId[] = ['classic', 'minimal', 'branded'];

type CrmClientDirectoryRecord = {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    notes?: string;
    related_projects?: string[];
    owner?: string;
    defaultPackageIds?: string[];
    defaultItemIds?: string[];
};

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

function parseOptionalString(value: unknown): string | undefined {
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed) {
            return trimmed;
        }
    }
    return undefined;
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

function parseOptionalDateValue(value: unknown): string | undefined {
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed && dayjs(trimmed).isValid()) {
            return dayjs(trimmed).format('YYYY-MM-DD');
        }
    }
    return undefined;
}

function parseOptionalDateTimeValue(value: unknown): string | undefined {
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed && dayjs(trimmed).isValid()) {
            return dayjs(trimmed).toISOString();
        }
    }
    return undefined;
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

function createSlug(value: string): string {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
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

function normalizeInvoiceCatalogItem(
    payload: Record<string, unknown>,
    existing?: InvoiceCatalogItem
): InvoiceCatalogItem {
    const id = parseString(payload.id, existing?.id ?? randomUUID());
    const name = parseString(payload.name, existing?.name ?? 'Saved service');
    const description = parseString(payload.description, existing?.description ?? name);

    const quantityValue = parseNumber(payload.defaultQuantity);
    const defaultQuantity =
        quantityValue !== null && quantityValue > 0 ? roundTo(quantityValue, 3) : existing?.defaultQuantity ?? 1;

    const unitPriceValue = parseNumber(payload.unitPrice);
    const unitPrice =
        unitPriceValue !== null && unitPriceValue >= 0 ? roundTo(unitPriceValue) : existing?.unitPrice ?? 0;

    let quantityPresets: number[] | undefined = existing?.quantityPresets;
    if (Object.prototype.hasOwnProperty.call(payload, 'quantityPresets')) {
        if (Array.isArray(payload.quantityPresets)) {
            const normalized = payload.quantityPresets
                .map((value) => parseNumber(value))
                .filter((value): value is number => value !== null && value > 0)
                .map((value) => roundTo(value, 3));
            quantityPresets = normalized.length > 0 ? normalized : undefined;
        } else {
            quantityPresets = undefined;
        }
    }

    let unitLabel: string | undefined = existing?.unitLabel;
    if (Object.prototype.hasOwnProperty.call(payload, 'unitLabel')) {
        unitLabel = parseOptionalString(payload.unitLabel);
    }

    let tags: string[] | undefined = existing?.tags;
    if (Object.prototype.hasOwnProperty.call(payload, 'tags')) {
        if (Array.isArray(payload.tags)) {
            const normalized = payload.tags
                .map((tag) => (typeof tag === 'string' ? tag.trim() : ''))
                .filter((tag) => tag);
            tags = normalized.length > 0 ? normalized : undefined;
        } else {
            tags = undefined;
        }
    }

    return {
        id,
        name,
        description,
        defaultQuantity,
        quantityPresets,
        unitPrice,
        unitLabel,
        tags
    } satisfies InvoiceCatalogItem;
}

function normalizePackageOverrides(value: unknown): InvoicePackageItemOverride[] | undefined {
    if (!Array.isArray(value)) {
        return undefined;
    }

    const overrides = value
        .map((entry) => {
            if (!isPlainObject(entry)) {
                return null;
            }

            const catalogItemId = parseString(entry.catalogItemId, '');
            if (!catalogItemId) {
                return null;
            }

            const override: InvoicePackageItemOverride = { catalogItemId };

            const description = parseOptionalString(entry.description);
            if (description !== undefined) {
                override.description = description;
            }

            const quantityValue = parseNumber(entry.quantity);
            if (quantityValue !== null && quantityValue > 0) {
                override.quantity = roundTo(quantityValue, 3);
            }

            const unitPriceValue = parseNumber(entry.unitPrice);
            if (unitPriceValue !== null && unitPriceValue >= 0) {
                override.unitPrice = roundTo(unitPriceValue);
            }

            return override;
        })
        .filter((entry): entry is InvoicePackageItemOverride => Boolean(entry));

    return overrides.length > 0 ? overrides : undefined;
}

function normalizeInvoicePackage(payload: Record<string, unknown>, existing?: InvoicePackage): InvoicePackage {
    const id = parseString(payload.id, existing?.id ?? randomUUID());
    const name = parseString(payload.name, existing?.name ?? 'Invoice package');

    let description = existing?.description;
    if (Object.prototype.hasOwnProperty.call(payload, 'description')) {
        description = parseOptionalString(payload.description);
    }

    let notes = existing?.notes;
    if (Object.prototype.hasOwnProperty.call(payload, 'notes')) {
        notes = parseOptionalString(payload.notes);
    }

    let itemIds = existing?.itemIds ?? [];
    if (Object.prototype.hasOwnProperty.call(payload, 'itemIds')) {
        if (Array.isArray(payload.itemIds)) {
            const normalized = payload.itemIds
                .map((value) => (typeof value === 'string' ? value.trim() : ''))
                .filter((value) => value);
            itemIds = normalized;
        } else {
            itemIds = [];
        }
    }

    let overrides = existing?.overrides;
    if (Object.prototype.hasOwnProperty.call(payload, 'overrides')) {
        overrides = normalizePackageOverrides(payload.overrides);
    }

    let lineItems = existing?.lineItems ?? [];
    if (Array.isArray(payload.lineItems)) {
        lineItems = normalizeInvoiceLineItems(payload.lineItems, name);
    }

    return {
        id,
        name,
        description,
        itemIds,
        overrides,
        lineItems,
        notes
    } satisfies InvoicePackage;
}

function normalizeCrmClientRecord(
    payload: Record<string, unknown>,
    existing?: CrmClientDirectoryRecord
): CrmClientDirectoryRecord {
    const id = parseString(payload.id, existing?.id ?? randomUUID());
    const name = parseString(payload.name, existing?.name ?? 'New client');

    let email = existing?.email;
    if (Object.prototype.hasOwnProperty.call(payload, 'email')) {
        email = parseOptionalString(payload.email);
    }

    let phone = existing?.phone;
    if (Object.prototype.hasOwnProperty.call(payload, 'phone')) {
        phone = parseOptionalString(payload.phone);
    }

    let address = existing?.address;
    if (Object.prototype.hasOwnProperty.call(payload, 'address')) {
        address = parseOptionalString(payload.address);
    }

    let notes = existing?.notes;
    if (Object.prototype.hasOwnProperty.call(payload, 'notes')) {
        const value = parseOptionalString(payload.notes);
        notes = value === undefined ? undefined : value;
    }

    let relatedProjects = existing?.related_projects;
    if (Object.prototype.hasOwnProperty.call(payload, 'related_projects')) {
        if (Array.isArray(payload.related_projects)) {
            const normalized = payload.related_projects
                .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
                .filter((entry) => entry);
            relatedProjects = normalized.length > 0 ? normalized : undefined;
        } else {
            relatedProjects = undefined;
        }
    }

    let owner = existing?.owner;
    if (Object.prototype.hasOwnProperty.call(payload, 'owner')) {
        owner = parseOptionalString(payload.owner);
    }

    let defaultPackageIds = existing?.defaultPackageIds;
    if (Object.prototype.hasOwnProperty.call(payload, 'defaultPackageIds')) {
        if (Array.isArray(payload.defaultPackageIds)) {
            const normalized = payload.defaultPackageIds
                .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
                .filter((entry) => entry);
            defaultPackageIds = normalized;
        } else {
            defaultPackageIds = [];
        }
    }

    let defaultItemIds = existing?.defaultItemIds;
    if (Object.prototype.hasOwnProperty.call(payload, 'defaultItemIds')) {
        if (Array.isArray(payload.defaultItemIds)) {
            const normalized = payload.defaultItemIds
                .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
                .filter((entry) => entry);
            defaultItemIds = normalized;
        } else {
            defaultItemIds = [];
        }
    }

    return {
        id,
        name,
        email,
        phone,
        address,
        notes,
        related_projects: relatedProjects,
        owner,
        defaultPackageIds,
        defaultItemIds
    } satisfies CrmClientDirectoryRecord;
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

function normalizeGalleryRecord(
    payload: Record<string, unknown>,
    existing?: GalleryRecord
): GalleryRecord {
    const id = parseString(payload.id, existing?.id ?? randomUUID());
    const client = parseString(payload.client, existing?.client ?? 'New client');
    const shootType = parseString(payload.shootType, existing?.shootType ?? 'New gallery');

    const status =
        typeof payload.status === 'string' && GALLERY_STATUSES.includes(payload.status as GalleryStatus)
            ? (payload.status as GalleryStatus)
            : existing?.status ?? 'Pending';

    const hasDeliveryDueDate = Object.prototype.hasOwnProperty.call(payload, 'deliveryDueDate');
    const deliveryDueDate = hasDeliveryDueDate
        ? parseOptionalDateValue(payload.deliveryDueDate)
        : existing?.deliveryDueDate;

    let deliveredAt: string | undefined;
    if (status === 'Delivered') {
        if (Object.prototype.hasOwnProperty.call(payload, 'deliveredAt')) {
            deliveredAt = parseOptionalDateValue(payload.deliveredAt);
        } else {
            deliveredAt = existing?.deliveredAt;
        }

        if (!deliveredAt) {
            deliveredAt = deliveryDueDate ?? existing?.deliveryDueDate ?? dayjs().format('YYYY-MM-DD');
        }
    }

    const hasReminderField = Object.prototype.hasOwnProperty.call(payload, 'reminderSentAt');
    let reminderSentAt: string | undefined;
    if (status === 'Delivered') {
        if (hasReminderField) {
            reminderSentAt =
                payload.reminderSentAt === null
                    ? undefined
                    : parseOptionalDateTimeValue(payload.reminderSentAt);
        } else {
            reminderSentAt = existing?.reminderSentAt;
        }
    }

    const expiresAt =
        status === 'Delivered' && deliveredAt
            ? dayjs(deliveredAt).add(1, 'year').format('YYYY-MM-DD')
            : undefined;

    const hasProjectId = Object.prototype.hasOwnProperty.call(payload, 'projectId');
    const projectId = hasProjectId
        ? payload.projectId === null
            ? undefined
            : parseOptionalString(payload.projectId) ?? undefined
        : existing?.projectId;

    const hasCoverImage = Object.prototype.hasOwnProperty.call(payload, 'coverImage');
    const coverImage = hasCoverImage
        ? payload.coverImage === null
            ? undefined
            : parseOptionalString(payload.coverImage) ?? undefined
        : existing?.coverImage;

    const customFields = sanitizeCustomFields(payload.customFields) ?? existing?.customFields;

    return {
        id,
        client,
        shootType,
        status,
        deliveryDueDate,
        deliveredAt,
        expiresAt,
        reminderSentAt,
        projectId,
        coverImage,
        customFields
    } satisfies GalleryRecord;
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

    if (
        key === 'bookings' ||
        key === 'clients' ||
        key === 'galleries' ||
        key === 'invoices' ||
        key === 'invoice-items' ||
        key === 'invoice-packages'
    ) {
        return key;
    }

    return null;
}

function collectExistingIds(records: Array<{ id?: unknown }>): Set<string> {
    return new Set(
        records
            .map((record) => {
                if (typeof record.id === 'string' && record.id.trim()) {
                    return record.id.trim();
                }
                if (typeof record.id === 'number' && Number.isFinite(record.id)) {
                    return String(record.id);
                }
                return null;
            })
            .filter((value): value is string => Boolean(value))
    );
}

function generatePrefixedId(prefix: string, name: string, existingIds: Set<string>): string {
    const normalizedPrefix = prefix.endsWith('-') ? prefix : `${prefix}-`;
    const slug = createSlug(name);
    const base = slug || randomUUID().slice(0, 8);
    const initial = base.startsWith(normalizedPrefix) ? base : `${normalizedPrefix}${base}`;

    if (!existingIds.has(initial)) {
        return initial;
    }

    let counter = 2;
    let candidate = `${initial}-${counter}`;
    while (existingIds.has(candidate)) {
        counter += 1;
        candidate = `${initial}-${counter}`;
    }

    return candidate;
}

function generateRandomId(prefix: string, existingIds: Set<string>): string {
    let candidate = '';
    do {
        candidate = `${prefix}-${randomUUID().slice(0, 8)}`;
    } while (existingIds.has(candidate));
    return candidate;
}

function ensureRecordId(resource: ResourceKey, records: Array<{ id?: unknown }>, payload: Record<string, unknown>) {
    if (typeof payload.id === 'string' && payload.id.trim() !== '') {
        return payload;
    }

    const result: Record<string, unknown> = { ...payload };
    const existingIds = collectExistingIds(records);

    if (resource === 'invoices') {
        const numericIds = Array.from(existingIds)
            .map((value) => {
                const parsed = Number.parseInt(value, 10);
                return Number.isFinite(parsed) ? parsed : null;
            })
            .filter((value): value is number => value !== null);

        const nextId = numericIds.length > 0 ? Math.max(...numericIds) + 1 : 1000;
        result.id = String(nextId);
        return result;
    }

    if (resource === 'clients') {
        result.id = generatePrefixedId('client-', typeof payload.name === 'string' ? payload.name : '', existingIds);
        return result;
    }

    if (resource === 'invoice-items') {
        result.id = generatePrefixedId('svc-', typeof payload.name === 'string' ? payload.name : '', existingIds);
        return result;
    }

    if (resource === 'invoice-packages') {
        result.id = generatePrefixedId('pkg-', typeof payload.name === 'string' ? payload.name : '', existingIds);
        return result;
    }

    if (resource === 'bookings') {
        result.id = generateRandomId('bk', existingIds);
        return result;
    }

    result.id = generateRandomId('gal', existingIds);
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

    if (resourceKey === 'galleries') {
        const galleries = await readRecords<GalleryRecord>(config);
        const recordWithId = ensureRecordId(resourceKey, galleries, payload);
        const gallery = normalizeGalleryRecord(recordWithId);

        galleries.push(gallery);
        await writeRecords(config, galleries);

        return res.status(201).json({ data: gallery });
    }

    if (resourceKey === 'clients') {
        const clients = await readRecords<CrmClientDirectoryRecord>(config);
        const recordWithId = ensureRecordId(resourceKey, clients, payload);
        const client = normalizeCrmClientRecord(recordWithId);

        clients.push(client);
        await writeRecords(config, clients);

        return res.status(201).json({ data: client });
    }

    if (resourceKey === 'invoice-items') {
        const items = await readRecords<InvoiceCatalogItem>(config);
        const recordWithId = ensureRecordId(resourceKey, items, payload);
        const item = normalizeInvoiceCatalogItem(recordWithId);

        items.push(item);
        await writeRecords(config, items);

        return res.status(201).json({ data: item });
    }

    if (resourceKey === 'invoice-packages') {
        const packages = await readRecords<InvoicePackage>(config);
        const recordWithId = ensureRecordId(resourceKey, packages, payload);
        const invoicePackage = normalizeInvoicePackage(recordWithId);

        packages.push(invoicePackage);
        await writeRecords(config, packages);

        return res.status(201).json({ data: invoicePackage });
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

    if (resourceKey === 'galleries') {
        const galleries = await readRecords<GalleryRecord>(config);
        const index = galleries.findIndex((gallery) => gallery.id === id);

        if (index === -1) {
            return res.status(404).json({ error: 'Record not found.' });
        }

        const payloadWithId: Record<string, unknown> = { ...payload, id };
        const updated = normalizeGalleryRecord(payloadWithId, galleries[index]);
        galleries[index] = updated;
        await writeRecords(config, galleries);

        return res.status(200).json({ data: updated });
    }

    if (resourceKey === 'clients') {
        const clients = await readRecords<CrmClientDirectoryRecord>(config);
        const index = clients.findIndex((client) => client.id === id);

        if (index === -1) {
            return res.status(404).json({ error: 'Record not found.' });
        }

        const payloadWithId: Record<string, unknown> = { ...payload, id };
        const updated = normalizeCrmClientRecord(payloadWithId, clients[index]);
        clients[index] = updated;
        await writeRecords(config, clients);

        return res.status(200).json({ data: updated });
    }

    if (resourceKey === 'invoice-items') {
        const items = await readRecords<InvoiceCatalogItem>(config);
        const index = items.findIndex((item) => item.id === id);

        if (index === -1) {
            return res.status(404).json({ error: 'Record not found.' });
        }

        const payloadWithId: Record<string, unknown> = { ...payload, id };
        const updated = normalizeInvoiceCatalogItem(payloadWithId, items[index]);
        items[index] = updated;
        await writeRecords(config, items);

        return res.status(200).json({ data: updated });
    }

    if (resourceKey === 'invoice-packages') {
        const packages = await readRecords<InvoicePackage>(config);
        const index = packages.findIndex((entry) => entry.id === id);

        if (index === -1) {
            return res.status(404).json({ error: 'Record not found.' });
        }

        const payloadWithId: Record<string, unknown> = { ...payload, id };
        const updated = normalizeInvoicePackage(payloadWithId, packages[index]);
        packages[index] = updated;
        await writeRecords(config, packages);

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

