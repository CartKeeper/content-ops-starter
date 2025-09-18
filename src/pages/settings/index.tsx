import * as React from 'react';
import Head from 'next/head';

import { WorkspaceLayout } from '../../components/crm';
import { useIntegrations, type IntegrationStatus } from '../../components/crm/integration-context';
import { adminUser } from '../../data/crm';
import { INTEGRATION_CATEGORIES } from '../../data/integrations';

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

export default function SettingsPage() {
    const {
        availableIntegrations,
        connectedIntegrations,
        connectIntegration,
        disconnectIntegration,
        setIntegrationStatus
    } = useIntegrations();
    const [isAddOpen, setIsAddOpen] = React.useState(false);
    const [selectedIntegrationId, setSelectedIntegrationId] = React.useState<string>('');
    const [activeIntegrationId, setActiveIntegrationId] = React.useState<string | null>(null);

    const availableOptions = React.useMemo(
        () =>
            availableIntegrations.filter(
                (definition) => !connectedIntegrations.some((entry) => entry.id === definition.id)
            ),
        [availableIntegrations, connectedIntegrations]
    );

    React.useEffect(() => {
        if (availableOptions.length === 0) {
            setSelectedIntegrationId('');
            return;
        }

        if (!availableOptions.some((option) => option.id === selectedIntegrationId)) {
            setSelectedIntegrationId(availableOptions[0].id);
        }
    }, [availableOptions, selectedIntegrationId]);

    React.useEffect(() => {
        if (activeIntegrationId && !connectedIntegrations.some((entry) => entry.id === activeIntegrationId)) {
            setActiveIntegrationId(null);
        }
    }, [activeIntegrationId, connectedIntegrations]);

    const handleAddIntegration = React.useCallback(() => {
        if (!selectedIntegrationId) {
            return;
        }
        connectIntegration(selectedIntegrationId);
        setIsAddOpen(false);
        setActiveIntegrationId(selectedIntegrationId);
    }, [connectIntegration, selectedIntegrationId]);

    const handleStatusChange = React.useCallback(
        (id: string, status: IntegrationStatus) => {
            setIntegrationStatus(id, status);
        },
        [setIntegrationStatus]
    );

    const handleDisconnect = React.useCallback(
        (id: string) => {
            disconnectIntegration(id);
        },
        [disconnectIntegration]
    );

    const orderedIntegrations = React.useMemo(() => connectedIntegrations, [connectedIntegrations]);

    const statusBadgeTone: Record<IntegrationStatus, string> = {
        Connected: 'bg-success-lt text-success',
        Syncing: 'bg-primary-lt text-primary'
    };

    const statusLabels: Record<IntegrationStatus, string> = {
        Connected: 'Connected',
        Syncing: 'Syncing'
    };

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
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary"
                                    onClick={() => setIsAddOpen((previous) => !previous)}
                                    aria-expanded={isAddOpen}
                                    disabled={availableOptions.length === 0 && !isAddOpen}
                                >
                                    {isAddOpen ? 'Close' : 'Add integration'}
                                </button>
                            </div>
                            <div className="card-body d-grid gap-3">
                                {isAddOpen ? (
                                    <div className="crm-integration-add p-3 border rounded">
                                        <div className="fw-semibold mb-1">Connect a new integration</div>
                                        {availableOptions.length > 0 ? (
                                            <>
                                                <label className="form-label" htmlFor="integration-select">
                                                    Choose from connected services
                                                </label>
                                                <select
                                                    id="integration-select"
                                                    className="form-select"
                                                    value={selectedIntegrationId}
                                                    onChange={(event) => setSelectedIntegrationId(event.target.value)}
                                                >
                                                    {INTEGRATION_CATEGORIES.map((category) => {
                                                        const categoryOptions = availableOptions.filter(
                                                            (option) => option.categoryId === category.id
                                                        );
                                                        if (categoryOptions.length === 0) {
                                                            return null;
                                                        }
                                                        return (
                                                            <optgroup key={category.id} label={category.label}>
                                                                {categoryOptions.map((option) => (
                                                                    <option key={option.id} value={option.id}>
                                                                        {option.name}
                                                                    </option>
                                                                ))}
                                                            </optgroup>
                                                        );
                                                    })}
                                                </select>
                                                <div className="d-flex gap-2 mt-3">
                                                    <button
                                                        type="button"
                                                        className="btn btn-primary"
                                                        onClick={handleAddIntegration}
                                                        disabled={!selectedIntegrationId}
                                                    >
                                                        Connect integration
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn btn-outline-secondary"
                                                        onClick={() => setIsAddOpen(false)}
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="text-secondary">
                                                All available integrations are already connected.
                                            </div>
                                        )}
                                    </div>
                                ) : null}

                                {orderedIntegrations.length > 0 ? (
                                    orderedIntegrations.map((integration) => {
                                        const Icon = integration.definition.icon;
                                        const iconStyle: React.CSSProperties = {
                                            backgroundColor: integration.definition.badgeColor,
                                            color: integration.definition.iconColor ?? '#ffffff'
                                        };

                                        return (
                                            <div key={integration.id} className="crm-integration-item">
                                                <div className="d-flex align-items-center gap-3">
                                                    <span className="crm-integration-icon" style={iconStyle} aria-hidden>
                                                        <Icon size={20} aria-hidden />
                                                    </span>
                                                    <div>
                                                        <div className="fw-semibold">{integration.definition.name}</div>
                                                        <div className="text-secondary small">
                                                            {integration.definition.description}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="crm-integration-actions">
                                                    <span
                                                        className={`badge ${statusBadgeTone[integration.status]} d-block mb-2`}
                                                    >
                                                        {statusLabels[integration.status]}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        className="btn btn-link p-0"
                                                        onClick={() =>
                                                            setActiveIntegrationId((previous) =>
                                                                previous === integration.id ? null : integration.id
                                                            )
                                                        }
                                                        aria-expanded={activeIntegrationId === integration.id}
                                                    >
                                                        Manage
                                                    </button>
                                                    {activeIntegrationId === integration.id ? (
                                                        <div className="crm-integration-manage mt-2">
                                                            <div className="btn-group btn-group-sm" role="group">
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-outline-success"
                                                                    onClick={() => handleStatusChange(integration.id, 'Connected')}
                                                                    disabled={integration.status === 'Connected'}
                                                                >
                                                                    Mark connected
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-outline-primary"
                                                                    onClick={() => handleStatusChange(integration.id, 'Syncing')}
                                                                    disabled={integration.status === 'Syncing'}
                                                                >
                                                                    Mark syncing
                                                                </button>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                className="btn btn-outline-danger btn-sm"
                                                                onClick={() => handleDisconnect(integration.id)}
                                                            >
                                                                Disconnect
                                                            </button>
                                                        </div>
                                                    ) : null}
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="crm-integration-empty text-center text-secondary py-4">
                                        <p className="mb-2">No integrations are connected yet.</p>
                                        <p className="mb-0">Use the add integration button to bring tools into your dashboard.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </WorkspaceLayout>
        </>
    );
}
