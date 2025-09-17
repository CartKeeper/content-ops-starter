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
    width?: number;
    height?: number;
    title?: string;
    caption?: string;
};

export type GalleryPortalView = 'pinterest' | 'lightbox' | 'carousel';

export type GalleryPortalSettings = {
    password?: string;
    token?: string;
    hint?: string;
    welcomeMessage?: string;
    defaultView?: GalleryPortalView;
    availableViews?: GalleryPortalView[];
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
    portalSettings?: GalleryPortalSettings;
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

export type AdminUser = {
    name: string;
    role: string;
    email: string;
    phone?: string;
    avatar: string;
    status?: string;
};

export const adminUser: AdminUser = {
    name: 'Avery Logan',
    role: 'Studio Admin',
    email: 'avery@codex.studio',
    phone: '+1 (415) 555-0114',
    avatar: '/images/avatar1.svg',
    status: 'Online'
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
        assets: [
            {
                id: 'gal-01-asset-01',
                fileName: 'aurora-dunes.svg',
                contentType: 'image/svg+xml',
                size: 512000,
                storageBucket: 'public',
                storagePath: 'galleries/gal-01/aurora-dunes.svg',
                publicUrl: '/images/galleries/aurora-dunes.svg',
                width: 1600,
                height: 1000,
                title: 'Sunset over the dunes',
                caption: 'A sweeping view captured just after golden hour.'
            },
            {
                id: 'gal-01-asset-02',
                fileName: 'golden-hour-ridge.svg',
                contentType: 'image/svg+xml',
                size: 468000,
                storageBucket: 'public',
                storagePath: 'galleries/gal-01/golden-hour-ridge.svg',
                publicUrl: '/images/galleries/golden-hour-ridge.svg',
                width: 1000,
                height: 1600,
                title: 'Golden ridge embrace',
                caption: 'Portraits along the windswept ridge moments before sunset.'
            },
            {
                id: 'gal-01-asset-03',
                fileName: 'seaside-trail.svg',
                contentType: 'image/svg+xml',
                size: 489000,
                storageBucket: 'public',
                storagePath: 'galleries/gal-01/seaside-trail.svg',
                publicUrl: '/images/galleries/seaside-trail.svg',
                width: 1600,
                height: 960,
                title: 'Coastal path walk',
                caption: 'Candid laughter along the bluffs.'
            },
            {
                id: 'gal-01-asset-04',
                fileName: 'botanical-study.svg',
                contentType: 'image/svg+xml',
                size: 420000,
                storageBucket: 'public',
                storagePath: 'galleries/gal-01/botanical-study.svg',
                publicUrl: '/images/galleries/botanical-study.svg',
                width: 1400,
                height: 1400,
                title: 'Details in the greenhouse',
                caption: 'Close-up details from the greenhouse mini session.'
            },
            {
                id: 'gal-01-asset-05',
                fileName: 'artisan-details.svg',
                contentType: 'image/svg+xml',
                size: 398000,
                storageBucket: 'public',
                storagePath: 'galleries/gal-01/artisan-details.svg',
                publicUrl: '/images/galleries/artisan-details.svg',
                width: 1000,
                height: 1500,
                title: 'Heirloom keepsakes',
                caption: 'Flat-lay featuring stationery and rings.'
            },
            {
                id: 'gal-01-asset-06',
                fileName: 'craftsmanship.svg',
                contentType: 'image/svg+xml',
                size: 536000,
                storageBucket: 'public',
                storagePath: 'galleries/gal-01/craftsmanship.svg',
                publicUrl: '/images/galleries/craftsmanship.svg',
                width: 1600,
                height: 900,
                title: 'Reception setup',
                caption: 'Soft-lit reception tables moments before guests arrived.'
            }
        ],
        totalStorageBytes: 2823000,
        totalStorageFormatted: '2.82 MB',
        storageSummary: { assetCount: 6, totalBytes: 2823000, formattedTotal: '2.82 MB' },
        portalSettings: {
            password: 'wanderlust-love',
            token: 'evelyn-portal',
            hint: 'Use the phrase we texted after your session.',
            welcomeMessage: 'Hi Evelyn! Relive your engagement weekend highlights here.',
            defaultView: 'pinterest',
            availableViews: ['pinterest', 'lightbox', 'carousel']
        }
    },
    {
        id: 'gal-02',
        client: 'Harrison & June',
        shootType: 'Wedding Weekend',
        deliveryDueDate: '2025-05-27',
        status: 'Pending',
        projectId: 'proj-02',
        coverImage: '/images/hero3.svg',
        assets: [
            {
                id: 'gal-02-asset-01',
                fileName: 'collaboration.svg',
                contentType: 'image/svg+xml',
                size: 548000,
                storageBucket: 'public',
                storagePath: 'galleries/gal-02/collaboration.svg',
                publicUrl: '/images/galleries/collaboration.svg',
                width: 1600,
                height: 900,
                title: 'Celebration welcome party',
                caption: 'Welcome party toasts at the rooftop venue.'
            },
            {
                id: 'gal-02-asset-02',
                fileName: 'skyline-dusk.svg',
                contentType: 'image/svg+xml',
                size: 502000,
                storageBucket: 'public',
                storagePath: 'galleries/gal-02/skyline-dusk.svg',
                publicUrl: '/images/galleries/skyline-dusk.svg',
                width: 1600,
                height: 1000,
                title: 'City skyline portraits',
                caption: 'Evening skyline portraits with the couple.'
            },
            {
                id: 'gal-02-asset-03',
                fileName: 'cobalt-harbor.svg',
                contentType: 'image/svg+xml',
                size: 486000,
                storageBucket: 'public',
                storagePath: 'galleries/gal-02/cobalt-harbor.svg',
                publicUrl: '/images/galleries/cobalt-harbor.svg',
                width: 1600,
                height: 1060,
                title: 'Harbor rehearsal dinner',
                caption: 'Reflections from the harbor-side rehearsal dinner.'
            },
            {
                id: 'gal-02-asset-04',
                fileName: 'studio-session.svg',
                contentType: 'image/svg+xml',
                size: 472000,
                storageBucket: 'public',
                storagePath: 'galleries/gal-02/studio-session.svg',
                publicUrl: '/images/galleries/studio-session.svg',
                width: 1600,
                height: 1100,
                title: 'Editorial studio portraits',
                caption: 'Clean studio portrait series for the couple.'
            }
        ],
        totalStorageBytes: 2008000,
        totalStorageFormatted: '2.01 MB',
        storageSummary: { assetCount: 4, totalBytes: 2008000, formattedTotal: '2.01 MB' },
        customFields: {
            deliveryEmail: 'hello@harrisonandjune.com'
        },
        portalSettings: {
            password: 'hj-weekend-2025',
            hint: 'It combines your initials with the event year.',
            welcomeMessage: 'Welcome back! Your full wedding weekend story is ready.',
            defaultView: 'carousel',
            availableViews: ['carousel', 'lightbox', 'pinterest']
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
        assets: [
            {
                id: 'gal-03-asset-01',
                fileName: 'studio-session.svg',
                contentType: 'image/svg+xml',
                size: 458000,
                storageBucket: 'public',
                storagePath: 'galleries/gal-03/studio-session.svg',
                publicUrl: '/images/galleries/studio-session.svg',
                width: 1600,
                height: 1100,
                title: 'Launch hero scene',
                caption: 'Primary hero scene for the lifestyle campaign.'
            },
            {
                id: 'gal-03-asset-02',
                fileName: 'collaboration.svg',
                contentType: 'image/svg+xml',
                size: 446000,
                storageBucket: 'public',
                storagePath: 'galleries/gal-03/collaboration.svg',
                publicUrl: '/images/galleries/collaboration.svg',
                width: 1600,
                height: 900,
                title: 'Team ideation',
                caption: 'Creative team collaborating during concept exploration.'
            },
            {
                id: 'gal-03-asset-03',
                fileName: 'craftsmanship.svg',
                contentType: 'image/svg+xml',
                size: 430000,
                storageBucket: 'public',
                storagePath: 'galleries/gal-03/craftsmanship.svg',
                publicUrl: '/images/galleries/craftsmanship.svg',
                width: 1600,
                height: 900,
                title: 'Product detail vignette',
                caption: 'Handcrafted materials styled for the product story.'
            }
        ],
        totalStorageBytes: 1334000,
        totalStorageFormatted: '1.33 MB',
        storageSummary: { assetCount: 3, totalBytes: 1334000, formattedTotal: '1.33 MB' },
        customFields: {
            deliveryEmail: 'sona@patelcreative.co'
        },
        portalSettings: {
            token: 'sona-brand-access',
            hint: 'Use the token shared in your kickoff recap.',
            welcomeMessage: 'Sona, download final selects for the campaign launch.',
            defaultView: 'lightbox',
            availableViews: ['lightbox', 'pinterest']
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

