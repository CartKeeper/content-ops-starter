import { bookings, clients, galleries, invoices } from './mock-data';
import type {
    Booking,
    Client,
    Gallery,
    GalleryPhoto,
    Invoice,
    InvoiceStatus
} from './mock-data';

export type CreateInvoiceInput = {
    clientId: string;
    amount: number;
    dueDate: string;
    description?: string;
};

export type CreateGalleryInput = {
    clientId: string;
    project: string;
    title: string;
    deliveryDate: string;
    photoFilenames: string[];
};

export async function getClients(): Promise<Client[]> {
    return clients;
}

export async function getClientById(id: string): Promise<Client | undefined> {
    return clients.find((client) => client.id === id);
}

export async function getBookings(): Promise<Booking[]> {
    return bookings;
}

export async function getInvoices(): Promise<Invoice[]> {
    return invoices;
}

export async function getGalleries(): Promise<Gallery[]> {
    return galleries;
}

export async function createInvoice(input: CreateInvoiceInput): Promise<Invoice> {
    const nextSequence = invoices.length + 1;
    const paddedSequence = String(nextSequence).padStart(3, '0');
    const newInvoice: Invoice = {
        id: `invoice-2024-${paddedSequence}`,
        clientId: input.clientId,
        amount: input.amount,
        dueDate: input.dueDate,
        status: deriveInvoiceStatus(input.dueDate),
        description: input.description
    };
    return newInvoice;
}

function deriveInvoiceStatus(dueDate: string): InvoiceStatus {
    const now = new Date();
    const due = new Date(dueDate);
    if (due < now) {
        return 'overdue';
    }
    return 'sent';
}

export async function createGallery(input: CreateGalleryInput): Promise<Gallery> {
    const photoEntries: GalleryPhoto[] = input.photoFilenames.map((filename, index) => ({
        id: `${input.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${index + 1}`,
        filename,
        url: `/uploads/${filename}`
    }));
    const newGallery: Gallery = {
        id: `${input.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`,
        clientId: input.clientId,
        project: input.project,
        title: input.title,
        status: 'draft',
        deliveryDate: input.deliveryDate,
        coverImage: photoEntries[0]?.url || '/images/gallery/placeholder.jpg',
        photos: photoEntries
    };
    return newGallery;
}
