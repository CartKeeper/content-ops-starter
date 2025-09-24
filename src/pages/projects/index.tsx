import * as React from 'react';
import Head from 'next/head';
import useSWR from 'swr';

import { useNetlifyIdentity } from '../../components/auth';
import { CrmAuthGuard, WorkspaceLayout } from '../../components/crm';
import { NewProjectDrawer } from '../../components/projects';
import { PROJECT_STATUS_META } from '../../components/projects/status-meta';
import { formatDate } from '../../lib/formatters';
import { getSupabaseBrowserClient } from '../../lib/supabase-browser';
import type { ProjectListResponse, ProjectRecord, ProjectStatus } from '../../types/project';

const STATUS_OPTIONS: Array<ProjectStatus | 'ALL'> = ['ALL', 'PLANNING', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETE', 'CANCELLED'];

const fetcher = async <T,>(url: string): Promise<T> => {
    const response = await fetch(url);
    if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? 'Request failed');
    }
    return (await response.json()) as T;
};

type ToastState = {
    id: number;
    message: string;
    variant: 'success' | 'error';
};

function Toast({ toast }: { toast: ToastState | null }) {
    if (!toast) {
        return null;
    }
    const variantClass =
        toast.variant === 'success'
            ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-100'
            : 'border-rose-400/40 bg-rose-500/15 text-rose-100';

    return (
        <div className="pointer-events-none fixed bottom-6 right-6 z-50">
            <div className={`pointer-events-auto rounded-2xl border px-4 py-3 text-sm shadow-lg ${variantClass}`}>
                {toast.message}
            </div>
        </div>
    );
}

function useDebouncedValue<T>(value: T, delay = 300) {
    const [debounced, setDebounced] = React.useState(value);

    React.useEffect(() => {
        const timer = window.setTimeout(() => setDebounced(value), delay);
        return () => window.clearTimeout(timer);
    }, [value, delay]);

    return debounced;
}

type ProjectsToolbarState = {
    search: string;
    status: ProjectStatus | 'ALL';
    tag: string;
};

function ProjectsWorkspace() {
    const identity = useNetlifyIdentity();
    const client = getSupabaseBrowserClient();
    const workspaceId = identity.user?.workspaceId ?? null;

    const [controls, setControls] = React.useState<ProjectsToolbarState>({ search: '', status: 'ALL', tag: '' });
    const [drawerMode, setDrawerMode] = React.useState<'create' | 'edit'>('create');
    const [activeProject, setActiveProject] = React.useState<ProjectRecord | null>(null);
    const [isDrawerOpen, setDrawerOpen] = React.useState(false);
    const [toast, setToast] = React.useState<ToastState | null>(null);

    const debouncedSearch = useDebouncedValue(controls.search.trim().toLowerCase(), 300);

    React.useEffect(() => {
        if (!toast) {
            return;
        }
        const timer = window.setTimeout(() => setToast(null), 3200);
        return () => window.clearTimeout(timer);
    }, [toast]);

    const projectsKey = React.useMemo(() => {
        const params = new URLSearchParams();
        if (debouncedSearch.length > 0) {
            params.set('q', debouncedSearch);
        }
        if (controls.tag.trim().length > 0) {
            params.set('tag', controls.tag.trim());
        }
        params.set('page', '1');
        params.set('pageSize', '40');
        return `/api/projects?${params.toString()}`;
    }, [controls.tag, debouncedSearch]);

    const {
        data,
        error,
        isLoading,
        mutate: mutateProjects
    } = useSWR<ProjectListResponse>(projectsKey, fetcher, {
        revalidateOnFocus: false
    });

    const mutateRef = React.useRef(mutateProjects);
    React.useEffect(() => {
        mutateRef.current = mutateProjects;
    }, [mutateProjects]);

    const rafId = React.useRef<number | null>(null);
    const requestMutate = React.useCallback(() => {
        if (typeof window === 'undefined') {
            void mutateRef.current?.();
            return;
        }

        if (rafId.current != null) {
            return;
        }

        rafId.current = window.requestAnimationFrame(() => {
            rafId.current = null;
            void mutateRef.current?.();
        });
    }, []);

    const projects = data?.data ?? [];

    const tagOptions = React.useMemo(() => {
        const set = new Set<string>();
        projects.forEach((project) => {
            project.tags.forEach((tag) => set.add(tag));
        });
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [projects]);

    const filteredProjects = React.useMemo(() => {
        if (controls.status === 'ALL') {
            return projects;
        }
        return projects.filter((project) => project.status === controls.status);
    }, [controls.status, projects]);

    React.useEffect(() => {
        if (!workspaceId) {
            return;
        }

        const channel = client
            .channel(`projects:${workspaceId}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'projects', filter: `workspace_id=eq.${workspaceId}` },
                requestMutate
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'project_tasks', filter: `workspace_id=eq.${workspaceId}` },
                requestMutate
            )
            .subscribe();

        return () => {
            void client.removeChannel(channel);
        };
    }, [client, workspaceId, requestMutate]);

    const hasError = Boolean(error);

    const openCreateDrawer = React.useCallback(() => {
        setDrawerMode('create');
        setActiveProject(null);
        setDrawerOpen(true);
    }, []);

    const openEditDrawer = React.useCallback((project: ProjectRecord) => {
        setDrawerMode('edit');
        setActiveProject(project);
        setDrawerOpen(true);
    }, []);

    const handleDrawerOpenChange = React.useCallback((open: boolean) => {
        setDrawerOpen(open);
        if (!open) {
            setActiveProject(null);
            setDrawerMode('create');
        }
    }, []);

    const handleProjectCreated = React.useCallback(
        (project: ProjectRecord) => {
            setToast({ id: Date.now(), message: `${project.title} created`, variant: 'success' });
            setActiveProject(null);
            setDrawerMode('create');
            void mutateProjects();
        },
        [mutateProjects]
    );

    const handleProjectUpdated = React.useCallback(
        (project: ProjectRecord) => {
            setToast({ id: Date.now(), message: `${project.title} updated`, variant: 'success' });
            setActiveProject(null);
            setDrawerMode('create');
            setDrawerOpen(false);
            void mutateProjects();
        },
        [mutateProjects]
    );

    const handleSearchChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setControls((previous) => ({ ...previous, search: event.target.value }));
    }, []);

    const handleStatusChange = React.useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
        setControls((previous) => ({ ...previous, status: event.target.value as ProjectsToolbarState['status'] }));
    }, []);

    const handleTagChange = React.useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
        setControls((previous) => ({ ...previous, tag: event.target.value }));
    }, []);

    const renderProjects = () => {
        if (isLoading) {
            return (
                <div className="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-10 text-center text-sm text-slate-400">
                    Loading projects…
                </div>
            );
        }

        if (hasError) {
            return (
                <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-6 text-center text-sm text-rose-200">
                    Unable to load projects. Please try again shortly.
                </div>
            );
        }

        if (filteredProjects.length === 0) {
            return (
                <div className="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-10 text-center text-sm text-slate-400">
                    {projects.length === 0
                        ? 'No projects yet. Create your first project.'
                        : 'No projects match the current filters.'}
                </div>
            );
        }

        return (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {filteredProjects.map((project) => {
                    const statusMeta = PROJECT_STATUS_META[project.status];
                    const completedTasks = project.tasks.filter((task) => task.status === 'COMPLETE').length;
                    const scheduleLabel =
                        project.startDate && project.endDate
                            ? `${formatDate(project.startDate)} – ${formatDate(project.endDate)}`
                            : project.endDate
                                ? `Due ${formatDate(project.endDate)}`
                                : 'Schedule TBD';

                    return (
                        <li key={project.id}>
                            <button
                                type="button"
                                onClick={() => openEditDrawer(project)}
                                className="group block w-full rounded-2xl border border-slate-800/70 bg-slate-950/60 p-5 text-left transition hover:border-indigo-400/60 hover:bg-slate-950/80"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="space-y-2">
                                        <span
                                            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusMeta.badgeClass}`}
                                        >
                                            {statusMeta.label}
                                        </span>
                                        <div>
                                            <h3 className="text-lg font-semibold text-white line-clamp-1">{project.title}</h3>
                                            <p className="text-xs text-slate-400">
                                                Client · {project.clientName ?? 'Unknown client'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl font-semibold text-white">{project.completionPercent}%</div>
                                        <div className="text-xs uppercase tracking-wide text-slate-500">Completion</div>
                                    </div>
                                </div>
                                {project.description ? (
                                    <p className="mt-4 text-sm text-slate-300 line-clamp-3">{project.description}</p>
                                ) : (
                                    <p className="mt-4 text-sm text-slate-500">No description yet.</p>
                                )}
                                <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                                    <span>{scheduleLabel}</span>
                                    <span>
                                        {completedTasks}/{project.tasks.length} tasks
                                    </span>
                                </div>
                                {project.tags.length > 0 ? (
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {project.tags.map((tag) => (
                                            <span
                                                key={tag}
                                                className="inline-flex items-center rounded-full border border-slate-700/80 bg-slate-900/70 px-2 py-0.5 text-[11px] uppercase tracking-wide text-slate-300"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                ) : null}
                            </button>
                        </li>
                    );
                })}
            </ul>
        );
    };

    return (
        <div className="mx-auto max-w-7xl space-y-8 p-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-4">
                    <div>
                        <h1 className="text-3xl font-semibold text-white">Projects</h1>
                        <p className="mt-1 text-sm text-slate-400">
                            Monitor delivery, see upcoming tasks, and keep billing in sync.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={openCreateDrawer}
                        className="inline-flex items-center justify-center rounded-2xl bg-indigo-500/90 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
                    >
                        New project
                    </button>
                </div>
                <div className="w-full max-w-xs space-y-3">
                    <input
                        value={controls.search}
                        onChange={handleSearchChange}
                        placeholder="Search projects"
                        className="w-full rounded-2xl border border-slate-800/70 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
                    />
                    <select
                        value={controls.status}
                        onChange={handleStatusChange}
                        className="w-full rounded-2xl border border-slate-800/70 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
                        aria-label="Filter by project status"
                    >
                        {STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>
                                {status === 'ALL' ? 'All statuses' : PROJECT_STATUS_META[status].label}
                            </option>
                        ))}
                    </select>
                    <select
                        value={controls.tag}
                        onChange={handleTagChange}
                        className="w-full rounded-2xl border border-slate-800/70 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
                        aria-label="Filter by tag"
                    >
                        <option value="">All tags</option>
                        {tagOptions.map((tag) => (
                            <option key={tag} value={tag}>
                                {tag}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {renderProjects()}

            <NewProjectDrawer
                open={isDrawerOpen}
                mode={drawerMode}
                project={drawerMode === 'edit' ? activeProject : null}
                onOpenChange={handleDrawerOpenChange}
                onProjectCreated={handleProjectCreated}
                onProjectUpdated={handleProjectUpdated}
            />
            <Toast toast={toast} />
        </div>
    );
}

export default function ProjectsPage() {
    return (
        <CrmAuthGuard>
            <WorkspaceLayout>
                <Head>
                    <title>Projects · Aperture Studio CRM</title>
                </Head>
                <ProjectsWorkspace />
            </WorkspaceLayout>
        </CrmAuthGuard>
    );
}
