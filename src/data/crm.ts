import type { ClientRecord } from '../components/crm/ClientTable';
import type { BookingStatus } from '../components/crm/BookingList';
import type { InvoiceStatus } from '../types/invoice';
import type { TaskRecord } from '../components/crm/TaskList';

export type GalleryStatus = 'Delivered' | 'Pending';

export type GalleryAsset = {
    id: string;
    fileName: string;
    contentType: string;
    size: number;
    storageBucket: string;
    storagePath: string;
    publicUrl: string;
    checksum?: string | null;
    uploadedAt?: string;
    duplicateOf?: string | null;
    isDuplicate?: boolean;
    clientId?: string | null;
    projectId?: string | null;
    projectCode?: string | null;
    dropboxFileId?: string | null;
    dropboxRevision?: string | null;
};

export type GalleryStorageSummary = {
    assetCount: number;
    totalBytes: number;
    formattedTotal: string;
};

export type GalleryRecord = {
    id: string;
    client: string;
    shootType: string;
    status: GalleryStatus;
    deliveryDueDate?: string;
    deliveredAt?: string;
    expiresAt?: string;
    reminderSentAt?: string;
    projectId?: string;
    projectCode?: string | null;
    coverImage?: string;
    assets?: GalleryAsset[];
    totalStorageBytes?: number;
    totalStorageFormatted?: string;
    storageSummary?: GalleryStorageSummary;
    dropboxSyncCursor?: string | null;
    dropboxFiles?: string[];
    customFields?: Record<string, string | boolean>;
};

export type ProjectMilestone = {
    id: string;
    date: string;
    label: string;
    status: BookingStatus;
    location?: string;
};

export type ProjectInvoiceSummary = {
    id: string;
    amount: number;
    status: InvoiceStatus;
    dueDate: string;
};

export type ProjectRecord = {
    id: string;
    name: string;
    client: string;
    description: string;
    startDate: string;
    endDate: string;
    shoots: ProjectMilestone[];
    invoices: ProjectInvoiceSummary[];
    progress: number; // 0 - 1
    tags: string[];
};

export const clients: ClientRecord[] = [
    {
        id: 'cl-01',
        name: 'Evelyn Sanders',
        email: 'evelyn@wanderlust.com',
        phone: '(415) 555-0108',
        shoots: 7,
        lastShoot: '2025-03-29',
        upcomingShoot: '2025-05-11',
        status: 'Active'
    },
    {
        id: 'cl-02',
        name: 'Harrison & June',
        email: 'hello@harrisonandjune.com',
        phone: '(424) 555-0145',
        shoots: 3,
        lastShoot: '2024-11-18',
        upcomingShoot: '2025-05-18',
        status: 'Lead'
    },
    {
        id: 'cl-03',
        name: 'Sona Patel',
        email: 'sona@patelcreative.co',
        phone: '(415) 555-0121',
        shoots: 4,
        lastShoot: '2025-04-02',
        upcomingShoot: '2025-05-21',
        status: 'Active'
    },
    {
        id: 'cl-04',
        name: 'Fern & Pine Studio',
        email: 'contact@fernandpine.com',
        phone: '(510) 555-0186',
        shoots: 5,
        lastShoot: '2025-04-04',
        upcomingShoot: '2025-06-08',
        status: 'Active'
    },
    {
        id: 'cl-05',
        name: 'Evergreen Architects',
        email: 'team@evergreenarchitects.com',
        phone: '(628) 555-0163',
        shoots: 2,
        lastShoot: '2025-03-18',
        upcomingShoot: '2025-05-29',
        status: 'Lead'
    },
    {
        id: 'cl-06',
        name: 'Atlas Fitness',
        email: 'hello@atlasfitness.co',
        phone: '(415) 555-0194',
        shoots: 3,
        lastShoot: '2025-01-22',
        status: 'Active'
    }
];

export const galleryCollection: GalleryRecord[] = [
    {
        id: 'gal-01',
        client: 'Evelyn Sanders',
        shootType: 'Engagement Session',
        deliveryDueDate: '2025-05-14',
        status: 'Pending',
        coverImage: '/images/main-hero.jpg',
        assets: [],
        totalStorageBytes: 0,
        totalStorageFormatted: '0 B',
        storageSummary: { assetCount: 0, totalBytes: 0, formattedTotal: '0 B' }
    },
    {
        id: 'gal-02',
        client: 'Harrison & June',
        shootType: 'Wedding Weekend',
        deliveryDueDate: '2025-05-27',
        status: 'Pending',
        projectId: 'proj-02',
        coverImage: '/images/hero3.svg',
        assets: [],
        totalStorageBytes: 0,
        totalStorageFormatted: '0 B',
        storageSummary: { assetCount: 0, totalBytes: 0, formattedTotal: '0 B' },
        customFields: {
            deliveryEmail: 'hello@harrisonandjune.com'
        }
    },
    {
        id: 'gal-03',
        client: 'Sona Patel',
        shootType: 'Brand Lifestyle Campaign',
        deliveredAt: '2025-04-28',
        expiresAt: '2026-04-28',
        status: 'Delivered',
        projectId: 'proj-03',
        coverImage: '/images/abstract-feature1.svg',
        assets: [],
        totalStorageBytes: 0,
        totalStorageFormatted: '0 B',
        storageSummary: { assetCount: 0, totalBytes: 0, formattedTotal: '0 B' },
        customFields: {
            deliveryEmail: 'sona@patelcreative.co'
        }
    },
    {
        id: 'gal-04',
        client: 'Fern & Pine Studio',
        shootType: 'Lookbook Launch',
        deliveredAt: '2025-04-10',
        expiresAt: '2026-04-10',
        status: 'Delivered',
        coverImage: '/images/abstract-feature2.svg',
        assets: [],
        totalStorageBytes: 0,
        totalStorageFormatted: '0 B',
        storageSummary: { assetCount: 0, totalBytes: 0, formattedTotal: '0 B' }
    },
    {
        id: 'gal-05',
        client: 'Evergreen Architects',
        shootType: 'Team Headshots',
        deliveredAt: '2025-03-23',
        expiresAt: '2026-03-23',
        status: 'Delivered',
        projectId: 'proj-01',
        coverImage: '/images/abstract-feature3.svg',
        assets: [],
        totalStorageBytes: 0,
        totalStorageFormatted: '0 B',
        storageSummary: { assetCount: 0, totalBytes: 0, formattedTotal: '0 B' },
        customFields: {
            deliveryEmail: 'team@evergreenarchitects.com'
        }
    },
    {
        id: 'gal-06',
        client: 'Violet & Thread',
        shootType: 'Spring Collection',
        deliveredAt: '2025-02-24',
        expiresAt: '2026-02-24',
        status: 'Delivered',
        coverImage: '/images/hero2.svg',
        assets: [],
        totalStorageBytes: 0,
        totalStorageFormatted: '0 B',
        storageSummary: { assetCount: 0, totalBytes: 0, formattedTotal: '0 B' }
    },
    {
        id: 'gal-07',
        client: 'Atlas Fitness',
        shootType: 'Brand Campaign',
        deliveredAt: '2025-02-02',
        expiresAt: '2026-02-02',
        status: 'Delivered',
        coverImage: '/images/hero.svg',
        assets: [],
        totalStorageBytes: 0,
        totalStorageFormatted: '0 B',
        storageSummary: { assetCount: 0, totalBytes: 0, formattedTotal: '0 B' }
    },
    {
        id: 'gal-08',
        client: 'Harbor & Co',
        shootType: 'Product Launch',
        deliveredAt: '2024-12-18',
        expiresAt: '2025-12-18',
        status: 'Delivered',
        coverImage: '/images/abstract-background.svg',
        assets: [],
        totalStorageBytes: 0,
        totalStorageFormatted: '0 B',
        storageSummary: { assetCount: 0, totalBytes: 0, formattedTotal: '0 B' },
        customFields: {
            deliveryEmail: 'projects@harborandco.com'
        },
        reminderSentAt: '2025-11-18T09:15:00.000Z'
    },
    {
        id: 'gal-09',
        client: 'Lumen Studio',
        shootType: 'Agency Portfolio',
        deliveredAt: '2024-11-23',
        expiresAt: '2025-11-23',
        status: 'Delivered',
        coverImage: '/images/background-grid.svg',
        assets: [],
        totalStorageBytes: 0,
        totalStorageFormatted: '0 B',
        storageSummary: { assetCount: 0, totalBytes: 0, formattedTotal: '0 B' },
        customFields: {
            deliveryEmail: 'hello@lumen.studio'
        }
    },
    {
        id: 'gal-10',
        client: 'Beacon Realty',
        shootType: 'Property Showcase',
        deliveredAt: '2024-10-12',
        expiresAt: '2025-10-12',
        status: 'Delivered',
        coverImage: '/images/hero2.svg',
        assets: [],
        totalStorageBytes: 0,
        totalStorageFormatted: '0 B',
        storageSummary: { assetCount: 0, totalBytes: 0, formattedTotal: '0 B' },
        reminderSentAt: '2025-09-12T18:00:00.000Z'
    }
];

export const tasks: TaskRecord[] = [
    {
        id: 'task-01',
        title: 'Send Harrison & June final timeline',
        dueDate: '2025-05-07',
        assignee: 'You',
        completed: false
    },
    {
        id: 'task-02',
        title: 'Cull and edit Sona Patel preview set',
        dueDate: '2025-05-06',
        assignee: 'Retouch Team',
        completed: false
    },
    {
        id: 'task-03',
        title: 'Email Evelyn gallery delivery details',
        dueDate: '2025-05-03',
        assignee: 'You',
        completed: true
    }
];

export const projectPipeline: ProjectRecord[] = [
    {
        id: 'proj-01',
        name: 'Evergreen HQ Refresh',
        client: 'Evergreen Architects',
        description: 'Quarterly content retainer covering headshots, office culture, and construction progress.',
        startDate: '2025-03-01',
        endDate: '2025-06-01',
        shoots: [
            {
                id: 'proj-01-shoot-1',
                date: '2025-03-16',
                label: 'Site progress walkthrough',
                status: 'Confirmed',
                location: 'Oakland Waterfront'
            },
            {
                id: 'proj-01-shoot-2',
                date: '2025-05-29',
                label: 'Executive portraits',
                status: 'Pending',
                location: 'Financial District HQ'
            },
            {
                id: 'proj-01-shoot-3',
                date: '2025-04-05',
                label: 'Interior design vignette set',
                status: 'Editing',
                location: 'Mission District Loft'
            }
        ],
        invoices: [
            { id: '1033', amount: 1650, status: 'Paid', dueDate: '2025-03-19' },
            { id: '1036', amount: 2100, status: 'Sent', dueDate: '2025-05-31' }
        ],
        progress: 0.68,
        tags: ['Retainer', 'B2B']
    },
    {
        id: 'proj-02',
        name: 'Harrison & June Wedding',
        client: 'Harrison & June',
        description: 'Three-day coverage including welcome dinner, ceremony, and post-event gallery delivery.',
        startDate: '2025-05-16',
        endDate: '2025-05-19',
        shoots: [
            {
                id: 'proj-02-shoot-1',
                date: '2025-05-17',
                label: 'Welcome dinner storytelling',
                status: 'Pending',
                location: 'Terranea Resort'
            },
            {
                id: 'proj-02-shoot-2',
                date: '2025-05-18',
                label: 'Wedding day coverage',
                status: 'Confirmed',
                location: 'Terranea Resort'
            },
            {
                id: 'proj-02-shoot-3',
                date: '2025-05-21',
                label: 'Gallery selects + album design',
                status: 'Editing',
                location: 'Studio HQ'
            }
        ],
        invoices: [
            { id: '1030', amount: 5200, status: 'Overdue', dueDate: '2025-05-18' },
            { id: '1034', amount: 1800, status: 'Draft', dueDate: '2025-05-25' }
        ],
        progress: 0.52,
        tags: ['Wedding', 'Album']
    },
    {
        id: 'proj-03',
        name: 'Sona Patel Brand Campaign',
        client: 'Sona Patel',
        description: 'Seasonal refresh for personal brand across lifestyle, product, and studio sessions.',
        startDate: '2025-04-15',
        endDate: '2025-06-10',
        shoots: [
            {
                id: 'proj-03-shoot-1',
                date: '2025-04-20',
                label: 'Concept moodboard + planning',
                status: 'Editing',
                location: 'Studio HQ'
            },
            {
                id: 'proj-03-shoot-2',
                date: '2025-05-21',
                label: 'Lifestyle content capture',
                status: 'Confirmed',
                location: 'Downtown Studio'
            },
            {
                id: 'proj-03-shoot-3',
                date: '2025-06-04',
                label: 'Product flat-lay refresh',
                status: 'Pending',
                location: 'Mission District Loft'
            }
        ],
        invoices: [
            { id: '1029', amount: 2400, status: 'Paid', dueDate: '2025-04-25' },
            { id: '1035', amount: 2750, status: 'Sent', dueDate: '2025-06-09' }
        ],
        progress: 0.74,
        tags: ['Brand', 'Campaign']
    }
];

