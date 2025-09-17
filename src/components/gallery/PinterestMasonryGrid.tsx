import * as React from 'react';

import type { GalleryAsset } from '../../data/crm';

type CaptionRenderer = (asset: GalleryAsset, index: number) => React.ReactNode;

type PinterestMasonryGridProps = {
    assets: GalleryAsset[];
    className?: string;
    columnClassName?: string;
    gap?: string;
    onAssetClick?: (asset: GalleryAsset, index: number) => void;
    renderCaption?: CaptionRenderer;
};

const combineClassNames = (...values: Array<string | undefined>): string =>
    values.filter(Boolean).join(' ');

const DEFAULT_COLUMNS_CLASSNAME = 'columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 sm:gap-6 [column-fill:_balance]';

export function PinterestMasonryGrid({
    assets,
    className,
    columnClassName = DEFAULT_COLUMNS_CLASSNAME,
    gap = '1.5rem',
    onAssetClick,
    renderCaption
}: PinterestMasonryGridProps) {
    if (!assets || assets.length === 0) {
        return (
            <div className={combineClassNames('rounded-xl border border-dashed border-slate-300 p-12 text-center text-slate-500', className)}>
                No assets available for this gallery yet.
            </div>
        );
    }

    return (
        <div className={combineClassNames('w-full', className)}>
            <div className={columnClassName} style={{ columnGap: gap }}>
                {assets.map((asset, index) => {
                    const altText = asset.title ?? asset.caption ?? asset.fileName;
                    const captionNode =
                        renderCaption?.(asset, index) ?? (
                            <div className="flex flex-col gap-1 text-left">
                                <span className="text-sm font-medium leading-snug">{asset.title ?? asset.fileName}</span>
                                {asset.caption ? (
                                    <span className="text-xs leading-snug text-white/80">{asset.caption}</span>
                                ) : null}
                            </div>
                        );

                    const content = (
                        <React.Fragment>
                            <img
                                src={asset.publicUrl}
                                alt={altText}
                                className="h-full w-full object-cover"
                                loading={index < 4 ? 'eager' : 'lazy'}
                            />
                            {captionNode ? (
                                <div className="pointer-events-none absolute inset-x-0 bottom-0">
                                    <div className="bg-gradient-to-t from-black/80 via-black/30 to-transparent p-4 text-white">
                                        {captionNode}
                                    </div>
                                </div>
                            ) : null}
                        </React.Fragment>
                    );

                    if (onAssetClick) {
                        return (
                            <button
                                key={asset.id}
                                type="button"
                                onClick={() => onAssetClick(asset, index)}
                                className="group relative mb-6 block w-full break-inside-avoid overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5 transition duration-200 hover:-translate-y-1 hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                            >
                                {content}
                            </button>
                        );
                    }

                    return (
                        <div
                            key={asset.id}
                            className="relative mb-6 break-inside-avoid overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5"
                        >
                            {content}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default PinterestMasonryGrid;
