import Link from 'next/link';
import * as React from 'react';

import { DashboardCard, Progress } from '../dashboard';
import { Badge } from '../ui/badge';
import { formatCurrency, formatDate } from '../../lib/formatters';
import {
    type ProjectInvoiceSnippet,
    type ProjectRecord,
    type ProjectStatus,
    type ProjectTaskRecord,
    type ProjectTaskStatus
} from '../../types/project';

const projectStatusMap = {
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
} satisfies Record<ProjectStatus, { label: string; badgeClass: string }>;

const taskStatusMap = {
    PENDING: { label: 'Pending', className: 'border-amber-400/40 bg-amber-500/15 text-amber-200' },
    CONFIRMED: { label: 'Confirmed', className: 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200' },
    EDITING: { label: 'Editing', className: 'border-sky-400/40 bg-sky-500/15 text-sky-200' },
    COMPLETE: { label: 'Complete', className: 'border-indigo-400/40 bg-indigo-500/15 text-indigo-200' }
} satisfies Record<ProjectTaskStatus, { label: string; className: string }>;

const invoiceStatusMap: Record<ProjectInvoiceSnippet['status'], string> = {
    PAID: 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200',
    SENT: 'border-sky-400/40 bg-sky-500/15 text-sky-200',
    OVERDUE: 'border-rose-400/40 bg-rose-500/15 text-rose-200',
    DRAFT: 'border-slate-400/40 bg-slate-500/15 text-slate-200'
};

const neutralBadgeClass = 'border-slate-500/40 bg-slate-500/15 text-slate-200';

function formatStatusLabel(rawStatus?: string | null): string {
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

function getProjectStatusMeta(status: string | undefined) {
    const meta = projectStatusMap[status as keyof typeof projectStatusMap];

    if (meta) {
        return meta;
    }

    return {
        label: formatStatusLabel(status),
        badgeClass: neutralBadgeClass
    };
}

function getTaskStatusMeta(status: string | undefined) {
    const meta = taskStatusMap[status as keyof typeof taskStatusMap];

    if (meta) {
        return meta;
    }

    return {
        label: formatStatusLabel(status),
        className: neutralBadgeClass
    };
}

function sortTasks(tasks: ProjectTaskRecord[]): ProjectTaskRecord[] {
    return [...tasks].sort((a, b) => {
        const aTime = a.date ? Date.parse(a.date) : Number.MAX_SAFE_INTEGER;
        const bTime = b.date ? Date.parse(b.date) : Number.MAX_SAFE_INTEGER;
        if (aTime !== bTime) {
            return aTime - bTime;
        }
        return a.orderIndex - b.orderIndex;
    });
}

type ProjectCardProps = {
    project: ProjectRecord;
};

function formatInvoiceLine(invoice: ProjectInvoiceSnippet) {
    const amount = typeof invoice.amountCents === 'number' ? formatCurrency(invoice.amountCents) : '$0.00';
    const number = invoice.number ? `#${invoice.number}` : `#${invoice.id}`;
    const dueDate = invoice.dueAt ? `Due ${formatDate(invoice.dueAt)}` : 'No due date';
    return { amount, number, dueDate };
}

export function ProjectCard({ project }: ProjectCardProps) {
    const statusMeta = getProjectStatusMeta(project.status);
    const tasks = sortTasks(project.tasks);
    const hasTimeline = tasks.length > 0;
    const hasDateRange = project.startDate && project.endDate;

    return (
        <DashboardCard>
            <div className="flex items-start justify-between gap-6">
                <div className="space-y-3">
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusMeta.badgeClass}`}>
                        {statusMeta.label}
                    </span>
                    <div>
                        <h2 className="text-xl font-semibold text-white">{project.title}</h2>
                        <p className="mt-1 text-sm text-slate-400">Client · {project.clientName ?? 'Unknown client'}</p>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-3xl font-semibold text-white">{project.completionPercent}%</div>
                    <div className="text-xs uppercase tracking-wide text-slate-500">Completion</div>
                </div>
            </div>

            {project.description ? (
                <p className="mt-5 text-sm text-slate-300 line-clamp-3">{project.description}</p>
            ) : null}

            {hasTimeline ? (
                <div className="mt-6 space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">Timeline</h3>
                    <ul className="space-y-3">
                        {tasks.map((task) => {
                            const tone = getTaskStatusMeta(task.status);
                            return (
                                <li key={task.id} className="flex items-start gap-3">
                                    <span className="mt-1 h-2 w-2 rounded-full bg-slate-600" aria-hidden />
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="text-sm font-semibold text-white">{task.name}</span>
                                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone.className}`}>
                                                {tone.label}
                                            </span>
                                        </div>
                                        <div className="mt-1 text-xs text-slate-400">
                                            {task.date ? formatDate(task.date) : 'Date TBD'}
                                            {task.location ? ` · ${task.location}` : ''}
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            ) : null}

            <div className="mt-6 space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">Accounts</h3>
                {project.invoices.length > 0 ? (
                    <ul className="space-y-3">
                        {project.invoices.map((invoice) => {
                            const statusClass = invoiceStatusMap[invoice.status];
                            const { amount, number, dueDate } = formatInvoiceLine(invoice);
                            const invoiceHref = `/accounts-payable/?invoiceId=${invoice.id}`;
                            return (
                                <li key={invoice.id} className="flex items-center justify-between gap-4">
                                    <div>
                                        <Link href={invoiceHref} className="text-sm font-semibold text-white hover:text-indigo-200">
                                            Invoice {number}
                                        </Link>
                                        <div className="text-xs text-slate-500">{dueDate}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-semibold text-white">{amount}</div>
                                        <span className={`mt-1 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusClass}`}>
                                            {invoice.status}
                                        </span>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                ) : (
                    <p className="text-sm text-slate-400">No invoices yet.</p>
                )}
            </div>

            {hasDateRange ? (
                <div className="mt-6 space-y-2">
                    <Progress value={project.completionPercent} />
                    <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>{formatDate(project.startDate)}</span>
                        <span>{formatDate(project.endDate)}</span>
                    </div>
                </div>
            ) : null}

            {project.tags.length > 0 ? (
                <div className="mt-6 flex flex-wrap gap-2">
                    {project.tags.map((tag) => (
                        <Badge
                            key={tag}
                            variant="neutral"
                            className="border-slate-700/80 bg-slate-900/80 text-xs uppercase tracking-wide text-slate-300"
                        >
                            {tag}
                        </Badge>
                    ))}
                </div>
            ) : null}
        </DashboardCard>
    );
}

export default ProjectCard;
