import * as React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import type { GetStaticPaths, GetStaticProps, InferGetStaticPropsType, NextPage } from 'next';
import dayjs from 'dayjs';

import {
    galleryCollection,
    type GalleryAsset,
    type GalleryPortalSettings,
    type GalleryPortalView,
    type GalleryRecord
} from '../../data/crm';
import { CarouselGallery, LightboxGallery, PinterestMasonryGrid } from '../../components/gallery';

type GalleryPortalPageProps = {
    gallery: GalleryRecord;
};

type AuthFormElements = HTMLFormElement & {
    portalSecret: HTMLInputElement;
};

const VIEW_DEFINITIONS: Record<GalleryPortalView, { label: string; description: string }> = {
    pinterest: {
        label: 'Pinterest grid',
        description: 'Organic masonry layout ideal for storytelling and social selects.'
    },
    lightbox: {
        label: 'Lightbox',
        description: 'Immersive full-screen viewer with zoom and keyboard navigation.'
    },
    carousel: {
        label: 'Carousel',
        description: 'Auto-playing hero carousel highlighting marquee scenes.'
    }
};

const computeAvailableViews = (settings?: GalleryPortalSettings): GalleryPortalView[] => {
    const whitelist: GalleryPortalView[] = ['pinterest', 'lightbox', 'carousel'];
    if (!settings?.availableViews || settings.availableViews.length === 0) {
        return whitelist;
    }

    const normalized = settings.availableViews.filter((view): view is GalleryPortalView =>
        whitelist.includes(view as GalleryPortalView)
    );

    return normalized.length > 0 ? normalized : whitelist;
};

const safeCompare = (valueA?: string | null, valueB?: string | null) => {
    if (!valueA || !valueB) {
        return false;
    }
    return valueA.trim() === valueB.trim();
};

const formatDate = (value?: string) => {
    if (!value) {
        return null;
    }

    const parsed = dayjs(value);
    return parsed.isValid() ? parsed.format('MMM D, YYYY') : value;
};

const GalleryPortalPage: NextPage<InferGetStaticPropsType<typeof getStaticProps>> = ({ gallery }) => {
    const router = useRouter();

    const assets: GalleryAsset[] = React.useMemo(() => gallery.assets ?? [], [gallery.assets]);
    const availableViews = React.useMemo(() => computeAvailableViews(gallery.portalSettings), [gallery.portalSettings]);
    const initialView = React.useMemo(() => {
        const preferred = gallery.portalSettings?.defaultView;
        if (preferred && availableViews.includes(preferred)) {
            return preferred;
        }
        return availableViews[0];
    }, [availableViews, gallery.portalSettings?.defaultView]);

    const [activeView, setActiveView] = React.useState<GalleryPortalView>(initialView);
    const [isAuthenticated, setIsAuthenticated] = React.useState<boolean>(() => {
        const requiresCredential = Boolean(gallery.portalSettings?.password || gallery.portalSettings?.token);
        return !requiresCredential;
    });
    const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
    const [pendingCredential, setPendingCredential] = React.useState('');

    React.useEffect(() => {
        if (availableViews.includes(activeView)) {
            return;
        }
        setActiveView(availableViews[0]);
    }, [availableViews, activeView]);

    React.useEffect(() => {
        if (!gallery.portalSettings?.token) {
            return;
        }

        const queryToken = Array.isArray(router.query.token) ? router.query.token[0] : router.query.token;
        if (queryToken && safeCompare(queryToken, gallery.portalSettings.token)) {
            setIsAuthenticated(true);
            setErrorMessage(null);
        }
    }, [router.query, gallery.portalSettings?.token]);

    const handleCredentialSubmit = React.useCallback(
        (value: string) => {
            const trimmed = value.trim();
            if (!trimmed) {
                setErrorMessage('Enter the password or one-time token shared with you.');
                return;
            }

            const matchesPassword = safeCompare(trimmed, gallery.portalSettings?.password);
            const matchesToken = safeCompare(trimmed, gallery.portalSettings?.token);

            if (matchesPassword || matchesToken) {
                setIsAuthenticated(true);
                setErrorMessage(null);
                return;
            }

            setErrorMessage('That code is incorrect. Double-check your invitation email and try again.');
        },
        [gallery.portalSettings?.password, gallery.portalSettings?.token]
    );

    const handleSubmit = React.useCallback(
        (event: React.FormEvent<AuthFormElements>) => {
            event.preventDefault();
            handleCredentialSubmit(event.currentTarget.portalSecret.value);
        },
        [handleCredentialSubmit]
    );

    React.useEffect(() => {
        setPendingCredential('');
    }, [isAuthenticated]);

    if (router.isFallback) {
        return <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">Loading portal…</div>;
    }

    const heroImage = gallery.coverImage ?? '/images/main-hero.jpg';
    const welcomeMessage = gallery.portalSettings?.welcomeMessage;

    const statusItems = [
        { label: 'Shoot type', value: gallery.shootType },
        { label: 'Status', value: gallery.status },
        { label: 'Delivery due', value: formatDate(gallery.deliveryDueDate) },
        { label: 'Delivered', value: formatDate(gallery.deliveredAt) },
        { label: 'Expires', value: formatDate(gallery.expiresAt) },
        { label: 'Assets', value: assets.length ? `${assets.length} files` : 'Not yet available' }
    ].filter((item) => Boolean(item.value));

    const activeViewDescription = VIEW_DEFINITIONS[activeView]?.description;

    return (
        <>
            <Head>
                <title>{gallery.client} | Client portal</title>
                <meta
                    name="description"
                    content={welcomeMessage ?? `Private gallery portal for ${gallery.client}.`}
                />
            </Head>
            {!isAuthenticated ? (
                <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-16 text-white">
                    <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-slate-900/70 p-10 shadow-2xl backdrop-blur">
                        <p className="text-xs uppercase tracking-[0.3em] text-white/60">Secure portal</p>
                        <h1 className="mt-3 text-3xl font-semibold leading-tight">Enter your gallery password</h1>
                        <p className="mt-3 text-sm text-white/70">
                            {welcomeMessage ?? 'This gallery is protected. Use the access code shared via email or text.'}
                        </p>
                        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                            <div>
                                <label htmlFor="portalSecret" className="text-sm font-medium text-white">
                                    Access code
                                </label>
                                <input
                                    id="portalSecret"
                                    name="portalSecret"
                                    type="password"
                                    autoComplete="off"
                                    value={pendingCredential}
                                    onChange={(event) => setPendingCredential(event.target.value)}
                                    className="mt-2 w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-base text-white placeholder:text-white/50 focus:border-white focus:outline-none focus:ring-2 focus:ring-white"
                                    placeholder="Enter password or token"
                                />
                                {gallery.portalSettings?.hint ? (
                                    <p className="mt-2 text-xs text-white/60">Hint: {gallery.portalSettings.hint}</p>
                                ) : null}
                                {errorMessage ? <p className="mt-2 text-sm text-rose-300">{errorMessage}</p> : null}
                            </div>
                            <button
                                type="submit"
                                className="w-full rounded-xl bg-white py-3 text-base font-semibold text-slate-900 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                            >
                                Unlock gallery
                            </button>
                        </form>
                    </div>
                </main>
            ) : (
                <main className="min-h-screen bg-slate-950 text-white">
                    <section className="relative isolate overflow-hidden">
                        <div className="absolute inset-0">
                            <img src={heroImage} alt="" className="h-full w-full object-cover opacity-40" />
                            <div className="absolute inset-0 bg-slate-950/70" />
                        </div>
                        <div className="relative z-10 mx-auto flex max-w-5xl flex-col gap-8 px-6 py-24 sm:px-10">
                            <div>
                                <p className="text-xs uppercase tracking-[0.3em] text-white/60">Client portal</p>
                                <h1 className="mt-3 text-4xl font-semibold sm:text-5xl">{gallery.client}</h1>
                                <p className="mt-4 max-w-2xl text-base text-white/80">
                                    {welcomeMessage ?? 'Your session highlights, ready to view, share, and download.'}
                                </p>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {statusItems.map((item) => (
                                    <div key={item.label} className="rounded-2xl border border-white/15 bg-white/5 p-4 backdrop-blur">
                                        <p className="text-xs uppercase tracking-wider text-white/60">{item.label}</p>
                                        <p className="mt-2 text-lg font-semibold text-white">{item.value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    <section className="relative -mt-12 px-6 pb-24 sm:px-10">
                        <div className="mx-auto max-w-6xl rounded-3xl border border-white/5 bg-white/95 p-8 text-slate-900 shadow-2xl">
                            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                                <div>
                                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Presentation mode</p>
                                    <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                                        {VIEW_DEFINITIONS[activeView]?.label ?? 'Gallery view'}
                                    </h2>
                                    {activeViewDescription ? (
                                        <p className="mt-2 max-w-xl text-sm text-slate-500">{activeViewDescription}</p>
                                    ) : null}
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    {availableViews.map((viewOption) => (
                                        <button
                                            key={viewOption}
                                            type="button"
                                            onClick={() => setActiveView(viewOption)}
                                            className={
                                                viewOption === activeView
                                                    ? 'rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow'
                                                    : 'rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-200'
                                            }
                                        >
                                            {VIEW_DEFINITIONS[viewOption]?.label ?? viewOption}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="mt-8 space-y-6">
                                {activeView === 'pinterest' ? (
                                    <PinterestMasonryGrid assets={assets} />
                                ) : null}
                                {activeView === 'lightbox' ? <LightboxGallery assets={assets} /> : null}
                                {activeView === 'carousel' ? <CarouselGallery assets={assets} /> : null}
                            </div>
                        </div>
                    </section>
                </main>
            )}
        </>
    );
};

export const getStaticPaths: GetStaticPaths = async () => {
    return {
        paths: galleryCollection.map((gallery) => ({ params: { galleryId: gallery.id } })),
        fallback: false
    };
};

export const getStaticProps: GetStaticProps<GalleryPortalPageProps> = async ({ params }) => {
    const galleryIdParam = Array.isArray(params?.galleryId) ? params?.galleryId[0] : params?.galleryId;

    const gallery = galleryCollection.find((item) => item.id === galleryIdParam);

    if (!gallery) {
        return {
            notFound: true
        };
    }

    return {
        props: {
            gallery
        }
    };
};

export default GalleryPortalPage;
