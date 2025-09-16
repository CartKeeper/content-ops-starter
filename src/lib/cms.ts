export type CMSField = {
    label: string;
    name: string;
    widget: string;
    hint?: string;
    required?: boolean;
    multiple?: boolean;
};

export type CMSCollection = {
    name: string;
    label: string;
    folder: string;
    slug: string;
    create: boolean;
    fields: CMSField[];
};

export const CRM_COLLECTIONS: CMSCollection[] = [
    {
        name: 'clients',
        label: 'Clients',
        folder: 'content/data/clients',
        slug: '{{slug}}',
        create: true,
        fields: [
            { label: 'Client Name', name: 'name', widget: 'string', required: true },
            { label: 'Email', name: 'email', widget: 'string', required: true },
            { label: 'Phone', name: 'phone', widget: 'string' },
            { label: 'Location', name: 'location', widget: 'string' },
            { label: 'Tags', name: 'tags', widget: 'list', hint: 'Keywords for filtering (wedding, family, etc.)' },
            { label: 'Notes', name: 'notes', widget: 'text', hint: 'Important reminders before a shoot' }
        ]
    },
    {
        name: 'bookings',
        label: 'Bookings',
        folder: 'content/data/bookings',
        slug: '{{year}}-{{month}}-{{slug}}',
        create: true,
        fields: [
            { label: 'Client', name: 'client', widget: 'relation', hint: 'Reference a client record' },
            { label: 'Date', name: 'date', widget: 'datetime', required: true },
            { label: 'Location', name: 'location', widget: 'string' },
            { label: 'Shoot Type', name: 'shootType', widget: 'select', multiple: false },
            { label: 'Status', name: 'status', widget: 'select', hint: 'Proposal, scheduled, delivered, etc.' },
            { label: 'Deliverables', name: 'deliverables', widget: 'text' }
        ]
    },
    {
        name: 'invoices',
        label: 'Invoices',
        folder: 'content/data/invoices',
        slug: '{{slug}}',
        create: true,
        fields: [
            { label: 'Client', name: 'client', widget: 'relation', required: true },
            { label: 'Amount', name: 'amount', widget: 'number', required: true },
            { label: 'Due Date', name: 'dueDate', widget: 'datetime', required: true },
            { label: 'Status', name: 'status', widget: 'select', required: true },
            { label: 'Description', name: 'description', widget: 'text' }
        ]
    },
    {
        name: 'galleries',
        label: 'Galleries',
        folder: 'content/data/galleries',
        slug: '{{slug}}',
        create: true,
        fields: [
            { label: 'Client', name: 'client', widget: 'relation', required: true },
            { label: 'Project', name: 'project', widget: 'string', required: true },
            { label: 'Title', name: 'title', widget: 'string', required: true },
            { label: 'Delivery Date', name: 'deliveryDate', widget: 'datetime' },
            { label: 'Status', name: 'status', widget: 'select' },
            { label: 'Photos', name: 'photos', widget: 'list', hint: 'Upload or reference CDN URLs' }
        ]
    }
];

export function listCollections(): CMSCollection[] {
    return CRM_COLLECTIONS;
}
