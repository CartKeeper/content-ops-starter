import * as React from 'react';
import Head from 'next/head';
import useSWR from 'swr';

import { CrmAuthGuard, WorkspaceLayout } from '../../components/crm';
import { NewProjectDrawer, ProjectCard } from '../../components/projects';
import { PROJECT_STATUS_META } from '../../components/projects/status-meta';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import { cn } from '../../lib/cn';
import { getSupabaseBrowserClient } from '../../lib/supabase-browser';
import type { ProjectListResponse, ProjectRecord, ProjectStatus } from '../../types/project';

const STATUS_OPTIONS: Array<ProjectStatus | 'ALL'> = ['ALL', 'PLANNING', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETE', 'CANCELLED'];

const BOARD_STATUSES: ProjectStatus[] = ['PLANNING', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETE', 'CANCELLED'];

const LANE_DESCRIPTIONS: Record<
    ProjectStatus,
    { description: string; emptyTitle: string; emptyDescription: string }
> = {
    PLANNING: {
        description: 'Kick off work, gather briefs, and align the team.',
        emptyTitle: 'No planning projects',
        emptyDescription: 'Create a project to start shaping the next engagement.'
    },
    IN_PROGRESS: {
        description: 'Shoots, edits, and reviews that are actively moving.',
        emptyTitle: 'Nothing in progress',
        emptyDescription: 'Update a project to In progress once production begins.'
    },
    ON_HOLD: {
        description: 'Work paused while you await approvals or next steps.',
        emptyTitle: 'No projects on hold',
        emptyDescription: 'Projects waiting on feedback or decisions will appear here.'
    },
    COMPLETE: {
        description: 'Wrapped engagements ready for delivery and invoicing.',
        emptyTitle: 'No completed projects',
        emptyDescription: 'Mark projects as complete to celebrate the finish line.'
    },
    CANCELLED: {
        description: 'Closed or cancelled engagements kept for reference.',
        emptyTitle: 'No cancelled projects',
        emptyDescription: 'Any cancelled work will land here for your records.'
    }
};

const BOARD_LANES = BOARD_STATUSES.map((status) => ({
    status,
    label: PROJECT_STATUS_META[status].label,
    badgeClass: PROJECT_STATUS_META[status].badgeClass,
    description: LANE_DESCRIPTIONS[status].description,
    emptyTitle: LANE_DESCRIPTIONS[status].emptyTitle,
    emptyDescription: LANE_DESCRIPTIONS[status].emptyDescription
}));

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

type ProjectsToolbarProps = {
    search: string;
    onSearchChange: (value: string) => void;
    statusFilter: ProjectStatus | 'ALL';
    onStatusChange: (value: ProjectStatus | 'ALL') => void;
    tagFilter: string;
    onTagChange: (value: string) => void;
    tagOptions: string[];
};

function ProjectsToolbar({
    search,
    onSearchChange,
    statusFilter,
    onStatusChange,
    tagFilter,
    onTagChange,
    tagOptions
}: ProjectsToolbarProps) {
    return (
        <div className="flex flex-wrap items-center gap-3 sm:flex-nowrap">
            <Input
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Search projects"
                className="h-10 min-w-[16rem] w-full flex-1 rounded-2xl border border-slate-800/70 bg-slate-950/60 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
            />
            <Select
                value={statusFilter}
                onChange={(event) => onStatusChange(event.target.value as ProjectStatus | 'ALL')}
                className="h-10 w-full min-w-[12rem] rounded-2xl border border-slate-800/70 bg-slate-950/60 text-sm text-slate-100 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 sm:w-48"
                aria-label="Highlight status lane"
            >
                {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                        {status === 'ALL'
                            ? 'All lanes'
                            : PROJECT_STATUS_META[status as ProjectStatus]?.label ?? status.replace(/_/g, ' ')}
                    </option>
                ))}
            </Select>
            <Select
                value={tagFilter}
                onChange={(event) => onTagChange(event.target.value)}
                className="h-10 w-full min-w-[12rem] rounded-2xl border border-slate-800/70 bg-slate-950/60 text-sm text-slate-100 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 sm:w-48"
                aria-label="Filter by tag"
            >
                <option value="">All tags</option>
                {tagOptions.map((tag) => (
                    <option key={tag} value={tag}>
                        {tag}
                    </option>
                ))}
            </Select>
        </div>
    );
}

type ProjectsLaneProps = {
    lane: (typeof BOARD_LANES)[number];
    projects: ProjectRecord[];
    isFocused: boolean;
    isDimmed: boolean;
};

function ProjectsLane({ lane, projects, isFocused, isDimmed }: ProjectsLaneProps) {
    return (
        <li
            className={cn(
                'flex h-[calc(100vh-20rem)] min-h-[28rem] w-[340px] flex-shrink-0 flex-col overflow-hidden rounded-3xl border border-slate-800/70 bg-slate-950/60 p-4 shadow-xl shadow-slate-950/40 backdrop-blur',
                isFocused ? 'ring-2 ring-indigo-400/60' : 'ring-1 ring-inset ring-white/5',
                isDimmed ? 'opacity-60 transition-opacity' : 'opacity-100'
            )}
            role="listitem"
            aria-labelledby={`${lane.status.toLowerCase()}-lane-title`}
        >
            <div className="sticky top-0 z-10 -mx-4 flex flex-col gap-2 rounded-3xl bg-slate-950/80 px-4 pb-3 pt-4 backdrop-blur">
                <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                        <h3 id={`${lane.status.toLowerCase()}-lane-title`} className="text-sm font-semibold text-white">
                            {lane.label}
                        </h3>
                        <p className="text-xs text-slate-400">{lane.description}</p>
                    </div>
                    <span
                        className={cn(
                            'inline-flex h-7 min-w-[2.5rem] items-center justify-center rounded-full px-2 text-xs font-semibold uppercase tracking-wide',
                            lane.badgeClass
                        )}
                        aria-label={`${lane.label} column has ${projects.length} projects`}
                    >
                        {projects.length}
                    </span>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto px-2 pb-4">
                <div className="space-y-3">
                    {projects.length > 0 ? (
                        projects.map((project) => <ProjectCard key={project.id} project={project} />)
                    ) : (
                        <div className="flex min-h-[160px] flex-1 items-center justify-center rounded-2xl border border-dashed border-slate-800/60 bg-slate-950/50 p-6 text-center text-sm text-slate-400">
                            <div>
                                <p className="font-semibold text-white">{lane.emptyTitle}</p>
                                <p className="mt-1 text-xs text-slate-400">{lane.emptyDescription}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </li>
    );
}

function ProjectsWorkspace() {
    const [search, setSearch] = React.useState('');
    const [statusFilter, setStatusFilter] = React.useState<ProjectStatus | 'ALL'>('ALL');
    const [tagFilter, setTagFilter] = React.useState<string>('');
    const [isDrawerOpen, setDrawerOpen] = React.useState(false);
    const [toast, setToast] = React.useState<ToastState | null>(null);

    const debouncedSearch = useDebouncedValue(search.trim().toLowerCase(), 300);

    React.useEffect(() => {
        if (!toast) {
            return undefined;
        }
        const timer = window.setTimeout(() => setToast(null), 3200);
        return () => window.clearTimeout(timer);
    }, [toast]);

    const projectsKey = React.useMemo(() => {
        const params = new URLSearchParams();
        if (debouncedSearch.length > 0) {
            params.set('q', debouncedSearch);
        }
        if (tagFilter.trim().length > 0) {
            params.set('tag', tagFilter.trim());
        }
        params.set('page', '1');
        params.set('pageSize', '40');
        return `/api/projects?${params.toString()}`;
    }, [debouncedSearch, tagFilter]);

    const {
        data,
        error,
        isLoading,
        mutate: mutateProjects
    } = useSWR<ProjectListResponse>(projectsKey, fetcher, {
        revalidateOnFocus: false
    });

    const projects = data?.data ?? [];

    const tagOptions = React.useMemo(() => {
        const set = new Set<string>();
        for (const project of projects) {
            for (const tag of project.tags) {
                set.add(tag);
            }
        }
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [projects]);

    const laneBuckets = React.useMemo(() => {
        const buckets = BOARD_STATUSES.reduce((acc, status) => {
            acc[status] = [] as ProjectRecord[];
            return acc;
        }, {} as Record<ProjectStatus, ProjectRecord[]>);

        for (const project of projects) {
            buckets[project.status]?.push(project);
        }

        return buckets;
    }, [projects]);

    React.useEffect(() => {
        const client = getSupabaseBrowserClient();
        const channel = client
            .channel('projects-board')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => {
                void mutateProjects();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'project_tasks' }, () => {
                void mutateProjects();
            })
            .subscribe();

        return () => {
            void client.removeChannel(channel);
        };
    }, [mutateProjects]);

    const handleProjectCreated = React.useCallback(
        (project: ProjectRecord) => {
            setToast({ id: Date.now(), message: `${project.title} created`, variant: 'success' });

            const matchesStatus = statusFilter === 'ALL' || project.status === statusFilter;
            const matchesTag = !tagFilter || project.tags.includes(tagFilter);
            const matchesSearch =
                debouncedSearch.length === 0 ||
                project.title.toLowerCase().includes(debouncedSearch) ||
                (project.description ?? '').toLowerCase().includes(debouncedSearch);

            if (matchesStatus && matchesTag && matchesSearch) {
                void mutateProjects(
                    (current) => {
                        if (!current) {
                            return { data: [project], page: 1, pageSize: 40, total: 1 };
                        }
                        return {
                            ...current,
                            data: [project, ...current.data],
                            total: current.total + 1
                        };
                    },
                    { revalidate: true, rollbackOnError: true }
                );
            } else {
                void mutateProjects();
            }
        },
        [debouncedSearch, mutateProjects, statusFilter, tagFilter]
    );

    const hasError = Boolean(error);
    const shouldShowBoard = !hasError && !isLoading;

    return (
        <div className="flex min-h-[calc(100vh-8rem)] flex-col gap-6 px-4 pb-12 pt-6 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-1">
                    <h1 className="text-2xl font-semibold text-white">Projects</h1>
                    <p className="text-sm text-slate-400">
                        Monitor project delivery, see upcoming tasks, and keep billing in sync.
                    </p>
                </div>
                <div className="flex w-full justify-start md:w-auto md:justify-end">
                    <Button onClick={() => setDrawerOpen(true)} className="w-100 w-md-auto">
                        New project
                    </Button>
                </div>
            </div>

            <div className="rounded-3xl border border-slate-800/70 bg-slate-950/60 p-4">
                <ProjectsToolbar
                    search={search}
                    onSearchChange={setSearch}
                    statusFilter={statusFilter}
                    onStatusChange={setStatusFilter}
                    tagFilter={tagFilter}
                    onTagChange={setTagFilter}
                    tagOptions={tagOptions}
                />
            </div>

            {isLoading ? (
                <div className="rounded-3xl border border-slate-800/70 bg-slate-950/60 p-10 text-center text-sm text-slate-400">
                    Loading projects…
                </div>
            ) : null}

            {hasError ? (
                <div className="rounded-3xl border border-rose-500/40 bg-rose-500/10 p-6 text-center text-sm text-rose-200">
                    Unable to load projects. Please try again shortly.
                </div>
            ) : null}

            {shouldShowBoard ? (
                <section aria-label="Projects board" className="relative flex-1">
                    <div className="overflow-x-auto pb-8">
                        <ul className="flex items-start gap-6 pr-4" role="list">
                            {BOARD_LANES.map((lane) => {
                                const laneProjects = laneBuckets[lane.status] ?? [];
                                const isFocused = statusFilter !== 'ALL' && statusFilter === lane.status;
                                const isDimmed = statusFilter !== 'ALL' && statusFilter !== lane.status;

                                return (
                                    <ProjectsLane
                                        key={lane.status}
                                        lane={lane}
                                        projects={laneProjects}
                                        isFocused={isFocused}
                                        isDimmed={isDimmed}
                                    />
                                );
                            })}
                        </ul>
                    </div>
                </section>
            ) : null}

            <NewProjectDrawer
                open={isDrawerOpen}
                onOpenChange={setDrawerOpen}
                onProjectCreated={handleProjectCreated}
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
