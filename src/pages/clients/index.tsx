import * as React from 'react';
import Head from 'next/head';
import * as Dialog from '@radix-ui/react-dialog';

import { CrmAuthGuard, SectionCard, StatCard } from '../../components/crm';
import { FolderIcon, SparklesIcon, UsersIcon } from '../../components/crm/icons';

type NotesFilterOption = 'all' | 'with' | 'without';

type FilterState = {
    query: string;
    project: string;
    notes: NotesFilterOption;
};

type ClientRecord = {
    id: string;
    name: string;
    email: string;
    phone?: string;
    address?: string;
    notes?: string;
    relatedProjects: string[];
};

type ClientFormValues = {
    name: string;
    email: string;
    phone: string;
    address: string;
    notes: string;
    relatedProjects: string[];
};

type ClientFormModalProps = {
    open: boolean;
    mode: 'create' | 'edit';
    client?: ClientRecord | null;
    onClose: () => void;
    onSubmit: (values: ClientFormValues) => Promise<void>;
};

type DeleteConfirmModalProps = {
    open: boolean;
    client?: ClientRecord | null;
    isDeleting: boolean;
    error?: string | null;
    onClose: () => void;
    onConfirm: () => Promise<void>;
};

type CmsClientPayload = {
    id?: string;
    name: string;
    email: string;
    phone: string;
    address: string;
    notes: string;
    related_projects: string[];
};

const PROJECT_FILTER_ALL = '__all__';
const PROJECT_FILTER_UNASSIGNED = '__unassigned__';

const inputBaseClasses =
    'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-[#5D3BFF] focus:outline-none focus:ring-2 focus:ring-[#4DE5FF] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-[#7ADFFF] dark:focus:ring-[#4DE5FF]';

const primaryButtonClasses =
    'inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#5D3BFF] via-[#3D7CFF] to-[#4DE5FF] px-5 py-2 text-sm font-semibold uppercase tracking-[0.18em] text-white shadow-lg transition hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[#4DE5FF] focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-70';

const secondaryButtonClasses =
    'inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-600 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#4DE5FF] focus:ring-offset-2 focus:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus:ring-offset-slate-900';

const dangerButtonClasses =
    'inline-flex items-center gap-2 rounded-full border border-rose-500/60 bg-rose-500/10 px-4 py-2 text-sm font-semibold uppercase tracking-[0.18em] text-rose-600 transition hover:bg-rose-500/20 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-offset-2 focus:ring-offset-white disabled:cursor-not-allowed disabled:opacity-70 dark:border-rose-400/60 dark:text-rose-200 dark:hover:bg-rose-500/10 dark:focus:ring-offset-slate-900';

const LIST_SKELETON_COUNT = 4;
function ClientsDirectory() {
    const [clients, setClients] = React.useState<ClientRecord[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [filters, setFilters] = React.useState<FilterState>({
        query: '',
        project: PROJECT_FILTER_ALL,
        notes: 'all'
    });
    const [formMode, setFormMode] = React.useState<'create' | 'edit' | null>(null);
    const [selectedClient, setSelectedClient] = React.useState<ClientRecord | null>(null);
    const [deleteTarget, setDeleteTarget] = React.useState<ClientRecord | null>(null);
    const [isDeleting, setIsDeleting] = React.useState(false);
    const [deleteError, setDeleteError] = React.useState<string | null>(null);

    React.useEffect(() => {
        let cancelled = false;

        async function loadClients() {
            setIsLoading(true);
            setError(null);

            try {
                const response = await fetch('/api/crm/clients');
                if (!response.ok) {
                    throw new Error(`Request failed with status ${response.status}`);
                }

                const payload = (await response.json()) as { data?: unknown } | undefined;
                const items = Array.isArray(payload?.data) ? payload.data : [];
                const normalized = items.map((item, index) =>
                    normalizeClientResponse(item, `client-${index + 1}`)
                );

                if (!cancelled) {
                    setClients(normalized);
                }
            } catch (loadError) {
                console.error('Unable to load Codex clients', loadError);
                if (!cancelled) {
                    setError('Unable to load clients from the Codex CMS API. Please try again.');
                    setClients([]);
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        }

        void loadClients();

        return () => {
            cancelled = true;
        };
    }, []);

    const projectOptions = React.useMemo(() => {
        const projects = new Set<string>();
        clients.forEach((client) => {
            client.relatedProjects.forEach((project) => {
                projects.add(project);
            });
        });

        return Array.from(projects.values()).sort((first, second) =>
            first.localeCompare(second, undefined, { sensitivity: 'base' })
        );
    }, [clients]);
    const filteredClients = React.useMemo(() => {
        const query = filters.query.trim().toLowerCase();

        return clients
            .filter((client) => {
                if (filters.project !== PROJECT_FILTER_ALL) {
                    if (filters.project === PROJECT_FILTER_UNASSIGNED) {
                        if (client.relatedProjects.length > 0) {
                            return false;
                        }
                    } else if (!client.relatedProjects.includes(filters.project)) {
                        return false;
                    }
                }

                if (filters.notes === 'with' && !client.notes) {
                    return false;
                }

                if (filters.notes === 'without' && client.notes) {
                    return false;
                }

                if (!query) {
                    return true;
                }

                const haystack = [
                    client.name,
                    client.email,
                    client.phone,
                    client.address,
                    client.notes,
                    ...client.relatedProjects
                ]
                    .filter(Boolean)
                    .map((value) => value!.toLowerCase());

                return haystack.some((value) => value.includes(query));
            })
            .sort((first, second) => first.name.localeCompare(second.name, undefined, { sensitivity: 'base' }));
    }, [clients, filters.notes, filters.project, filters.query]);

    const totalClients = clients.length;
    const clientsWithNotes = clients.filter((client) => Boolean(client.notes)).length;
    const retainerClients = clients.filter((client) => client.relatedProjects.length > 1).length;
    const uniqueProjects = projectOptions.length;

    const rosterEngagement = totalClients === 0 ? 0 : (clientsWithNotes / totalClients) * 100 - 50;
    const retainerRate = totalClients === 0 ? 0 : (retainerClients / totalClients) * 100;
    const projectCoverage = totalClients === 0 ? 0 : (uniqueProjects / Math.max(totalClients, 1)) * 100;

    const openCreateModal = React.useCallback(() => {
        setFormMode('create');
        setSelectedClient(null);
    }, []);

    const openEditModal = React.useCallback((client: ClientRecord) => {
        setSelectedClient(client);
        setFormMode('edit');
    }, []);

    const closeFormModal = React.useCallback(() => {
        setFormMode(null);
        setSelectedClient(null);
    }, []);

    const openDeleteModal = React.useCallback((client: ClientRecord) => {
        setDeleteError(null);
        setDeleteTarget(client);
    }, []);

    const closeDeleteModal = React.useCallback(() => {
        if (isDeleting) {
            return;
        }
        setDeleteTarget(null);
        setDeleteError(null);
    }, [isDeleting]);
    const handleFormSubmit = React.useCallback(
        async (values: ClientFormValues) => {
            const payload = buildCmsPayload(values);

            if (formMode === 'edit' && selectedClient) {
                payload.id = selectedClient.id;
                const response = await fetch(`/api/crm/clients?id=${encodeURIComponent(selectedClient.id)}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                let result: { data?: unknown; error?: string } | null = null;
                try {
                    result = await response.json();
                } catch (parseError) {
                    // no-op
                }

                if (!response.ok) {
                    throw new Error(result?.error ?? 'Unable to update the client. Please try again.');
                }

                const updated = normalizeClientResponse(result?.data ?? payload, selectedClient.id);
                setClients((previous) =>
                    previous.map((client) => (client.id === updated.id ? updated : client))
                );
                closeFormModal();
                return;
            }

            const response = await fetch('/api/crm/clients', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            let result: { data?: unknown; error?: string } | null = null;
            try {
                result = await response.json();
            } catch (parseError) {
                // no-op
            }

            if (!response.ok) {
                throw new Error(result?.error ?? 'Unable to create the client. Please try again.');
            }

            const created = normalizeClientResponse(result?.data ?? payload, `client-${Date.now()}`);
            setClients((previous) => [...previous, created]);
            closeFormModal();
        },
        [closeFormModal, formMode, selectedClient]
    );

    const handleDelete = React.useCallback(async () => {
        if (!deleteTarget) {
            return;
        }

        setIsDeleting(true);
        setDeleteError(null);

        try {
            const response = await fetch(`/api/crm/clients?id=${encodeURIComponent(deleteTarget.id)}`, {
                method: 'DELETE'
            });

            let result: { data?: unknown; error?: string } | null = null;
            try {
                result = await response.json();
            } catch (parseError) {
                // no-op
            }

            if (!response.ok) {
                throw new Error(result?.error ?? 'Unable to delete the client. Please try again.');
            }

            setClients((previous) => previous.filter((client) => client.id !== deleteTarget.id));
            setDeleteTarget(null);
        } catch (deleteErr) {
            setDeleteError(
                deleteErr instanceof Error
                    ? deleteErr.message
                    : 'Unable to delete the client. Please try again.'
            );
        } finally {
            setIsDeleting(false);
        }
    }, [deleteTarget]);

    const resetFilters = React.useCallback(() => {
        setFilters({ query: '', project: PROJECT_FILTER_ALL, notes: 'all' });
    }, []);
    return (
        <>
            <Head>
                <title>Codex Clients Directory</title>
                <meta
                    name="description"
                    content="Manage Codex Studio client relationships with synced CMS data and secure CRUD workflows."
                />
            </Head>
            <main className="min-h-screen bg-slate-100 py-12 transition-colors dark:bg-slate-950">
                <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6">
                    <header className="space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.38em] text-slate-400 dark:text-slate-500">
                            Codex Studio
                        </p>
                        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
                            Client relationship hub
                        </h1>
                        <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-300">
                            Search, segment, and maintain Codex client profiles. Create, edit, and archive records that sync back
                            to the Git-based CMS powering the studio.
                        </p>
                    </header>

                    <section className="grid gap-6 md:grid-cols-3">
                        <StatCard
                            title="Active client roster"
                            value={totalClients.toString()}
                            change={Number.isFinite(rosterEngagement) ? rosterEngagement : 0}
                            changeLabel="include detailed relationship notes"
                            icon={<UsersIcon className="h-5 w-5" />}
                        />
                        <StatCard
                            title="Retainer partners"
                            value={retainerClients.toString()}
                            change={Number.isFinite(retainerRate) ? retainerRate : 0}
                            changeLabel="book multiple Codex projects"
                            icon={<SparklesIcon className="h-5 w-5" />}
                        />
                        <StatCard
                            title="Projects represented"
                            value={uniqueProjects.toString()}
                            change={Number.isFinite(projectCoverage) ? projectCoverage : 0}
                            changeLabel="linked to client records"
                            icon={<FolderIcon className="h-5 w-5" />}
                        />
                    </section>

                    <SectionCard
                        title="Client directory"
                        description="Query and filter Codex CRM clients, then manage records with Git-backed modals."
                        action={
                            <button type="button" className={primaryButtonClasses} onClick={openCreateModal}>
                                + New client
                            </button>
                        }
                    >
                        {error ? (
                            <div className="mb-4 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-600 dark:border-rose-500/50 dark:bg-rose-500/10 dark:text-rose-200">
                                {error}
                            </div>
                        ) : null}

                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <label className="relative flex-1 text-sm">
                                <span className="sr-only">Search clients</span>
                                <input
                                    type="search"
                                    value={filters.query}
                                    onChange={(event) =>
                                        setFilters((previous) => ({ ...previous, query: event.target.value }))
                                    }
                                    placeholder="Search by name, email, note, or project"
                                    className={`${inputBaseClasses} pr-4`}
                                />
                            </label>
                            <div className="flex flex-col gap-3 sm:flex-row">
                                <label className="text-sm">
                                    <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                                        Project filter
                                    </span>
                                    <select
                                        value={filters.project}
                                        onChange={(event) =>
                                            setFilters((previous) => ({ ...previous, project: event.target.value }))
                                        }
                                        className={`${inputBaseClasses} min-w-[180px]`}
                                    >
                                        <option value={PROJECT_FILTER_ALL}>All projects</option>
                                        <option value={PROJECT_FILTER_UNASSIGNED}>Unassigned</option>
                                        {projectOptions.map((project) => (
                                            <option key={project} value={project}>
                                                {project}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <label className="text-sm">
                                    <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                                        Notes
                                    </span>
                                    <select
                                        value={filters.notes}
                                        onChange={(event) =>
                                            setFilters((previous) => ({
                                                ...previous,
                                                notes: event.target.value as NotesFilterOption
                                            }))
                                        }
                                        className={`${inputBaseClasses} min-w-[160px]`}
                                    >
                                        <option value="all">All clients</option>
                                        <option value="with">With notes</option>
                                        <option value="without">Needs notes</option>
                                    </select>
                                </label>
                            </div>
                        </div>
                        <div className="mt-6 space-y-4">
                            {isLoading ? (
                                <ul className="space-y-4">
                                    {Array.from({ length: LIST_SKELETON_COUNT }).map((_, index) => (
                                        <li
                                            key={index}
                                            className="animate-pulse rounded-2xl border border-slate-200 bg-white/70 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60"
                                        >
                                            <div className="h-4 w-1/3 rounded bg-slate-200 dark:bg-slate-700" />
                                            <div className="mt-3 h-3 w-1/2 rounded bg-slate-200 dark:bg-slate-800" />
                                            <div className="mt-6 h-3 w-full rounded bg-slate-200 dark:bg-slate-800" />
                                        </li>
                                    ))}
                                </ul>
                            ) : filteredClients.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-300">
                                    <p>No clients match the current filters.</p>
                                    <button
                                        type="button"
                                        onClick={resetFilters}
                                        className="mt-3 text-xs font-semibold uppercase tracking-[0.24em] text-[#4534FF] transition hover:text-[#2F1BD1] dark:text-[#AEB1FF] dark:hover:text-white"
                                    >
                                        Reset filters
                                    </button>
                                </div>
                            ) : (
                                <ul className="space-y-4">
                                    {filteredClients.map((client) => (
                                        <li key={client.id}>
                                            <article className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900/70">
                                                <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                                                    <div>
                                                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                                                            {client.name}
                                                        </h3>
                                                        <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-500 dark:text-slate-300">
                                                            <span>{client.email}</span>
                                                            {client.phone ? (
                                                                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                                                    {client.phone}
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                        {client.address ? (
                                                            <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">{client.address}</p>
                                                        ) : null}
                                                        {client.notes ? (
                                                            <p className="mt-4 text-sm leading-relaxed text-slate-500 dark:text-slate-300">
                                                                {client.notes}
                                                            </p>
                                                        ) : null}
                                                    </div>
                                                    <div className="flex gap-2 self-start">
                                                        <button
                                                            type="button"
                                                            className={secondaryButtonClasses}
                                                            onClick={() => openEditModal(client)}
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className={dangerButtonClasses}
                                                            onClick={() => openDeleteModal(client)}
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                </div>
                                                {client.relatedProjects.length > 0 ? (
                                                    <div className="mt-5 flex flex-wrap gap-2">
                                                        {client.relatedProjects.map((project) => (
                                                            <span
                                                                key={`${client.id}-${project}`}
                                                                className="inline-flex items-center rounded-full bg-[#E9E7FF] px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#4534FF] dark:bg-[#2A1F67] dark:text-[#AEB1FF]"
                                                            >
                                                                {project}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : null}
                                            </article>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </SectionCard>
                </div>
            </main>

            {formMode ? (
                <ClientFormModal
                    open={formMode !== null}
                    mode={formMode}
                    client={formMode === 'edit' ? selectedClient : null}
                    onClose={closeFormModal}
                    onSubmit={handleFormSubmit}
                />
            ) : null}

            {deleteTarget ? (
                <DeleteConfirmModal
                    open={deleteTarget !== null}
                    client={deleteTarget}
                    isDeleting={isDeleting}
                    error={deleteError}
                    onClose={closeDeleteModal}
                    onConfirm={handleDelete}
                />
            ) : null}
        </>
    );
}
export default function ClientsPage() {
    return (
        <CrmAuthGuard
            title="Secure client access"
            description="Authenticate to view and manage Codex studio clients stored in the CMS."
        >
            <ClientsDirectory />
        </CrmAuthGuard>
    );
}
function ClientFormModal({ open, mode, client, onClose, onSubmit }: ClientFormModalProps) {
    const [formState, setFormState] = React.useState(() => buildInitialFormState(client ?? null));
    const [error, setError] = React.useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    React.useEffect(() => {
        if (open) {
            setFormState(buildInitialFormState(client ?? null));
            setError(null);
        }
    }, [client, open]);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const name = formState.name.trim();
        const email = formState.email.trim();

        if (!name || !email) {
            setError('Name and email are required.');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            await onSubmit({
                name,
                email,
                phone: formState.phone.trim(),
                address: formState.address.trim(),
                notes: formState.notes.trim(),
                relatedProjects: parseProjectsInput(formState.relatedProjects)
            });
            onClose();
        } catch (submissionError) {
            setError(
                submissionError instanceof Error
                    ? submissionError.message
                    : 'Unable to save the client. Please try again.'
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog.Root open={open} onOpenChange={(nextOpen) => !nextOpen && !isSubmitting && onClose()}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm" />
                <Dialog.Content className="fixed inset-0 z-[101] flex items-center justify-center p-4">
                    <div className="w-full max-w-2xl rounded-3xl border border-white/20 bg-white/85 p-8 shadow-2xl backdrop-blur-xl transition dark:border-slate-700/60 dark:bg-slate-950/70">
                        <Dialog.Title className="text-2xl font-semibold text-slate-900 dark:text-white">
                            {mode === 'create' ? 'Add a new client' : 'Edit client details'}
                        </Dialog.Title>
                        <Dialog.Description className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                            Sync changes directly to the Codex CMS collection powering the CRM.
                        </Dialog.Description>

                        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                            <div className="grid gap-4 md:grid-cols-2">
                                <label className="text-sm">
                                    <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                                        Name
                                    </span>
                                    <input
                                        type="text"
                                        value={formState.name}
                                        onChange={(event) =>
                                            setFormState((previous) => ({ ...previous, name: event.target.value }))
                                        }
                                        className={inputBaseClasses}
                                        required
                                    />
                                </label>
                                <label className="text-sm">
                                    <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                                        Email
                                    </span>
                                    <input
                                        type="email"
                                        value={formState.email}
                                        onChange={(event) =>
                                            setFormState((previous) => ({ ...previous, email: event.target.value }))
                                        }
                                        className={inputBaseClasses}
                                        required
                                    />
                                </label>
                                <label className="text-sm">
                                    <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                                        Phone
                                    </span>
                                    <input
                                        type="text"
                                        value={formState.phone}
                                        onChange={(event) =>
                                            setFormState((previous) => ({ ...previous, phone: event.target.value }))
                                        }
                                        className={inputBaseClasses}
                                    />
                                </label>
                                <label className="text-sm md:col-span-2">
                                    <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                                        Address
                                    </span>
                                    <textarea
                                        rows={2}
                                        value={formState.address}
                                        onChange={(event) =>
                                            setFormState((previous) => ({ ...previous, address: event.target.value }))
                                        }
                                        className={`${inputBaseClasses} min-h-[72px]`}
                                    />
                                </label>
                                <label className="text-sm md:col-span-2">
                                    <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                                        Notes
                                    </span>
                                    <textarea
                                        rows={3}
                                        value={formState.notes}
                                        onChange={(event) =>
                                            setFormState((previous) => ({ ...previous, notes: event.target.value }))
                                        }
                                        className={`${inputBaseClasses} min-h-[96px]`}
                                        placeholder="Internal preferences, project cadence, or billing reminders"
                                    />
                                </label>
                                <label className="text-sm md:col-span-2">
                                    <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                                        Related projects
                                    </span>
                                    <textarea
                                        rows={2}
                                        value={formState.relatedProjects}
                                        onChange={(event) =>
                                            setFormState((previous) => ({
                                                ...previous,
                                                relatedProjects: event.target.value
                                            }))
                                        }
                                        className={`${inputBaseClasses} min-h-[72px]`}
                                        placeholder="Separate entries with commas or line breaks"
                                    />
                                </label>
                            </div>

                            {error ? (
                                <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-600 dark:border-rose-500/50 dark:bg-rose-500/10 dark:text-rose-200">
                                    {error}
                                </div>
                            ) : null}

                            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                                <button
                                    type="button"
                                    className={secondaryButtonClasses}
                                    onClick={onClose}
                                    disabled={isSubmitting}
                                >
                                    Cancel
                                </button>
                                <button type="submit" className={primaryButtonClasses} disabled={isSubmitting}>
                                    {isSubmitting ? 'Saving…' : mode === 'create' ? 'Create client' : 'Save changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
function DeleteConfirmModal({ open, client, isDeleting, error, onClose, onConfirm }: DeleteConfirmModalProps) {
    return (
        <Dialog.Root open={open} onOpenChange={(nextOpen) => !nextOpen && !isDeleting && onClose()}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm" />
                <Dialog.Content className="fixed inset-0 z-[101] flex items-center justify-center p-4">
                    <div className="w-full max-w-lg rounded-3xl border border-white/20 bg-white/90 p-8 text-slate-900 shadow-2xl backdrop-blur-xl transition dark:border-slate-700/60 dark:bg-slate-950/70 dark:text-slate-100">
                        <Dialog.Title className="text-xl font-semibold text-slate-900 dark:text-white">
                            Delete client
                        </Dialog.Title>
                        <Dialog.Description className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                            This action removes the client from the Codex CMS and cannot be undone.
                        </Dialog.Description>

                        <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
                            Are you sure you want to delete{' '}
                            <span className="font-semibold text-slate-900 dark:text-white">{client?.name}</span>? Their linked
                            projects will remain, but this contact record will be removed from the CRM.
                        </p>

                        {error ? (
                            <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-600 dark:border-rose-500/50 dark:bg-rose-500/10 dark:text-rose-200">
                                {error}
                            </div>
                        ) : null}

                        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                className={secondaryButtonClasses}
                                onClick={onClose}
                                disabled={isDeleting}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className={dangerButtonClasses}
                                onClick={() => {
                                    void onConfirm();
                                }}
                                disabled={isDeleting}
                            >
                                {isDeleting ? 'Deleting…' : 'Delete client'}
                            </button>
                        </div>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
type ClientFormState = {
    name: string;
    email: string;
    phone: string;
    address: string;
    notes: string;
    relatedProjects: string;
};

function buildInitialFormState(client: ClientRecord | null): ClientFormState {
    return {
        name: client?.name ?? '',
        email: client?.email ?? '',
        phone: client?.phone ?? '',
        address: client?.address ?? '',
        notes: client?.notes ?? '',
        relatedProjects: formatProjectsForInput(client?.relatedProjects ?? [])
    };
}

function parseProjectsInput(input: string): string[] {
    return input
        .split(/[\n,]/)
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
}

function formatProjectsForInput(projects: string[]): string {
    return projects.join('\n');
}

function normalizeClientResponse(record: unknown, fallbackId: string): ClientRecord {
    if (!record || typeof record !== 'object') {
        return {
            id: fallbackId,
            name: 'New client',
            email: 'client@codex.studio',
            relatedProjects: []
        };
    }

    const source = record as Record<string, unknown>;

    const idValue = source.id;
    const id = typeof idValue === 'string' && idValue.trim() ? idValue.trim() : fallbackId;

    const nameValue = source.name;
    const name = typeof nameValue === 'string' && nameValue.trim() ? nameValue.trim() : 'New client';

    const emailValue = source.email;
    const email = typeof emailValue === 'string' && emailValue.trim() ? emailValue.trim() : 'client@codex.studio';

    const phoneValue = typeof source.phone === 'string' ? source.phone.trim() : undefined;
    const addressValue = typeof source.address === 'string' ? source.address.trim() : undefined;
    const notesValue = typeof source.notes === 'string' ? source.notes.trim() : undefined;

    const relatedRaw = Array.isArray((source as { related_projects?: unknown[] }).related_projects)
        ? (source as { related_projects: unknown[] }).related_projects
        : Array.isArray((source as { relatedProjects?: unknown[] }).relatedProjects)
          ? (source as { relatedProjects: unknown[] }).relatedProjects
          : [];

    const relatedProjects = Array.isArray(relatedRaw)
        ? relatedRaw
              .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
              .filter((entry) => entry.length > 0)
        : [];

    return {
        id,
        name,
        email,
        phone: phoneValue && phoneValue.length > 0 ? phoneValue : undefined,
        address: addressValue && addressValue.length > 0 ? addressValue : undefined,
        notes: notesValue && notesValue.length > 0 ? notesValue : undefined,
        relatedProjects
    };
}

function buildCmsPayload(values: ClientFormValues): CmsClientPayload {
    return {
        name: values.name.trim(),
        email: values.email.trim(),
        phone: values.phone.trim(),
        address: values.address.trim(),
        notes: values.notes.trim(),
        related_projects: values.relatedProjects.map((project) => project.trim())
    };
}
