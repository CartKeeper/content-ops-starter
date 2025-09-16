import fs from 'fs/promises';
import path from 'path';

import type { InvoiceRecord } from '../../types/invoice';
import { getInvoiceBrandDetails } from './templates';

export type InvoiceEmailResult = {
    sent: boolean;
    message: string;
    logPath?: string;
};

const formatCurrency = (value: number, currency: string) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(value);

export async function sendInvoiceEmail(invoice: InvoiceRecord, pdfUrl: string): Promise<InvoiceEmailResult> {
    if (!invoice.clientEmail) {
        return {
            sent: false,
            message: 'Invoice has no client email address; skipping email send.'
        };
    }

    const brand = getInvoiceBrandDetails(invoice);
    const timestamp = new Date().toISOString();
    const subject = `Invoice ${invoice.id} from ${brand.name}`;
    const amountLabel = formatCurrency(invoice.amount, invoice.currency);
    const paymentLine = invoice.paymentLink ? `Pay online: ${invoice.paymentLink}` : null;

    const body = [
        `Hello ${invoice.client},`,
        '',
        `Thank you for trusting ${brand.name}. Your invoice total is ${amountLabel}.`,
        `Download the PDF: ${pdfUrl}`,
        paymentLine,
        '',
        brand.email ? `Questions? Reply to ${brand.email}.` : null
    ]
        .filter(Boolean)
        .join('\n');

    const logDirectory = path.join(process.cwd(), 'content', 'logs');
    await fs.mkdir(logDirectory, { recursive: true });
    const logPath = path.join(logDirectory, 'invoice-emails.log');

    const logEntry = JSON.stringify({
        timestamp,
        to: invoice.clientEmail,
        subject,
        pdfUrl,
        paymentLink: invoice.paymentLink ?? null,
        amount: invoice.amount,
        currency: invoice.currency,
        body
    });

    await fs.appendFile(logPath, `${logEntry}\n`, 'utf-8');

    return {
        sent: true,
        message: `Logged outgoing invoice email to ${invoice.clientEmail}.`,
        logPath
    };
}
