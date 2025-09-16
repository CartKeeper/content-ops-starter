export type Client = {
    id: string;
    name: string;
    email: string;
    phone: string;
    location: string;
    lastShootDate: string;
    tags: string[];
    notes?: string;
};

export type BookingStatus = 'proposal' | 'scheduled' | 'completed' | 'delivered';

export type Booking = {
    id: string;
    clientId: string;
    date: string;
    startTime: string;
    endTime: string;
    location: string;
    shootType: string;
    status: BookingStatus;
    deliverables?: string;
};

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue';

export type Invoice = {
    id: string;
    clientId: string;
    amount: number;
    dueDate: string;
    status: InvoiceStatus;
    description?: string;
};

export type GalleryStatus = 'draft' | 'delivered' | 'archived';

export type GalleryPhoto = {
    id: string;
    filename: string;
    url: string;
};

export type Gallery = {
    id: string;
    clientId: string;
    project: string;
    title: string;
    status: GalleryStatus;
    deliveryDate: string;
    coverImage: string;
    photos: GalleryPhoto[];
};

export const clients: Client[] = [
    {
        id: 'client-olivia-rivera',
        name: 'Olivia Rivera',
        email: 'olivia.rivera@example.com',
        phone: '+1 (312) 555-9023',
        location: 'Chicago, IL',
        lastShootDate: '2023-10-02',
        tags: ['wedding', 'vip'],
        notes: 'Prefers natural light and candid shots. Following up about spring engagement session.'
    },
    {
        id: 'client-liam-nguyen',
        name: 'Liam Nguyen',
        email: 'liam.nguyen@example.com',
        phone: '+1 (415) 555-4411',
        location: 'San Francisco, CA',
        lastShootDate: '2023-12-14',
        tags: ['branding'],
        notes: 'Launching a new personal brand site in Q2. Needs lifestyle portraits.'
    },
    {
        id: 'client-amelia-cho',
        name: 'Amelia Cho',
        email: 'amelia.cho@example.com',
        phone: '+1 (646) 555-7312',
        location: 'New York, NY',
        lastShootDate: '2024-01-09',
        tags: ['family', 'repeat'],
        notes: 'Booked annual family mini-session. Loves quick turnarounds.'
    }
];

export const bookings: Booking[] = [
    {
        id: 'booking-rivera-wedding',
        clientId: 'client-olivia-rivera',
        date: '2024-05-18',
        startTime: '13:00',
        endTime: '20:00',
        location: 'Lakeview Pavilion, Chicago',
        shootType: 'Wedding',
        status: 'scheduled',
        deliverables: 'Full day coverage, highlight film, 400 edited photos'
    },
    {
        id: 'booking-nguyen-branding',
        clientId: 'client-liam-nguyen',
        date: '2024-03-08',
        startTime: '09:30',
        endTime: '12:30',
        location: 'SoMa Studio Collective, San Francisco',
        shootType: 'Branding Portraits',
        status: 'completed',
        deliverables: '20 retouched images formatted for LinkedIn and website banners'
    },
    {
        id: 'booking-cho-family',
        clientId: 'client-amelia-cho',
        date: '2024-03-24',
        startTime: '16:00',
        endTime: '17:00',
        location: 'Brooklyn Bridge Park, New York',
        shootType: 'Family Session',
        status: 'scheduled',
        deliverables: 'Mini session with 15 edited images'
    }
];

export const invoices: Invoice[] = [
    {
        id: 'invoice-2024-001',
        clientId: 'client-olivia-rivera',
        amount: 4800,
        dueDate: '2024-04-30',
        status: 'sent',
        description: 'Final balance for Rivera wedding coverage'
    },
    {
        id: 'invoice-2024-002',
        clientId: 'client-liam-nguyen',
        amount: 950,
        dueDate: '2024-02-22',
        status: 'paid',
        description: 'Branding portrait session with rush delivery add-on'
    },
    {
        id: 'invoice-2024-003',
        clientId: 'client-amelia-cho',
        amount: 450,
        dueDate: '2024-03-30',
        status: 'draft',
        description: 'Family mini-session with print package'
    }
];

export const galleries: Gallery[] = [
    {
        id: 'gallery-rivera-proofs',
        clientId: 'client-olivia-rivera',
        project: 'Rivera Wedding',
        title: 'Rivera Wedding Proofs',
        status: 'draft',
        deliveryDate: '2024-06-01',
        coverImage: '/images/gallery/rivera-cover.jpg',
        photos: [
            { id: 'rivera-001', filename: 'rivera-001.jpg', url: '/images/gallery/rivera-001.jpg' },
            { id: 'rivera-002', filename: 'rivera-002.jpg', url: '/images/gallery/rivera-002.jpg' }
        ]
    },
    {
        id: 'gallery-nguyen-launch',
        clientId: 'client-liam-nguyen',
        project: 'Liam Nguyen Branding',
        title: 'Brand Refresh Deliverables',
        status: 'delivered',
        deliveryDate: '2023-12-20',
        coverImage: '/images/gallery/nguyen-cover.jpg',
        photos: [
            { id: 'nguyen-001', filename: 'nguyen-001.jpg', url: '/images/gallery/nguyen-001.jpg' },
            { id: 'nguyen-002', filename: 'nguyen-002.jpg', url: '/images/gallery/nguyen-002.jpg' },
            { id: 'nguyen-003', filename: 'nguyen-003.jpg', url: '/images/gallery/nguyen-003.jpg' }
        ]
    }
];
