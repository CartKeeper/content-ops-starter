import * as React from 'react';
import Head from 'next/head';
import dayjs from 'dayjs';

import { StatusPill, WorkspaceLayout } from '../../components/crm';
import type { StatusTone } from '../../components/crm/StatusPill';
import type { ProjectRecord } from '../../data/crm';
import { projectPipeline } from '../../data/crm';
import type { BookingStatus } from '../../components/crm';
import type { InvoiceStatus } from '../../types/invoice';

const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
});

const bookingStatusTone: Record<BookingStatus, StatusTone> = {
    Confirmed: 'success',
    Pending: 'warning',
    Editing: 'info'
};

const invoiceStatusTone: Record<InvoiceStatus, StatusTone> = {
    Draft: 'neutral',
    Sent: 'info',
    Paid: 'success',
    Overdue: 'danger'
};

function resolveProjectStatus(progress: number): { label: string; tone: StatusTone } {
    if (progress >= 0.95) {
        return { label: 'Completed', tone: 'success' };
    }
    if (progress >= 0.6) {
        return { label: 'In progress', tone: 'info' };
    }
    return { label: 'Planning', tone: 'warning' };
}

function formatDate(value: string) {
    return dayjs(value).format('MMM D, YYYY');
}

function ProjectsContent({ projects }: { projects: ProjectRecord[] }) {
    return (
        <div className="row row-cards">
            {projects.map((project) => {
                const progressValue = Math.round(project.progress * 100);
                const projectStatus = resolveProjectStatus(project.progress);

                return (
                    <div key={project.id} className="col-md-6 col-xl-4">
                        <div className="card h-100">
                            <div className="card-body d-flex flex-column">
                                <div className="d-flex align-items-start justify-content-between gap-3">
                                    <div>
                                        <StatusPill tone={projectStatus.tone}>{projectStatus.label}</StatusPill>
                                        <h2 className="card-title mt-3 mb-1">{project.name}</h2>
                                        <div className="text-secondary">Client: {project.client}</div>
                                    </div>
                                    <div className="text-end">
                                        <span className="crm-progress-value">{progressValue}%</span>
                                        <div className="crm-progress-label text-secondary small">completion</div>
                                    </div>
                                </div>
                                <p className="text-secondary mt-3 flex-grow-0">{project.description}</p>
                                <div className="mt-4">
                                    <div className="crm-dropdown-label">Timeline</div>
                                    <ul className="list-unstyled crm-project-timeline mb-0">
                                        {project.shoots.map((milestone) => (
                                            <li key={milestone.id} className="crm-project-milestone">
                                                <span className="crm-project-milestone-indicator" aria-hidden />
                                                <div className="flex-grow-1">
                                                    <div className="d-flex align-items-center justify-content-between gap-2">
                                                        <div className="fw-semibold">{milestone.label}</div>
                                                        <StatusPill tone={bookingStatusTone[milestone.status]}>
                                                            {milestone.status}
                                                        </StatusPill>
                                                    </div>
                                                    <div className="text-secondary small mt-1">
                                                        {formatDate(milestone.date)}
                                                        {milestone.location ? ` · ${milestone.location}` : ''}
                                                    </div>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="mt-4">
                                    <div className="crm-dropdown-label">Accounts</div>
                                    <div className="crm-project-invoices d-flex flex-column gap-3">
                                        {project.invoices.map((invoice) => (
                                            <div key={invoice.id} className="d-flex align-items-center justify-content-between gap-3">
                                                <div>
                                                    <div className="fw-semibold">Invoice #{invoice.id}</div>
                                                    <div className="text-secondary small">
                                                        Due {formatDate(invoice.dueDate)}
                                                    </div>
                                                </div>
                                                <div className="text-end">
                                                    <div className="fw-semibold">{currencyFormatter.format(invoice.amount)}</div>
                                                    <StatusPill tone={invoiceStatusTone[invoice.status]}>{invoice.status}</StatusPill>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <div className="progress progress-sm">
                                        <div className="progress-bar" role="progressbar" style={{ width: `${progressValue}%` }} />
                                    </div>
                                    <div className="d-flex align-items-center justify-content-between text-secondary small mt-2">
                                        <span>{dayjs(project.startDate).format('MMM D')}</span>
                                        <span>{dayjs(project.endDate).format('MMM D')}</span>
                                    </div>
                                </div>
                                <div className="mt-4 d-flex flex-wrap gap-2">
                                    {project.tags.map((tag) => (
                                        <span
                                            key={tag}
                                            className="badge bg-primary-lt text-primary fw-semibold text-uppercase"
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default function ProjectsPage() {
    return (
        <>
            <Head>
                <title>Projects · Aperture Studio CRM</title>
            </Head>
            <WorkspaceLayout>
                <ProjectsContent projects={projectPipeline} />
            </WorkspaceLayout>
        </>
    );
}
