import * as React from 'react';

import type { GalleryAsset } from '../../data/crm';

type LightboxGalleryProps = {
    assets: GalleryAsset[];
    className?: string;
    thumbnailClassName?: string;
};

const combineClassNames = (...values: Array<string | undefined>): string =>
    values.filter(Boolean).join(' ');

const ZOOM_STEP = 0.25;
const MAX_ZOOM = 3;
const MIN_ZOOM = 1;

export function LightboxGallery({ assets, className, thumbnailClassName }: LightboxGalleryProps) {
    const [isOpen, setIsOpen] = React.useState(false);
    const [activeIndex, setActiveIndex] = React.useState(0);
    const [zoom, setZoom] = React.useState(1);

    const hasAssets = Boolean(assets && assets.length > 0);
    const activeAsset = hasAssets ? assets[activeIndex] : undefined;

    const openLightbox = React.useCallback(
        (index: number) => {
            if (!hasAssets) return;
            setActiveIndex(index);
            setZoom(1);
            setIsOpen(true);
        },
        [hasAssets]
    );

    const closeLightbox = React.useCallback(() => {
        setIsOpen(false);
        setZoom(1);
    }, []);

    const goToPrevious = React.useCallback(() => {
        setActiveIndex((prev) => {
            if (!assets || assets.length === 0) {
                return prev;
            }

            const nextIndex = prev - 1;
            return nextIndex < 0 ? assets.length - 1 : nextIndex;
        });
        setZoom(1);
    }, [assets]);

    const goToNext = React.useCallback(() => {
        setActiveIndex((prev) => {
            if (!assets || assets.length === 0) {
                return prev;
            }

            const nextIndex = prev + 1;
            return nextIndex >= assets.length ? 0 : nextIndex;
        });
        setZoom(1);
    }, [assets]);

    React.useEffect(() => {
        if (!isOpen) {
            return;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                closeLightbox();
            } else if (event.key === 'ArrowLeft') {
                event.preventDefault();
                goToPrevious();
            } else if (event.key === 'ArrowRight') {
                event.preventDefault();
                goToNext();
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, closeLightbox, goToNext, goToPrevious]);

    React.useEffect(() => {
        if (!isOpen) {
            return;
        }

        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = originalOverflow;
        };
    }, [isOpen]);

    const increaseZoom = React.useCallback(() => {
        setZoom((current) => Math.min(MAX_ZOOM, Number((current + ZOOM_STEP).toFixed(2))));
    }, []);

    const decreaseZoom = React.useCallback(() => {
        setZoom((current) => Math.max(MIN_ZOOM, Number((current - ZOOM_STEP).toFixed(2))));
    }, []);

    const resetZoom = React.useCallback(() => {
        setZoom(1);
    }, []);

    if (!hasAssets) {
        return (
            <div className={combineClassNames('rounded-xl border border-dashed border-slate-300 p-12 text-center text-slate-500', className)}>
                Lightbox view becomes available once assets have been uploaded.
            </div>
        );
    }

    return (
        <div className={combineClassNames('space-y-6', className)}>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900">Interactive lightbox</h3>
                        <p className="text-sm text-slate-500">Click any image to open the immersive lightbox with zoom controls.</p>
                    </div>
                    <div className="text-sm text-slate-500">
                        {assets.length} {assets.length === 1 ? 'asset' : 'assets'} available
                    </div>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {assets.map((asset, index) => (
                        <button
                            key={asset.id}
                            type="button"
                            onClick={() => openLightbox(index)}
                            className={combineClassNames(
                                'group relative aspect-[4/3] overflow-hidden rounded-xl bg-slate-100 shadow-sm ring-1 ring-black/5 transition duration-150 hover:-translate-y-1 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500',
                                thumbnailClassName
                            )}
                        >
                            <img
                                src={asset.publicUrl}
                                alt={asset.title ?? asset.caption ?? asset.fileName}
                                className="h-full w-full object-cover"
                                loading={index < 6 ? 'eager' : 'lazy'}
                            />
                            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent p-3 text-left text-white">
                                <p className="line-clamp-1 text-sm font-medium">
                                    {asset.title ?? asset.fileName}
                                </p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {isOpen && activeAsset ? (
                <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/90 backdrop-blur">
                    <div className="flex flex-col gap-4 px-6 pt-6 text-white sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="text-xs uppercase tracking-[0.3em] text-white/60">Lightbox view</p>
                            <h2 className="mt-1 text-2xl font-semibold">
                                {activeAsset.title ?? activeAsset.fileName}
                            </h2>
                            {activeAsset.caption ? (
                                <p className="mt-2 max-w-2xl text-sm text-white/80">{activeAsset.caption}</p>
                            ) : null}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                onClick={decreaseZoom}
                                className="rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                            >
                                Zoom -
                            </button>
                            <button
                                type="button"
                                onClick={resetZoom}
                                className="rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                            >
                                Reset
                            </button>
                            <button
                                type="button"
                                onClick={increaseZoom}
                                className="rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                            >
                                Zoom +
                            </button>
                            <button
                                type="button"
                                onClick={closeLightbox}
                                className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                            >
                                Close
                            </button>
                        </div>
                    </div>

                    <div className="relative flex flex-1 items-center justify-center px-6 pb-6">
                        <button
                            type="button"
                            onClick={goToPrevious}
                            className="absolute left-6 hidden h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:flex"
                            aria-label="View previous asset"
                        >
                            ◀
                        </button>
                        <div className="max-h-[80vh] w-full max-w-5xl overflow-hidden rounded-2xl bg-black/30 p-4">
                            <img
                                src={activeAsset.publicUrl}
                                alt={activeAsset.title ?? activeAsset.caption ?? activeAsset.fileName}
                                style={{ transform: `scale(${zoom})` }}
                                className="mx-auto max-h-[72vh] w-full object-contain transition-transform duration-200 ease-out"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={goToNext}
                            className="absolute right-6 hidden h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:flex"
                            aria-label="View next asset"
                        >
                            ▶
                        </button>
                    </div>

                    <div className="flex gap-3 overflow-x-auto px-6 pb-8">
                        {assets.map((asset, index) => (
                            <button
                                key={asset.id}
                                type="button"
                                onClick={() => openLightbox(index)}
                                className={combineClassNames(
                                    'relative flex h-20 w-28 shrink-0 overflow-hidden rounded-lg ring-2 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white',
                                    index === activeIndex ? 'ring-white' : 'ring-transparent hover:ring-white/40'
                                )}
                            >
                                <img src={asset.publicUrl} alt={asset.title ?? asset.fileName} className="h-full w-full object-cover" />
                                {index === activeIndex ? (
                                    <span className="pointer-events-none absolute inset-0 rounded-lg ring-2 ring-offset-2 ring-offset-black/30 ring-white" />
                                ) : null}
                            </button>
                        ))}
                    </div>
                </div>
            ) : null}
        </div>
    );
}

export default LightboxGallery;
