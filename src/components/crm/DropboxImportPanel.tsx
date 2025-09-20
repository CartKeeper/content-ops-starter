import * as React from 'react';

import type { GalleryRecord } from '../../data/crm';
import { DropboxChooserButton, type DropboxChooserFile } from './DropboxChooserButton';

type DropboxImportPanelProps = {
    galleries: GalleryRecord[];
    onImportComplete?: (result: { imported: number; skipped: number }) => void;
};

type ImportResponse = {
    data?: { imported: number; skipped: number };
    error?: string;
};

function findDefaultGalleryId(galleries: GalleryRecord[]): string | '' {
    if (!Array.isArray(galleries) || galleries.length === 0) {
        return '';
    }

    const pending = galleries.find((gallery) => gallery.status === 'Pending');
    if (pending) {
        return pending.id;
    }

    return galleries[0]?.id ?? '';
}

export function DropboxImportPanel({ galleries, onImportComplete }: DropboxImportPanelProps) {
    const galleryOptions = React.useMemo(
        () =>
            galleries.map((gallery) => ({
                value: gallery.id,
                label: `${gallery.client} · ${gallery.shootType}`,
                clientName: gallery.client
            })),
        [galleries]
    );

    const [selectedGalleryId, setSelectedGalleryId] = React.useState<string>(() => findDefaultGalleryId(galleries));
    const [importing, setImporting] = React.useState(false);
    const [resultMessage, setResultMessage] = React.useState<string | null>(null);
    const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
    const [folderPath, setFolderPath] = React.useState('');
    const [triggerZapier, setTriggerZapier] = React.useState(true);

    React.useEffect(() => {
        if (!selectedGalleryId && galleryOptions.length > 0) {
            setSelectedGalleryId(galleryOptions[0].value);
        }
    }, [galleryOptions, selectedGalleryId]);

    const selectedGallery = React.useMemo(
        () => galleryOptions.find((option) => option.value === selectedGalleryId) ?? null,
        [galleryOptions, selectedGalleryId]
    );

    const handleImport = React.useCallback(
        async (files: DropboxChooserFile[]) => {
            if (!selectedGalleryId) {
                setErrorMessage('Choose a gallery before importing Dropbox assets.');
                return;
            }

            if (!files || files.length === 0) {
                return;
            }

            setErrorMessage(null);
            setResultMessage(null);
            setImporting(true);

            try {
                const response = await fetch('/api/galleries/import', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        galleryId: selectedGalleryId,
                        galleryName: selectedGallery?.label,
                        clientName: selectedGallery?.clientName,
                        folderPath: folderPath || null,
                        triggerZapier,
                        selection: files
                    })
                });

                const payload = (await response.json()) as ImportResponse;

                if (!response.ok) {
                    setErrorMessage(payload.error || 'Failed to import Dropbox assets.');
                    return;
                }

                const imported = payload.data?.imported ?? 0;
                const skipped = payload.data?.skipped ?? 0;
                setResultMessage(
                    `Imported ${imported} file${imported === 1 ? '' : 's'} from Dropbox${
                        skipped > 0 ? ` (${skipped} skipped as duplicates).` : '.'
                    }`
                );

                if (onImportComplete) {
                    onImportComplete({ imported, skipped });
                }
            } catch (error) {
                console.error('Dropbox import failed', error);
                setErrorMessage('Unexpected error while importing from Dropbox. Check console for details.');
            } finally {
                setImporting(false);
            }
        },
        [folderPath, onImportComplete, selectedGallery, selectedGalleryId, triggerZapier]
    );

    return (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="flex flex-col gap-4">
                <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                    Attach files to gallery
                    <select
                        className="rounded-xl border border-slate-300 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#4DE5FF] dark:border-slate-700 dark:bg-slate-900/70 dark:text-white"
                        value={selectedGalleryId}
                        onChange={(event) => setSelectedGalleryId(event.target.value)}
                    >
                        {galleryOptions.length === 0 ? <option value="">No galleries configured</option> : null}
                        {galleryOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                    Destination folder (optional)
                    <input
                        type="text"
                        value={folderPath}
                        onChange={(event) => setFolderPath(event.target.value)}
                        placeholder="/Clients/2025-05-14-sanders/"
                        className="rounded-xl border border-slate-300 bg-white/70 px-4 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#4DE5FF] dark:border-slate-700 dark:bg-slate-900/70 dark:text-white"
                    />
                </label>
                <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                    <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-[#4DE5FF] focus:ring-[#4DE5FF] dark:border-slate-600"
                        checked={triggerZapier}
                        onChange={(event) => setTriggerZapier(event.target.checked)}
                    />
                    Trigger Zapier webhook for new imports
                </label>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    Launch the Dropbox Chooser to select hero images, proofing assets, or entire folders. The importer expands
                    folder selections automatically before writing everything to the Supabase
                    <code className="ml-1 rounded bg-slate-100 px-1 text-xs dark:bg-slate-800">dropbox_assets</code> table with
                    duplicate detection and optional Zapier notifications.
                </p>
            </div>
            <div className="flex flex-col gap-4">
                <DropboxChooserButton onSelect={handleImport} disabled={importing} folderselect>
                    {importing ? 'Importing…' : 'Import from Dropbox'}
                </DropboxChooserButton>
                {resultMessage ? <p className="text-sm text-emerald-500">{resultMessage}</p> : null}
                {errorMessage ? <p className="text-sm text-rose-500">{errorMessage}</p> : null}
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-4 text-xs leading-relaxed text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
                    <p className="font-semibold uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">Dropbox chooser tips</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5">
                        <li>Select an entire gallery drop folder directly—the importer expands folders and queues every file.</li>
                        <li>Use the direct link option when you want clients to download the original file.</li>
                        <li>Preview URLs expire after a short period—Supabase stores them so the CRM can refresh as needed.</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
