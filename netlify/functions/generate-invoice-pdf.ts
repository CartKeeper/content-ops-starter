import type { Handler } from '@netlify/functions';
// @ts-ignore - pdfkit is bundled by Netlify Functions but lacks type resolution in Next.js builds
const PDFDocument = require('pdfkit');

import type { InvoiceRecord, InvoiceLineItem } from '../../src/types/invoice';

type PdfDoc = InstanceType<typeof PDFDocument>;

interface InvoicePdfRequestBody {
    invoice?: InvoiceRecord;
    studio?: {
        name?: string;
        email?: string;
        phone?: string;
        website?: string;
        address?: string;
    };
}

const DEFAULT_STUDIO = {
    name: 'Codex Studio',
    email: 'billing@codex.studio',
    phone: '+1 (555) 123-4567',
    website: 'https://codex.studio'
};

const handler: Handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed.' })
        };
    }

    const clientContext = event.clientContext as unknown as { user?: { app_metadata?: { roles?: unknown } } } | undefined;
    const roles = Array.isArray(clientContext?.user?.app_metadata?.roles)
        ? clientContext?.user?.app_metadata?.roles
        : [];
    const hasPhotographerRole = roles.some((role) => typeof role === 'string' && role.toLowerCase() === 'photographer');
    if (!hasPhotographerRole) {
        return {
            statusCode: 403,
            body: JSON.stringify({ error: 'Photographer access is required to generate invoices.' })
        };
    }

    let payload: InvoicePdfRequestBody | null = null;
    try {
        const requestBody = event.body as string | null;
        if (requestBody) {
            payload = JSON.parse(requestBody) as InvoicePdfRequestBody;
        }
    } catch (error) {
        console.warn('generate-invoice-pdf: unable to parse request body', error);
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Invalid request payload.' })
        };
    }

    if (!payload?.invoice) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Invoice details are required.' })
        };
    }

    const invoice = payload.invoice;
    const studio = { ...DEFAULT_STUDIO, ...payload.studio };

    try {
        const pdfBuffer = await buildInvoicePdf(invoice, studio);

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="invoice-${invoice.id}.pdf"`,
                'Cache-Control': 'no-store'
            },
            body: pdfBuffer.toString('base64'),
            isBase64Encoded: true
        };
    } catch (error) {
        console.error('generate-invoice-pdf: failed to render invoice', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to render the invoice PDF.' })
        };
    }
};

function formatCurrency(value: number, currency: string): string {
    try {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    } catch {
        return `$${value.toFixed(2)}`;
    }
}

async function buildInvoicePdf(invoice: InvoiceRecord, studio: Record<string, string | undefined>): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50 });
        const chunks: Uint8Array[] = [];

        doc.on('data', (chunk: Uint8Array) => chunks.push(chunk));
        doc.on('error', (error) => reject(error));
        doc.on('end', () => resolve(Buffer.concat(chunks as readonly Uint8Array[])));

        const title = `Invoice ${invoice.id}`;
        doc.fontSize(24).fillColor('#111827').text(title, { align: 'left' });
        doc.moveDown(0.5);
        doc.fontSize(12).fillColor('#4B5563');
        doc.text(studio.name ?? DEFAULT_STUDIO.name);
        if (studio.address) {
            doc.text(studio.address);
        }
        if (studio.email) {
            doc.text(studio.email);
        }
        if (studio.phone) {
            doc.text(studio.phone);
        }
        if (studio.website) {
            doc.text(studio.website);
        }

        doc.moveDown(1);
        doc.fontSize(14).fillColor('#111827').text('Bill To', { continued: false });
        doc.fontSize(12).fillColor('#1F2937');
        doc.text(invoice.client);
        if (invoice.clientEmail) {
            doc.text(invoice.clientEmail);
        }
        if (invoice.clientAddress) {
            doc.text(invoice.clientAddress);
        }

        doc.moveDown(1);
        const metadata = [
            ['Project', invoice.project],
            ['Issue Date', invoice.issueDate],
            ['Due Date', invoice.dueDate],
            ['Status', invoice.status]
        ];

        metadata.forEach(([label, value]) => {
            if (!value) {
                return;
            }
            doc.fontSize(11).fillColor('#6B7280').text(label, { continued: true });
            doc.fillColor('#111827').text(`: ${value}`);
        });

        doc.moveDown(1.5);
        renderLineItemsTable(doc, invoice.lineItems, invoice.currency);

        doc.moveDown(0.75);
        doc.strokeColor('#E5E7EB').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
        doc.moveDown(0.75);

        doc.fontSize(12).fillColor('#111827');
        doc.text(`Subtotal: ${formatCurrency(invoice.totals.subtotal, invoice.currency)}`);
        doc.text(`Tax (${Math.round(invoice.taxRate * 100)}%): ${formatCurrency(invoice.totals.taxTotal, invoice.currency)}`);
        doc.font('Helvetica-Bold').text(`Total: ${formatCurrency(invoice.totals.total, invoice.currency)}`);
        doc.font('Helvetica');

        if (invoice.notes) {
            doc.moveDown(1);
            doc.fontSize(11).fillColor('#4B5563').text('Notes', { underline: true });
            doc.moveDown(0.5);
            doc.fontSize(11).fillColor('#1F2937').text(invoice.notes, {
                align: 'left',
                lineGap: 4
            });
        }

        doc.moveDown(2);
        doc.fontSize(10).fillColor('#9CA3AF').text('Generated with Netlify Functions for the Codex photography studio.');

        doc.end();
    });
}

function renderLineItemsTable(doc: PdfDoc, items: InvoiceLineItem[], currency: string): void {
    const tableTop = doc.y;
    const descriptionWidth = 280;
    const qtyWidth = 60;
    const unitWidth = 80;
    const totalWidth = 80;

    doc.fontSize(12).fillColor('#111827');
    doc.text('Description', 50, tableTop, { width: descriptionWidth, continued: true });
    doc.text('Qty', 50 + descriptionWidth, tableTop, { width: qtyWidth, align: 'right', continued: true });
    doc.text('Unit', 50 + descriptionWidth + qtyWidth, tableTop, { width: unitWidth, align: 'right', continued: true });
    doc.text('Total', 50 + descriptionWidth + qtyWidth + unitWidth, tableTop, { width: totalWidth, align: 'right' });

    doc.moveDown(0.5);
    doc.strokeColor('#E5E7EB').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5);

    doc.fontSize(11).fillColor('#1F2937');
    items.forEach((item) => {
        doc.text(item.description, 50, doc.y, { width: descriptionWidth, continued: true });
        doc.text(`${item.quantity}`, 50 + descriptionWidth, doc.y, { width: qtyWidth, align: 'right', continued: true });
        doc.text(formatCurrency(item.unitPrice, currency), 50 + descriptionWidth + qtyWidth, doc.y, {
            width: unitWidth,
            align: 'right',
            continued: true
        });
        doc.text(formatCurrency(item.total, currency), 50 + descriptionWidth + qtyWidth + unitWidth, doc.y, {
            width: totalWidth,
            align: 'right'
        });
        doc.moveDown(0.6);
    });
}

export { handler };
