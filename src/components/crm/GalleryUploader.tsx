import * as React from 'react';

import type { GalleryAsset } from '../../data/crm';
import { formatBytes, sumBytes } from '../../utils/format-bytes';
import { PhotoIcon, LightningIcon } from './icons';

type UploadStatus = 'queued' | 'uploading' | 'complete' | 'error';

type UploadTask = {
    id: string;
    file: File;
    progress: number;
    status: UploadStatus;
    error?: string;
};

type GalleryUploaderContext = {
    client?: string;
    projectId?: string;
    projectCode?: string;
    shootType?: string;
};

type GalleryUploaderProps = {
    value: GalleryAsset[];
    onChange: (assets: GalleryAsset[]) => void;
    context?: GalleryUploaderContext;
    helperText?: string;
    accept?: string[];
    maxFileSizeMb?: number;
};

const DEFAULT_MAX_MB = 250;

export function GalleryUploader({
    value,
    onChange,
    context,
    helperText,
    accept,
    maxFileSizeMb = DEFAULT_MAX_MB
}: GalleryUploaderProps) {
    const inputRef = React.useRef<HTMLInputElement | null>(null);
    const [isDragging, setIsDragging] = React.useState(false);
    const [uploads, setUploads] = React.useState<UploadTask[]>([]);
    const [completedAssets, setCompletedAssets] = React.useState<GalleryAsset[]>(value ?? []);

    React.useEffect(() => {
        setCompletedAssets(Array.isArray(value) ? value : []);
    }, [value]);

    const totalSize = React.useMemo(
        () => sumBytes(completedAssets.map((asset) => asset.size)),
        [completedAssets]
    );

    const formattedTotalSize = formatBytes(totalSize);
    const acceptAttr = accept?.join(',') ?? undefined;

    const handleFiles = (fileList: FileList | File[]) => {
        const files = Array.from(fileList);
        if (files.length === 0) {
            return;
        }

        files.forEach((file) => {
            const maxBytes = maxFileSizeMb * 1024 * 1024;
            if (file.size > maxBytes) {
                setUploads((previous) => [
                    ...previous,
                    {
                        id: `${file.name}-${Date.now()}`,
                        file,
                        progress: 0,
                        status: 'error',
                        error: `File exceeds ${maxFileSizeMb} MB limit.`
                    }
                ]);
                return;
            }

            const task: UploadTask = {
                id: `${file.name}-${Math.random().toString(36).slice(2, 10)}`,
                file,
                progress: 0,
                status: 'queued'
            };

            setUploads((previous) => [...previous, task]);
            startUpload(task);
        });
    };

    const startUpload = React.useCallback(
        (task: UploadTask) => {
            setUploads((previous) =>
                previous.map((entry) =>
                    entry.id === task.id
                        ? {
                              ...entry,
                              status: 'uploading'
                          }
                        : entry
                )
            );

            uploadFile(task.file, context, (progress) => {
                setUploads((previous) =>
                    previous.map((entry) =>
                        entry.id === task.id
                            ? {
                                  ...entry,
                                  progress
                              }
                            : entry
                    )
                );
            })
                .then((asset) => {
                    setCompletedAssets((previous) => {
                        const next = [...previous, asset];
                        onChange(next);
                        return next;
                    });
                    setUploads((previous) => previous.filter((entry) => entry.id !== task.id));
                })
                .catch((error: Error) => {
                    setUploads((previous) =>
                        previous.map((entry) =>
                            entry.id === task.id
                                ? {
                                      ...entry,
                                      status: 'error',
                                      error: error.message
                                  }
                                : entry
                        )
                    );
                });
        },
        [context, onChange]
    );

    const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setIsDragging(false);
        handleFiles(event.dataTransfer.files);
    };

    const removeAsset = (id: string) => {
        setCompletedAssets((previous) => {
            const next = previous.filter((asset) => asset.id !== id);
            onChange(next);
            return next;
        });
    };

    const triggerFileDialog = () => {
        inputRef.current?.click();
    };

    return (
        <div className="space-y-3">
            <input
                ref={inputRef}
                type="file"
                accept={acceptAttr}
                multiple
                className="hidden"
                onChange={(event) => {
                    if (event.target.files) {
                        handleFiles(event.target.files);
                        event.target.value = '';
                    }
                }}
            />
            <div
                className={[
                    'flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-12 text-center transition',
                    isDragging
                        ? 'border-[#5D3BFF] bg-indigo-50/70 text-[#3426B7] dark:border-[#9DAAFF] dark:bg-[#262464] dark:text-[#E0E4FF]'
                        : 'border-slate-300 bg-white/70 text-slate-600 hover:border-[#5D3BFF] hover:bg-indigo-50/40 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300'
                ].join(' ')}
                onDragOver={(event) => {
                    event.preventDefault();
                    setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
            >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-200">
                    <PhotoIcon className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                        Drag & drop files or{' '}
                        <button
                            type="button"
                            onClick={triggerFileDialog}
                            className="font-semibold text-[#5D3BFF] hover:text-[#3D4BFF] focus:outline-none focus:ring-2 focus:ring-[#4DE5FF]"
                        >
                            browse
                        </button>
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        We recommend JPEG, PNG, HEIC, or MP4 files. Max size {maxFileSizeMb} MB per file.
                    </p>
                </div>
                {helperText ? (
                    <p className="text-xs text-slate-400 dark:text-slate-500">{helperText}</p>
                ) : null}
            </div>

            <div className="space-y-3 rounded-2xl border border-slate-200 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-900/70">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Uploaded assets</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            {completedAssets.length} file{completedAssets.length === 1 ? '' : 's'} · {formattedTotalSize} total
                        </p>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-200">
                        <LightningIcon className="h-4 w-4" /> Auto-sync enabled
                    </div>
                </div>
                <ul className="space-y-2">
                    {completedAssets.map((asset) => (
                        <li
                            key={asset.id}
                            className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900"
                        >
                            <div className="flex min-w-0 flex-1 flex-col">
                                <span className="truncate font-medium text-slate-800 dark:text-slate-100">{asset.fileName}</span>
                                <span className="truncate text-xs text-slate-500 dark:text-slate-400">
                                    {asset.contentType ?? 'Unknown type'} · {formatBytes(asset.size)}
                                    {asset.isDuplicate ? ' · duplicate detected' : ''}
                                </span>
                            </div>
                            <a
                                className="text-xs font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-300"
                                href={asset.publicUrl}
                                target="_blank"
                                rel="noreferrer"
                            >
                                View
                            </a>
                            <button
                                type="button"
                                onClick={() => removeAsset(asset.id)}
                                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                            >
                                Remove
                            </button>
                        </li>
                    ))}
                    {uploads.map((task) => (
                        <li
                            key={task.id}
                            className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900"
                        >
                            <div className="flex items-center justify-between">
                                <span className="truncate font-medium text-slate-800 dark:text-slate-100">{task.file.name}</span>
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                    {task.status === 'error'
                                        ? task.error ?? 'Upload failed'
                                        : `${Math.round(task.progress * 100)}%`}
                                </span>
                            </div>
                            {task.status !== 'error' ? (
                                <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                                    <div
                                        className="h-full rounded-full bg-gradient-to-r from-[#5D3BFF] via-[#3D7CFF] to-[#4DE5FF] transition-[width]"
                                        style={{ width: `${Math.max(task.progress * 100, 5)}%` }}
                                    />
                                </div>
                            ) : null}
                        </li>
                    ))}
                    {completedAssets.length === 0 && uploads.length === 0 ? (
                        <li className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-xs text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-500">
                            No files uploaded yet. Add assets to create a shareable gallery.
                        </li>
                    ) : null}
                </ul>
            </div>
        </div>
    );
}

function uploadFile(
    file: File,
    context: GalleryUploaderContext | undefined,
    onProgress: (progress: number) => void
): Promise<GalleryAsset> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/crm/galleries/upload');

        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
                const progress = event.total > 0 ? event.loaded / event.total : 0;
                onProgress(Math.min(Math.max(progress, 0), 1));
            }
        };

        xhr.onreadystatechange = () => {
            if (xhr.readyState === XMLHttpRequest.DONE) {
                const status = xhr.status;
                let payload: unknown = null;
                try {
                    payload = xhr.responseText ? JSON.parse(xhr.responseText) : null;
                } catch (error) {
                    // ignore
                }

                if (status >= 200 && status < 300) {
                    const data = (payload as { data?: GalleryAsset | null })?.data;
                    if (data) {
                        resolve(data);
                    } else {
                        reject(new Error('Upload succeeded without metadata.'));
                    }
                } else {
                    const errorMessage =
                        (payload as { error?: string })?.error || 'Unable to upload file. Please try again.';
                    reject(new Error(errorMessage));
                }
            }
        };

        xhr.onerror = () => {
            reject(new Error('Network error while uploading file.'));
        };

        const formData = new FormData();
        formData.append('file', file, file.name);

        if (context?.client) {
            formData.append('clientId', context.client);
        }

        const projectIdentifier = context?.projectId || context?.projectCode || context?.shootType;
        if (projectIdentifier) {
            formData.append('projectId', projectIdentifier);
        }

        const projectCode = context?.projectCode || projectIdentifier;
        if (projectCode) {
            formData.append('projectCode', projectCode);
        }

        xhr.send(formData);
    });
}
