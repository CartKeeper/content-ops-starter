import * as React from 'react';

import type { DropboxChooserFile, DropboxChooseOptions, DropboxChooserLinkType } from '../../types/dropbox-chooser';

const DROPBOX_SCRIPT_ID = 'dropboxjs';
const DROPBOX_CHOOSER_SRC = 'https://www.dropbox.com/static/api/2/dropins.js';

function resolveAppKey(): string | null {
    if (typeof process === 'undefined' || typeof process.env === 'undefined') {
        return null;
    }

    const candidates = [
        process.env.NEXT_PUBLIC_DROPBOX_APP_KEY,
        process.env.DROPBOX_APP_KEY,
        process.env.NEXT_PUBLIC_DROPBOX_CHOOSER_KEY
    ];

    for (const value of candidates) {
        if (value && value.trim()) {
            return value.trim();
        }
    }

    return null;
}

function loadDropboxScript(appKey: string, onLoad: () => void, onError: () => void) {
    if (typeof document === 'undefined') {
        return;
    }

    const existing = document.getElementById(DROPBOX_SCRIPT_ID);
    if (existing) {
        if ('dataset' in existing && existing.getAttribute('data-app-key') !== appKey) {
            existing.setAttribute('data-app-key', appKey);
        }

        if ((window as Window & { Dropbox?: { choose?: (options: DropboxChooseOptions) => void } }).Dropbox?.choose) {
            onLoad();
            return;
        }

        existing.addEventListener('load', onLoad);
        existing.addEventListener('error', onError);
        return;
    }

    const script = document.createElement('script');
    script.id = DROPBOX_SCRIPT_ID;
    script.src = DROPBOX_CHOOSER_SRC;
    script.async = true;
    script.setAttribute('data-app-key', appKey);
    script.addEventListener('load', onLoad);
    script.addEventListener('error', onError);
    document.body.appendChild(script);
}

function useDropboxChooser(appKey: string | null) {
    const [isReady, setIsReady] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (!appKey) {
            setError('Missing Dropbox app key. Set NEXT_PUBLIC_DROPBOX_APP_KEY in your environment.');
            return;
        }

        if (typeof window === 'undefined') {
            return;
        }

        const handleLoad = () => {
            if ((window as Window & { Dropbox?: { choose?: (options: DropboxChooseOptions) => void } }).Dropbox?.choose) {
                setIsReady(true);
            } else {
                setError('Dropbox chooser failed to initialise.');
            }
        };

        const handleError = () => {
            setError('Unable to load the Dropbox chooser script.');
        };

        loadDropboxScript(appKey, handleLoad, handleError);

        return () => {
            if (typeof document === 'undefined') {
                return;
            }
            const existing = document.getElementById(DROPBOX_SCRIPT_ID);
            if (existing) {
                existing.removeEventListener('load', handleLoad);
                existing.removeEventListener('error', handleError);
            }
        };
    }, [appKey]);

    return { isReady, error };
}

type DropboxChooserButtonProps = {
    onSelect: (files: DropboxChooserFile[]) => void;
    onCancel?: () => void;
    disabled?: boolean;
    children?: React.ReactNode;
    className?: string;
    linkType?: DropboxChooserLinkType;
    multiselect?: boolean;
    folderselect?: boolean;
    extensions?: string[];
    sizeLimit?: number;
};

export function DropboxChooserButton({
    onSelect,
    onCancel,
    disabled,
    children,
    className,
    linkType = 'preview',
    multiselect = true,
    folderselect = false,
    extensions,
    sizeLimit
}: DropboxChooserButtonProps) {
    const appKey = React.useMemo(() => resolveAppKey(), []);
    const { isReady, error } = useDropboxChooser(appKey);

    const handleClick = React.useCallback(() => {
        const chooser = (window as Window & { Dropbox?: { choose?: (options: DropboxChooseOptions) => void } }).Dropbox?.choose;

        if (!chooser) {
            console.warn('Dropbox chooser unavailable');
            return;
        }

        const options: DropboxChooseOptions = {
            success: onSelect,
            cancel: onCancel,
            linkType,
            multiselect,
            folderselect,
            extensions,
            sizeLimit
        };

        chooser(options);
    }, [extensions, folderselect, linkType, multiselect, onCancel, onSelect, sizeLimit]);

    return (
        <div className="flex flex-col gap-2">
            <button
                type="button"
                onClick={handleClick}
                disabled={disabled || !isReady || !!error}
                className={
                    className ||
                    'inline-flex items-center justify-center rounded-full bg-[#4DE5FF] px-4 py-2 text-sm font-semibold text-slate-950 shadow transition hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#4DE5FF]/80 focus:ring-offset-2 focus:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#3D7CFF] dark:text-white dark:focus:ring-offset-slate-950'
                }
            >
                {children ?? 'Choose files from Dropbox'}
            </button>
            {error ? <p className="text-xs text-rose-500">{error}</p> : null}
            {!error && !appKey ? (
                <p className="text-xs text-amber-500">
                    Provide NEXT_PUBLIC_DROPBOX_APP_KEY to enable the Dropbox chooser button.
                </p>
            ) : null}
        </div>
    );
}

export type { DropboxChooserFile };
