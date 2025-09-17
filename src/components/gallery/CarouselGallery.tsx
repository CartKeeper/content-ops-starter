import * as React from 'react';

import type { GalleryAsset } from '../../data/crm';

type CarouselGalleryProps = {
    assets: GalleryAsset[];
    className?: string;
    autoPlayInterval?: number;
    showThumbnails?: boolean;
};

const combineClassNames = (...values: Array<string | undefined>): string =>
    values.filter(Boolean).join(' ');

const DEFAULT_AUTOPLAY_INTERVAL = 6000;

export function CarouselGallery({
    assets,
    className,
    autoPlayInterval = DEFAULT_AUTOPLAY_INTERVAL,
    showThumbnails = true
}: CarouselGalleryProps) {
    const [activeIndex, setActiveIndex] = React.useState(0);
    const assetCount = assets?.length ?? 0;

    const goToIndex = React.useCallback(
        (index: number) => {
            if (!assetCount) return;
            const normalizedIndex = (index + assetCount) % assetCount;
            setActiveIndex(normalizedIndex);
        },
        [assetCount]
    );

    const goToNext = React.useCallback(() => {
        goToIndex(activeIndex + 1);
    }, [activeIndex, goToIndex]);

    const goToPrevious = React.useCallback(() => {
        goToIndex(activeIndex - 1);
    }, [activeIndex, goToIndex]);

    React.useEffect(() => {
        if (!assetCount || autoPlayInterval <= 0) {
            return;
        }

        const timer = window.setInterval(() => {
            setActiveIndex((prev) => ((prev + 1) % assetCount + assetCount) % assetCount);
        }, autoPlayInterval);

        return () => window.clearInterval(timer);
    }, [autoPlayInterval, assetCount]);

    React.useEffect(() => {
        setActiveIndex(0);
    }, [assetCount]);

    if (!assetCount) {
        return (
            <div className={combineClassNames('rounded-xl border border-dashed border-slate-300 p-12 text-center text-slate-500', className)}>
                Carousel view will appear when gallery assets are available.
            </div>
        );
    }

    return (
        <div className={combineClassNames('rounded-2xl border border-slate-200 bg-white p-6 shadow-sm', className)}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-slate-900">Immersive carousel</h3>
                    <p className="text-sm text-slate-500">Swipe, click, or allow the carousel to auto-play through gallery highlights.</p>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                    <span>
                        Slide {activeIndex + 1} of {assetCount}
                    </span>
                    <div className="h-2 w-28 overflow-hidden rounded-full bg-slate-200">
                        <div
                            className="h-full bg-indigo-500 transition-all duration-500"
                            style={{ width: `${((activeIndex + 1) / assetCount) * 100}%` }}
                        />
                    </div>
                </div>
            </div>

            <div className="relative mt-6">
                <div className="overflow-hidden rounded-2xl bg-slate-900/5">
                    <div
                        className="flex transition-transform duration-500 ease-out"
                        style={{ transform: `translateX(-${activeIndex * 100}%)` }}
                    >
                        {assets.map((asset) => (
                            <div key={asset.id} className="w-full shrink-0">
                                <div className="relative aspect-[16/9] overflow-hidden">
                                    <img
                                        src={asset.publicUrl}
                                        alt={asset.title ?? asset.caption ?? asset.fileName}
                                        className="h-full w-full object-cover"
                                    />
                                </div>
                                <div className="bg-white px-6 py-5 text-slate-600">
                                    <h4 className="text-base font-semibold text-slate-900">{asset.title ?? asset.fileName}</h4>
                                    {asset.caption ? <p className="mt-1 text-sm text-slate-500">{asset.caption}</p> : null}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="pointer-events-none absolute inset-y-0 left-0 flex w-full items-center justify-between px-3">
                    <button
                        type="button"
                        onClick={goToPrevious}
                        className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/80 text-slate-900 shadow transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                        aria-label="View previous slide"
                    >
                        ◀
                    </button>
                    <button
                        type="button"
                        onClick={goToNext}
                        className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/80 text-slate-900 shadow transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                        aria-label="View next slide"
                    >
                        ▶
                    </button>
                </div>
            </div>

            <div className="mt-4 flex justify-center gap-2">
                {assets.map((asset, index) => (
                    <button
                        key={asset.id}
                        type="button"
                        onClick={() => goToIndex(index)}
                        className={combineClassNames(
                            'h-3 w-3 rounded-full transition',
                            index === activeIndex ? 'bg-indigo-500' : 'bg-slate-300 hover:bg-slate-400'
                        )}
                        aria-label={`Go to slide ${index + 1}`}
                        aria-current={index === activeIndex}
                    />
                ))}
            </div>

            {showThumbnails ? (
                <div className="mt-6 flex gap-3 overflow-x-auto">
                    {assets.map((asset, index) => (
                        <button
                            key={asset.id}
                            type="button"
                            onClick={() => goToIndex(index)}
                            className={combineClassNames(
                                'relative flex h-20 w-28 shrink-0 overflow-hidden rounded-xl ring-2 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500',
                                index === activeIndex ? 'ring-indigo-500' : 'ring-transparent hover:ring-indigo-300'
                            )}
                        >
                            <img src={asset.publicUrl} alt={asset.title ?? asset.fileName} className="h-full w-full object-cover" />
                        </button>
                    ))}
                </div>
            ) : null}
        </div>
    );
}

export default CarouselGallery;
