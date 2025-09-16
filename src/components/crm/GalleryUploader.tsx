import { useState } from 'react';
import type { Client, Gallery } from '../../lib/mock-data';
import type { CreateGalleryInput } from '../../lib/api';

function formatDate(date: string) {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(date));
}

type GalleryUploaderProps = {
    clients: Client[];
    galleries: Gallery[];
    onCreate: (input: CreateGalleryInput) => Promise<void> | void;
};

export function GalleryUploader({ clients, galleries, onCreate }: GalleryUploaderProps) {
    const [formState, setFormState] = useState<CreateGalleryInput>({
        clientId: clients[0]?.id ?? '',
        project: '',
        title: '',
        deliveryDate: new Date().toISOString().slice(0, 10),
        photoFilenames: []
    });

    const [uploadList, setUploadList] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setIsSubmitting(true);
        try {
            await onCreate({
                ...formState,
                photoFilenames: uploadList
                    .split('\n')
                    .map((item) => item.trim())
                    .filter(Boolean)
            });
            setFormState((prev) => ({
                ...prev,
                project: '',
                title: ''
            }));
            setUploadList('');
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="grid gap-8 lg:grid-cols-2">
            <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-slate-800 bg-slate-900/50 p-6 text-sm">
                <h2 className="text-lg font-semibold text-white">Create gallery</h2>
                <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.3em] text-slate-400">
                    Client
                    <select
                        className="rounded-lg border border-slate-800 bg-slate-950 px-4 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        value={formState.clientId}
                        onChange={(event) =>
                            setFormState((prev) => ({
                                ...prev,
                                clientId: event.target.value
                            }))
                        }
                        required
                    >
                        {clients.map((client) => (
                            <option key={client.id} value={client.id}>
                                {client.name}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.3em] text-slate-400">
                    Project
                    <input
                        type="text"
                        className="rounded-lg border border-slate-800 bg-slate-950 px-4 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        value={formState.project}
                        onChange={(event) =>
                            setFormState((prev) => ({
                                ...prev,
                                project: event.target.value
                            }))
                        }
                        placeholder="E.g., Rivera Wedding or Spring Mini Sessions"
                        required
                    />
                </label>
                <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.3em] text-slate-400">
                    Title
                    <input
                        type="text"
                        className="rounded-lg border border-slate-800 bg-slate-950 px-4 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        value={formState.title}
                        onChange={(event) =>
                            setFormState((prev) => ({
                                ...prev,
                                title: event.target.value
                            }))
                        }
                        required
                    />
                </label>
                <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.3em] text-slate-400">
                    Delivery Date
                    <input
                        type="date"
                        className="rounded-lg border border-slate-800 bg-slate-950 px-4 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        value={formState.deliveryDate}
                        onChange={(event) =>
                            setFormState((prev) => ({
                                ...prev,
                                deliveryDate: event.target.value
                            }))
                        }
                    />
                </label>
                <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.3em] text-slate-400">
                    Photo filenames
                    <textarea
                        className="h-24 rounded-lg border border-slate-800 bg-slate-950 px-4 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        value={uploadList}
                        onChange={(event) => setUploadList(event.target.value)}
                        placeholder={'hero.jpg\nhighlight-01.jpg\nfamily-portrait.png'}
                    />
                </label>
                <button
                    type="submit"
                    className="inline-flex items-center justify-center rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-600/40"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? 'Saving...' : 'Generate gallery'}
                </button>
            </form>

            <section className="space-y-6">
                <h2 className="text-lg font-semibold text-white">Recent deliveries</h2>
                <div className="space-y-4">
                    {galleries.map((gallery) => (
                        <article
                            key={gallery.id}
                            className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-6 shadow-lg shadow-slate-950/40"
                        >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-white">{gallery.title}</p>
                                    <p className="text-xs text-slate-400">{gallery.project}</p>
                                    <p className="mt-2 text-xs uppercase tracking-[0.3em] text-emerald-300">{gallery.status}</p>
                                </div>
                                <div className="text-right text-xs text-slate-400">
                                    <p>Delivery {formatDate(gallery.deliveryDate)}</p>
                                    <p className="mt-1">{gallery.photos.length} photos</p>
                                </div>
                            </div>
                        </article>
                    ))}
                    {galleries.length === 0 && (
                        <p className="rounded-xl border border-dashed border-slate-800/80 bg-slate-950/40 p-6 text-center text-sm text-slate-400">
                            No galleries created yet.
                        </p>
                    )}
                </div>
            </section>
        </div>
    );
}
