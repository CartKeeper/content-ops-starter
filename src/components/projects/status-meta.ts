import type { ProjectStatus } from '../../types/project';

export type ProjectStatusMeta = {
    label: string;
    badgeClass: string;
};

const neutralBadgeClass = 'border-slate-500/40 bg-slate-500/15 text-slate-200';

export const PROJECT_STATUS_META: Record<ProjectStatus, ProjectStatusMeta> = {
    PLANNING: {
        label: 'Planning',
        badgeClass: 'border-amber-400/40 bg-amber-500/15 text-amber-200'
    },
    IN_PROGRESS: {
        label: 'In progress',
        badgeClass: 'border-indigo-400/40 bg-indigo-500/15 text-indigo-200'
    },
    ON_HOLD: {
        label: 'On hold',
        badgeClass: 'border-slate-400/40 bg-slate-500/15 text-slate-200'
    },
    COMPLETE: {
        label: 'Complete',
        badgeClass: 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200'
    },
    CANCELLED: {
        label: 'Cancelled',
        badgeClass: 'border-rose-400/40 bg-rose-500/15 text-rose-200'
    }
};

export function formatProjectStatusLabel(rawStatus?: string | null): string {
    if (!rawStatus) {
        return 'Unknown Status';
    }

    const cleaned = rawStatus
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    if (!cleaned) {
        return 'Unknown Status';
    }

    return cleaned
        .split(' ')
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

export function getProjectStatusMeta(status?: string | null) {
    if (status && status in PROJECT_STATUS_META) {
        const typedStatus = status as ProjectStatus;
        return { ...PROJECT_STATUS_META[typedStatus], isKnown: true as const };
    }

    return {
        label: formatProjectStatusLabel(status),
        badgeClass: neutralBadgeClass,
        isKnown: false as const
    };
}
