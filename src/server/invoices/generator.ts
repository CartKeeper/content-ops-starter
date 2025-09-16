import { pdf } from '@react-pdf/renderer';
import fs from 'fs/promises';
import path from 'path';

import type { InvoiceRecord } from '../../types/invoice';
import { renderInvoiceTemplate } from './templates';

const OUTPUT_DIRECTORY = path.join(process.cwd(), 'public', 'invoices');

export type GeneratedInvoice = {
    filePath: string;
    publicUrl: string;
};

export async function generateInvoicePdf(invoice: InvoiceRecord): Promise<GeneratedInvoice> {
    await fs.mkdir(OUTPUT_DIRECTORY, { recursive: true });

    const document = renderInvoiceTemplate(invoice.template, invoice);
    const instance = pdf(document);
    const fileName = `invoice-${invoice.id}.pdf`;
    const filePath = path.join(OUTPUT_DIRECTORY, fileName);
    const pdfBuffer = await instance.toBuffer();

    await fs.writeFile(filePath, pdfBuffer);

    return {
        filePath,
        publicUrl: `/invoices/${fileName}`
    };
}
