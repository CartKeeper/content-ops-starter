import * as React from 'react';
import Head from 'next/head';

import { WorkspaceLayout } from '../../components/crm';
import { adminUser } from '../../data/crm';

const notificationPreferences = [
    {
        id: 'booking-alerts',
        label: 'New booking requests',
        description: 'Get notified when a lead selects a session date or completes the inquiry form.',
        defaultChecked: true
    },
    {
        id: 'payment-status',
        label: 'Payment activity',
        description: 'Alerts when invoices are paid, overdue, or require manual follow-up.',
        defaultChecked: true
    },
    {
        id: 'gallery-delivery',
        label: 'Gallery delivery',
        description: 'Send a confirmation when new galleries finish uploading to client portals.',
        defaultChecked: false
    },
    {
        id: 'weekly-digest',
        label: 'Weekly digest',
        description: 'A Monday morning summary of open tasks, upcoming shoots, and invoices.',
        defaultChecked: true
    }
];

const integrations = [
    {
        id: 'google-drive',
        name: 'Google Drive',
        initials: 'GD',
        status: 'Connected',
        description: 'Sync project folders and delivery files automatically.',
        color: '#10b981'
    },
    {
        id: 'google-calendar',
        name: 'Google Calendar',
        initials: 'GC',
        status: 'Connected',
        description: 'Push confirmed shoots and reminders to your personal calendar.',
        color: '#6366f1'
    },
    {
        id: 'instagram',
        name: 'Instagram Business',
        initials: 'IG',
        status: 'Syncing',
        description: 'Schedule reels and carousels directly from project galleries.',
        color: '#f472b6'
    }
];

export default function SettingsPage() {
    return (
        <>
            <Head>
                <title>Settings · Aperture Studio CRM</title>
            </Head>
            <WorkspaceLayout>
                <div className="row row-cards">
                    <div className="col-xl-6">
                        <div className="card h-100">
                            <div className="card-header d-flex align-items-center justify-content-between">
                                <div>
                                    <h2 className="card-title mb-0">Studio profile</h2>
                                    <div className="text-secondary">Update contact details and booking hand-offs.</div>
                                </div>
                                <span className="badge bg-success-lt text-success">Live</span>
                            </div>
                            <div className="card-body">
                                <form className="row g-3">
                                    <div className="col-12">
                                        <label className="form-label" htmlFor="studio-name">
                                            Studio name
                                        </label>
                                        <input id="studio-name" type="text" className="form-control" defaultValue="Aperture Studio" />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label" htmlFor="profile-name">
                                            Primary contact
                                        </label>
                                        <input id="profile-name" type="text" className="form-control" defaultValue={adminUser.name} />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label" htmlFor="profile-role">
                                            Role
                                        </label>
                                        <input id="profile-role" type="text" className="form-control" defaultValue={adminUser.role} />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label" htmlFor="profile-email">
                                            Email
                                        </label>
                                        <input id="profile-email" type="email" className="form-control" defaultValue={adminUser.email} />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label" htmlFor="profile-phone">
                                            Phone
                                        </label>
                                        <input id="profile-phone" type="tel" className="form-control" defaultValue={adminUser.phone ?? ''} />
                                    </div>
                                    <div className="col-12">
                                        <label className="form-label" htmlFor="profile-welcome">
                                            Client welcome message
                                        </label>
                                        <textarea
                                            id="profile-welcome"
                                            className="form-control"
                                            rows={3}
                                            defaultValue="We can’t wait to collaborate. Share any mood boards, location inspiration, or must-have shots and we’ll add them to the project brief."
                                        />
                                    </div>
                                    <div className="col-12 d-flex flex-wrap gap-2">
                                        <button type="button" className="btn btn-primary">
                                            Save profile
                                        </button>
                                        <button type="button" className="btn btn-outline-secondary">
                                            Send preview invite
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                    <div className="col-xl-6">
                        <div className="card h-100">
                            <div className="card-header">
                                <h2 className="card-title mb-0">Notification preferences</h2>
                                <div className="text-secondary">Choose how the studio stays in sync.</div>
                            </div>
                            <div className="card-body d-flex flex-column gap-3">
                                {notificationPreferences.map((preference) => (
                                    <div key={preference.id} className="form-check form-switch crm-settings-toggle">
                                        <input
                                            className="form-check-input"
                                            type="checkbox"
                                            role="switch"
                                            id={preference.id}
                                            defaultChecked={preference.defaultChecked}
                                        />
                                        <label className="form-check-label" htmlFor={preference.id}>
                                            <span className="fw-semibold d-block">{preference.label}</span>
                                            <span className="text-secondary">{preference.description}</span>
                                        </label>
                                    </div>
                                ))}
                                <div className="mt-2">
                                    <button type="button" className="btn btn-outline-secondary">
                                        Update notifications
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="col-12">
                        <div className="card">
                            <div className="card-header d-flex align-items-center justify-content-between">
                                <div>
                                    <h2 className="card-title mb-0">Connected integrations</h2>
                                    <div className="text-secondary">Bring your favorite tools into the workflow.</div>
                                </div>
                                <button type="button" className="btn btn-outline-secondary">
                                    Add integration
                                </button>
                            </div>
                            <div className="card-body d-grid gap-3">
                                {integrations.map((integration) => (
                                    <div key={integration.id} className="crm-integration-item">
                                        <div className="d-flex align-items-center gap-3">
                                            <span
                                                className="crm-integration-icon"
                                                style={{ backgroundColor: integration.color }}
                                                aria-hidden
                                            >
                                                {integration.initials}
                                            </span>
                                            <div>
                                                <div className="fw-semibold">{integration.name}</div>
                                                <div className="text-secondary small">{integration.description}</div>
                                            </div>
                                        </div>
                                        <div className="text-end">
                                            <span className="badge bg-success-lt text-success d-block mb-2">{integration.status}</span>
                                            <button type="button" className="btn btn-link p-0">
                                                Manage
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </WorkspaceLayout>
        </>
    );
}
