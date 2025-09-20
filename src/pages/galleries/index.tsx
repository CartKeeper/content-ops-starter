import * as React from 'react';
import Head from 'next/head';
import dayjs from 'dayjs';

import { CrmAuthGuard, SectionCard, StatCard, StatusPill, WorkspaceLayout, type StatusTone } from '../../components/crm';
import { FolderIcon, GalleryIcon, UsersIcon } from '../../components/crm/icons';
import type { GalleryStatus } from '../../data/crm';

const numberFormatter = new Intl.NumberFormat('en-US');

const galleryStatusToneMap: Record<GalleryStatus, StatusTone> = {
    Delivered: 'success',
    Pending: 'warning'
};

const BYTES_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

function formatBytes(value: number | null): string {
    if (!Number.isFinite(value) || value === null) {
        return '—';
    }

    let size = value;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < BYTES_UNITS.length - 1) {
        size /= 1024;
        unitIndex += 1;
    }

    return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${BYTES_UNITS[unitIndex]}`;
}

function formatDate(value: string | null): string {
    if (!value) {
        return '—';
    }

    const parsed = dayjs(value);
    return parsed.isValid() ? parsed.format('MMM D, YYYY') : '—';
}

function formatTimestamp(value: string | null): string {
    if (!value) {
        return '—';
    }

    const parsed = dayjs(value);
    return parsed.isValid() ? parsed.format('MMM D, YYYY h:mm A') : '—';
}

type GallerySummary = {
    id: string;
    clientId: string | null;
    clientName: string | null;
    clientEmail: string | null;
    shootType: string;
    status: GalleryStatus;
    deliveryDueDate: string | null;
    deliveredAt: string | null;
    dropboxFolderPath: string | null;
    assetCount: number;
    previewUrls: string[];
    error?: string | null;
};

type GalleryImage = {
    id: string;
    name: string;
    pathDisplay: string | null;
    size: number | null;
    clientModified: string | null;
    previewUrl: string | null;
};

type GalleriesListResponse = {
    galleries: GallerySummary[];
    totals: {
        galleryCount: number;
        assetCount: number;
        connectedClients: number;
    };
};

type GalleryDetailResponse = {
    gallery: GallerySummary;
    images: GalleryImage[];
};

type ErrorResponse = {
    error: string;
};

type GalleriesResponse = GalleriesListResponse | GalleryDetailResponse | ErrorResponse;

function isListResponse(payload: GalleriesResponse): payload is GalleriesListResponse {
    return (payload as GalleriesListResponse).galleries !== undefined;
}

function isDetailResponse(payload: GalleriesResponse): payload is GalleryDetailResponse {
    const maybe = payload as GalleryDetailResponse;
    return maybe.gallery !== undefined && maybe.images !== undefined;
}

const initialTotals: GalleriesListResponse['totals'] = {
    galleryCount: 0,
    assetCount: 0,
    connectedClients: 0
};

function GalleriesDashboard() {
    const [summaries, setSummaries] = React.useState<GallerySummary[]>([]);
    const [totals, setTotals] = React.useState<GalleriesListResponse['totals']>(initialTotals);
    const [isLoadingSummary, setIsLoadingSummary] = React.useState(true);
    const [summaryError, setSummaryError] = React.useState<string | null>(null);
    const [selectedGalleryId, setSelectedGalleryId] = React.useState<string | null>(null);
    const [detail, setDetail] = React.useState<GalleryDetailResponse | null>(null);
    const [detailWarning, setDetailWarning] = React.useState<string | null>(null);
    const [detailError, setDetailError] = React.useState<string | null>(null);
    const [isLoadingDetail, setIsLoadingDetail] = React.useState(false);

    const fetchSummaries = React.useCallback(async () => {
        setIsLoadingSummary(true);
        setSummaryError(null);

        try {
            const response = await fetch('/api/galleries');
            if (!response.ok) {
                throw new Error(`Request failed with status ${response.status}`);
            }

            const payload = (await response.json()) as GalleriesResponse;

            if (isListResponse(payload)) {
                setSummaries(payload.galleries);
                setTotals(payload.totals);
                setSelectedGalleryId((current) => {
                    if (current && payload.galleries.some((entry) => entry.id === current)) {
                        return current;
                    }
                    return payload.galleries.length > 0 ? payload.galleries[0].id : null;
                });
                setSummaryError(null);
            } else if ('error' in payload) {
                throw new Error(payload.error);
            } else {
                throw new Error('Unexpected response payload while loading galleries.');
            }
        } catch (error) {
            console.error('Failed to load Dropbox galleries', error);
            setSummaries([]);
            setTotals(initialTotals);
            setSummaryError('Unable to load Dropbox galleries. Confirm credentials and try again.');
        } finally {
            setIsLoadingSummary(false);
        }
    }, []);

    const fetchGalleryDetail = React.useCallback(async (galleryId: string) => {
        setIsLoadingDetail(true);
        setDetailWarning(null);
        setDetailError(null);

        try {
            const response = await fetch(`/api/galleries?galleryId=${encodeURIComponent(galleryId)}`);
            if (!response.ok) {
                throw new Error(`Request failed with status ${response.status}`);
            }

            const payload = (await response.json()) as GalleriesResponse;

            if (isDetailResponse(payload)) {
                if (payload.gallery.id !== galleryId) {
                    return;
                }

                setDetail(payload);
                setDetailWarning(payload.gallery.error ?? null);
            } else if ('error' in payload) {
                setDetail(null);
                setDetailError(payload.error);
            } else {
                throw new Error('Unexpected response payload while loading gallery detail.');
            }
        } catch (error) {
            console.error(`Failed to load gallery ${galleryId}`, error);
            setDetail(null);
            setDetailError('Unable to load Dropbox assets for this gallery.');
        } finally {
            setIsLoadingDetail(false);
        }
    }, []);

    React.useEffect(() => {
        void fetchSummaries();
    }, [fetchSummaries]);

    React.useEffect(() => {
        if (!selectedGalleryId) {
            setDetail(null);
            setDetailWarning(null);
            setDetailError(null);
            return;
        }

        void fetchGalleryDetail(selectedGalleryId);
    }, [selectedGalleryId, fetchGalleryDetail]);

    const handleSelectGallery = React.useCallback((galleryId: string) => {
        setSelectedGalleryId(galleryId);
    }, []);

    const handleRefresh = React.useCallback(() => {
        void fetchSummaries().then(() => {
            setSelectedGalleryId((current) => {
                if (current) {
                    void fetchGalleryDetail(current);
                }
                return current;
            });
        });
    }, [fetchSummaries, fetchGalleryDetail]);

    const activeDetail = detail && detail.gallery.id === selectedGalleryId ? detail : null;
    const activeSummary = summaries.find((entry) => entry.id === selectedGalleryId) ?? null;
    const displayedGallery = activeDetail?.gallery ?? activeSummary ?? null;
    const displayedImages = activeDetail?.images ?? [];

    return (
        <WorkspaceLayout>
            <Head>
                <title>Galleries • Studio CRM</title>
            </Head>
            <div className="container-xl">
                <div className="row g-3 g-xl-4 align-items-stretch mb-3 mb-xl-4">
                    <div className="col-sm-6 col-xl-4">
                        <StatCard
                            title="Dropbox galleries"
                            value={numberFormatter.format(totals.galleryCount)}
                            change={0}
                            changeLabel="vs last sync"
                            icon={<GalleryIcon className="icon" />}
                        />
                    </div>
                    <div className="col-sm-6 col-xl-4">
                        <StatCard
                            title="Assets linked"
                            value={numberFormatter.format(totals.assetCount)}
                            change={0}
                            changeLabel="tracked in Dropbox"
                            icon={<FolderIcon className="icon" />}
                        />
                    </div>
                    <div className="col-sm-6 col-xl-4">
                        <StatCard
                            title="Active clients"
                            value={numberFormatter.format(totals.connectedClients)}
                            change={0}
                            changeLabel="connected to galleries"
                            icon={<UsersIcon className="icon" />}
                        />
                    </div>
                </div>
                <div className="row g-3 g-xl-4">
                    <div className="col-lg-5 col-xl-4">
                        <SectionCard
                            title="Gallery library"
                            description="Monitor each client gallery synced from Dropbox. Select a gallery to review its assets."
                        >
                            {summaryError ? (
                                <div className="alert alert-danger" role="status">
                                    {summaryError}
                                </div>
                            ) : null}
                            {isLoadingSummary ? (
                                <div className="placeholder-glow">
                                    {[0, 1, 2, 3].map((index) => (
                                        <div key={index} className="placeholder col-12 mb-3" style={{ height: '72px' }} />
                                    ))}
                                </div>
                            ) : summaries.length === 0 ? (
                                <div className="text-secondary text-center py-5">
                                    <GalleryIcon className="icon icon-lg text-secondary mb-3" />
                                    <p className="mb-0">No galleries available yet. Connect Dropbox to begin syncing.</p>
                                </div>
                            ) : (
                                <ul className="list-group list-group-flush">
                                    {summaries.map((gallery) => {
                                        const isActive = gallery.id === selectedGalleryId;
                                        const dropboxTone: StatusTone = gallery.error ? 'warning' : 'success';

                                        return (
                                            <li
                                                key={gallery.id}
                                                className={`list-group-item list-group-item-action px-0 ${
                                                    isActive ? 'active' : ''
                                                }`}
                                                role="button"
                                                onClick={() => handleSelectGallery(gallery.id)}
                                            >
                                                <div className="d-flex align-items-start gap-3">
                                                    <span className="avatar bg-primary-lt text-primary">
                                                        <GalleryIcon className="icon" />
                                                    </span>
                                                    <div className="flex-grow-1">
                                                        <div className="d-flex align-items-start justify-content-between gap-2">
                                                            <div>
                                                                <div className="fw-semibold">{gallery.clientName ?? 'Untitled gallery'}</div>
                                                                <div className="text-secondary small">{gallery.shootType}</div>
                                                                <div className="text-secondary small">
                                                                    {gallery.assetCount} {gallery.assetCount === 1 ? 'asset' : 'assets'}
                                                                </div>
                                                            </div>
                                                            <div className="d-flex flex-column gap-2 align-items-end">
                                                                <StatusPill tone={galleryStatusToneMap[gallery.status] ?? 'neutral'}>
                                                                    {gallery.status}
                                                                </StatusPill>
                                                                <StatusPill tone={dropboxTone}>
                                                                    {gallery.error ? 'Needs attention' : 'Dropbox linked'}
                                                                </StatusPill>
                                                            </div>
                                                        </div>
                                                        {gallery.error ? (
                                                            <p className="text-warning small mb-0 mt-2">{gallery.error}</p>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </SectionCard>
                    </div>
                    <div className="col-lg-7 col-xl-8">
                        <SectionCard
                            title={displayedGallery ? displayedGallery.shootType : 'Gallery detail'}
                            description={
                                displayedGallery
                                    ? `Managed for ${displayedGallery.clientName ?? 'client'} • Folder ${
                                          displayedGallery.dropboxFolderPath ?? 'not configured'
                                      }`
                                    : 'Select a gallery from the list to view Dropbox assets.'
                            }
                            action={
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={handleRefresh}
                                    disabled={isLoadingSummary || isLoadingDetail}
                                >
                                    Refresh Dropbox
                                </button>
                            }
                        >
                            {detailError ? (
                                <div className="alert alert-danger" role="status">
                                    {detailError}
                                </div>
                            ) : null}
                            {detailWarning ? (
                                <div className="alert alert-warning" role="status">
                                    {detailWarning}
                                </div>
                            ) : null}
                            {displayedGallery ? (
                                <div className="mb-4">
                                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                                        <div>
                                            <div className="fw-semibold">{displayedGallery.clientName}</div>
                                            <div className="text-secondary small">
                                                {displayedGallery.clientEmail ?? 'Client email unavailable'}
                                            </div>
                                        </div>
                                        <div className="d-flex gap-2">
                                            <StatusPill tone={galleryStatusToneMap[displayedGallery.status] ?? 'neutral'}>
                                                {displayedGallery.status}
                                            </StatusPill>
                                            <StatusPill tone={displayedGallery.dropboxFolderPath ? 'success' : 'warning'}>
                                                {displayedGallery.dropboxFolderPath ? 'Folder linked' : 'Folder missing'}
                                            </StatusPill>
                                        </div>
                                    </div>
                                    <dl className="row mt-3 mb-0 text-secondary small">
                                        <dt className="col-sm-4">Delivery due</dt>
                                        <dd className="col-sm-8">{formatDate(displayedGallery.deliveryDueDate)}</dd>
                                        <dt className="col-sm-4">Delivered</dt>
                                        <dd className="col-sm-8">{formatDate(displayedGallery.deliveredAt)}</dd>
                                        <dt className="col-sm-4">Dropbox folder</dt>
                                        <dd className="col-sm-8">
                                            {displayedGallery.dropboxFolderPath ? (
                                                <code>{displayedGallery.dropboxFolderPath}</code>
                                            ) : (
                                                <span className="text-warning">Not configured</span>
                                            )}
                                        </dd>
                                    </dl>
                                </div>
                            ) : null}

                            {isLoadingDetail ? (
                                <div className="placeholder-glow">
                                    <div className="row g-3 g-xl-4">
                                        {[0, 1, 2, 3, 4, 5].map((index) => (
                                            <div key={index} className="col-sm-6 col-xl-4">
                                                <div className="placeholder col-12" style={{ height: '180px' }} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : displayedImages.length === 0 ? (
                                <div className="text-secondary text-center py-5">
                                    <GalleryIcon className="icon icon-lg text-secondary mb-3" />
                                    <p className="mb-1">No Dropbox assets found for this gallery.</p>
                                    <p className="mb-0">Upload files to the connected folder and refresh to see them here.</p>
                                </div>
                            ) : (
                                <div className="row g-3 g-xl-4">
                                    {displayedImages.map((asset) => (
                                        <div key={asset.id} className="col-sm-6 col-xl-4 d-flex">
                                            <div className="card card-stacked shadow-sm w-100">
                                                <div className="ratio ratio-4x3 bg-secondary-subtle overflow-hidden">
                                                    {asset.previewUrl ? (
                                                        <img
                                                            src={asset.previewUrl}
                                                            alt={asset.name}
                                                            className="object-fit-cover"
                                                            loading="lazy"
                                                        />
                                                    ) : (
                                                        <div className="d-flex h-100 w-100 align-items-center justify-content-center text-secondary">
                                                            <GalleryIcon className="icon icon-lg" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="card-body">
                                                    <div className="fw-semibold text-truncate" title={asset.name}>
                                                        {asset.name}
                                                    </div>
                                                    <div className="text-secondary small text-truncate" title={asset.pathDisplay ?? ''}>
                                                        {asset.pathDisplay ?? 'Dropbox path unavailable'}
                                                    </div>
                                                    <div className="text-secondary small mt-2">
                                                        {formatBytes(asset.size)} • Updated {formatTimestamp(asset.clientModified)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </SectionCard>
                    </div>
                </div>
            </div>
        </WorkspaceLayout>
    );
}

export default function GalleriesPage() {
    return (
        <CrmAuthGuard>
            <GalleriesDashboard />
        </CrmAuthGuard>
    );
}
