import type { GetStaticProps } from 'next';
import Link from 'next/link';
import { useState } from 'react';
import { CRMLayout } from '../../components/crm/CRMLayout';
import { GalleryUploader } from '../../components/crm/GalleryUploader';
import type { Client, Gallery } from '../../lib/mock-data';
import { createGallery, getClients, getGalleries } from '../../lib/api';

interface GalleryPageProps {
    clients: Client[];
    galleries: Gallery[];
}

export default function GalleryPage({ clients, galleries: initialGalleries }: GalleryPageProps) {
    const [galleries, setGalleries] = useState(initialGalleries);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);

    async function handleCreateGallery(payload: Parameters<typeof createGallery>[0]) {
        const newGallery = await createGallery(payload);
        setGalleries((prev) => [newGallery, ...prev]);
        const client = clients.find((item) => item.id === newGallery.clientId);
        setStatusMessage(`Gallery "${newGallery.title}" drafted for ${client?.name ?? 'client'}.`);
        setTimeout(() => setStatusMessage(null), 4000);
    }

    return (
        <CRMLayout
            title="Gallery Delivery"
            description="Build password protected galleries, track delivery dates and make it effortless for clients to download files."
            actions={
                <Link
                    href="/settings"
                    className="inline-flex items-center rounded-lg border border-emerald-500/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-300 transition hover:border-emerald-300 hover:text-emerald-200"
                >
                    Configure branding
                </Link>
            }
        >
            <GalleryUploader clients={clients} galleries={galleries} onCreate={handleCreateGallery} />
            {statusMessage && (
                <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-center text-xs text-emerald-200">
                    {statusMessage}
                </p>
            )}
        </CRMLayout>
    );
}

export const getStaticProps: GetStaticProps<GalleryPageProps> = async () => {
    const [clientsData, galleriesData] = await Promise.all([getClients(), getGalleries()]);
    return {
        props: {
            clients: clientsData,
            galleries: galleriesData
        }
    };
};
