import type { IconType } from 'react-icons';
import {
    SiGoogleanalytics,
    SiGoogledrive,
    SiGooglemeet,
    SiGooglephotos,
    SiGooglecalendar,
    SiGmail,
    SiGooglechat,
    SiGoogleads
} from 'react-icons/si';
import {
    FaFacebookF,
    FaInstagram,
    FaPinterestP,
    FaYoutube,
    FaLinkedinIn,
    FaXTwitter
} from 'react-icons/fa6';
import { SiTiktok } from 'react-icons/si';

export type IntegrationCategoryId = 'google' | 'social';

export type IntegrationDefinition = {
    id: string;
    name: string;
    shortName: string;
    description: string;
    href: string;
    categoryId: IntegrationCategoryId;
    icon: IconType;
    iconColor?: string;
    background: string;
    badgeColor: string;
};

export type IntegrationCategory = {
    id: IntegrationCategoryId;
    label: string;
};

export const INTEGRATION_CATEGORIES: IntegrationCategory[] = [
    { id: 'google', label: 'Google Workspace' },
    { id: 'social', label: 'Social Launchpad' }
];

export const INTEGRATION_DEFINITIONS: IntegrationDefinition[] = [
    {
        id: 'google-drive',
        name: 'Google Drive',
        shortName: 'GD',
        description: 'Sync project folders and delivery files automatically.',
        href: 'https://drive.google.com',
        categoryId: 'google',
        icon: SiGoogledrive,
        iconColor: '#0f9d58',
        background: 'linear-gradient(135deg, #e0f2f1 0%, #e0f7fa 100%)',
        badgeColor: '#10b981'
    },
    {
        id: 'google-calendar',
        name: 'Google Calendar',
        shortName: 'GC',
        description: 'Push confirmed shoots and reminders to your personal calendar.',
        href: 'https://calendar.google.com',
        categoryId: 'google',
        icon: SiGooglecalendar,
        iconColor: '#2563eb',
        background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)',
        badgeColor: '#6366f1'
    },
    {
        id: 'google-meet',
        name: 'Google Meet',
        shortName: 'GM',
        description: 'Launch virtual consultations and reviews.',
        href: 'https://meet.google.com',
        categoryId: 'google',
        icon: SiGooglemeet,
        iconColor: '#047857',
        background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
        badgeColor: '#14b8a6'
    },
    {
        id: 'google-photos',
        name: 'Google Photos',
        shortName: 'GP',
        description: 'Reference archived shoots and mood boards.',
        href: 'https://photos.google.com',
        categoryId: 'google',
        icon: SiGooglephotos,
        iconColor: '#db2777',
        background: 'linear-gradient(135deg, #ffe4e6 0%, #fce7f3 100%)',
        badgeColor: '#ec4899'
    },
    {
        id: 'google-analytics',
        name: 'Google Analytics',
        shortName: 'GA',
        description: 'Monitor marketing funnels and site traffic.',
        href: 'https://analytics.google.com',
        categoryId: 'google',
        icon: SiGoogleanalytics,
        iconColor: '#c2410c',
        background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
        badgeColor: '#f59e0b'
    },
    {
        id: 'google-ads',
        name: 'Google Ads',
        shortName: 'GA',
        description: 'Review campaign performance and lead flow.',
        href: 'https://ads.google.com',
        categoryId: 'google',
        icon: SiGoogleads,
        iconColor: '#1d4ed8',
        background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
        badgeColor: '#3b82f6'
    },
    {
        id: 'gmail',
        name: 'Gmail',
        shortName: 'GM',
        description: 'Check client conversations and send follow-ups.',
        href: 'https://mail.google.com',
        categoryId: 'google',
        icon: SiGmail,
        iconColor: '#dc2626',
        background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
        badgeColor: '#ef4444'
    },
    {
        id: 'google-chat',
        name: 'Google Chat',
        shortName: 'GC',
        description: 'Coordinate quickly with collaborators and stylists.',
        href: 'https://chat.google.com',
        categoryId: 'google',
        icon: SiGooglechat,
        iconColor: '#0ea5e9',
        background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)',
        badgeColor: '#38bdf8'
    },
    {
        id: 'instagram-business',
        name: 'Instagram Business',
        shortName: 'IG',
        description: 'Schedule reels and carousels directly from project galleries.',
        href: 'https://business.instagram.com',
        categoryId: 'social',
        icon: FaInstagram,
        iconColor: '#ffffff',
        background: 'linear-gradient(135deg, #f97316 0%, #ec4899 50%, #6366f1 100%)',
        badgeColor: '#db2777'
    },
    {
        id: 'facebook-pages',
        name: 'Facebook Pages',
        shortName: 'FB',
        description: 'Connect with leads and publish announcements.',
        href: 'https://www.facebook.com/pages/creation/',
        categoryId: 'social',
        icon: FaFacebookF,
        iconColor: '#ffffff',
        background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
        badgeColor: '#2563eb'
    },
    {
        id: 'pinterest',
        name: 'Pinterest',
        shortName: 'PN',
        description: 'Curate inspiration boards for upcoming shoots.',
        href: 'https://www.pinterest.com',
        categoryId: 'social',
        icon: FaPinterestP,
        iconColor: '#ffffff',
        background: 'linear-gradient(135deg, #f87171 0%, #ef4444 100%)',
        badgeColor: '#ef4444'
    },
    {
        id: 'tiktok',
        name: 'TikTok',
        shortName: 'TT',
        description: 'Publish highlight reels and client testimonials.',
        href: 'https://www.tiktok.com',
        categoryId: 'social',
        icon: SiTiktok,
        iconColor: '#0f172a',
        background: 'linear-gradient(135deg, #0ea5e9 0%, #f43f5e 100%)',
        badgeColor: '#0ea5e9'
    },
    {
        id: 'youtube',
        name: 'YouTube',
        shortName: 'YT',
        description: 'Upload full recaps and client testimonials.',
        href: 'https://studio.youtube.com',
        categoryId: 'social',
        icon: FaYoutube,
        iconColor: '#ffffff',
        background: 'linear-gradient(135deg, #f87171 0%, #ef4444 100%)',
        badgeColor: '#dc2626'
    },
    {
        id: 'linkedin',
        name: 'LinkedIn',
        shortName: 'LI',
        description: 'Share case studies and book brand partnerships.',
        href: 'https://www.linkedin.com',
        categoryId: 'social',
        icon: FaLinkedinIn,
        iconColor: '#ffffff',
        background: 'linear-gradient(135deg, #60a5fa 0%, #2563eb 100%)',
        badgeColor: '#2563eb'
    },
    {
        id: 'x-twitter',
        name: 'X (Twitter)',
        shortName: 'XT',
        description: 'Announce launches and connect with collaborators.',
        href: 'https://twitter.com',
        categoryId: 'social',
        icon: FaXTwitter,
        iconColor: '#ffffff',
        background: 'linear-gradient(135deg, #0f172a 0%, #334155 100%)',
        badgeColor: '#0f172a'
    }
];

export const INTEGRATION_DEFINITION_MAP: Record<string, IntegrationDefinition> = Object.fromEntries(
    INTEGRATION_DEFINITIONS.map((definition) => [definition.id, definition])
);
