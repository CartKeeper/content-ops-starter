import * as React from 'react';
import Head from 'next/head';

import { useNetlifyIdentity } from '../../components/auth';
import { CrmAuthGuard, WorkspaceLayout } from '../../components/crm';
import { useIntegrations, type IntegrationStatus } from '../../components/crm/integration-context';
import { INTEGRATION_CATEGORIES } from '../../data/integrations';
import type { UserProfile } from '../../types/user';

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

const DEFAULT_WELCOME_MESSAGE =
    'We can’t wait to collaborate. Share any mood boards, location inspiration, or must-have shots and we’ll add them to the project brief.';

const AVATAR_PLACEHOLDER = '/images/avatar1.svg';

type ProfileFormState = {
    name: string;
    email: string;
    roleTitle: string;
    phone: string;
    welcomeMessage: string;
    avatarUrl: string;
};

type NoticeState = {
    type: 'success' | 'error' | 'info';
    message: string;
};

const NOTICE_CLASS: Record<NoticeState['type'], string> = {
    success: 'alert-success',
    error: 'alert-danger',
    info: 'alert-secondary'
};

const EMPTY_PROFILE_FORM: ProfileFormState = {
    name: '',
    email: '',
    roleTitle: '',
    phone: '',
    welcomeMessage: DEFAULT_WELCOME_MESSAGE,
    avatarUrl: ''
};

function safeTrim(value: string | null | undefined): string {
    if (typeof value !== 'string') {
        return '';
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : '';
}

function mapProfileToForm(profile: UserProfile): ProfileFormState {
    const welcome = safeTrim(profile.welcomeMessage);
    return {
        name: safeTrim(profile.name),
        email: profile.email.trim(),
        roleTitle: safeTrim(profile.roleTitle),
        phone: safeTrim(profile.phone),
        welcomeMessage: welcome.length > 0 ? welcome : DEFAULT_WELCOME_MESSAGE,
        avatarUrl: safeTrim(profile.avatarUrl)
    };
}

export default function SettingsPage() {
    return (
        <>
            <Head>
                <title>Settings · Aperture Studio CRM</title>
            </Head>
            <CrmAuthGuard>
                <WorkspaceLayout>
                    <SettingsWorkspace />
                </WorkspaceLayout>
            </CrmAuthGuard>
        </>
    );
}

function SettingsWorkspace() {
    const identity = useNetlifyIdentity();
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
    const [profileForm, setProfileForm] = React.useState<ProfileFormState>(EMPTY_PROFILE_FORM);
    const [profile, setProfile] = React.useState<UserProfile | null>(null);
    const [isLoadingProfile, setIsLoadingProfile] = React.useState(false);
    const [isSavingProfile, setIsSavingProfile] = React.useState(false);
    const [isSendingInvite, setIsSendingInvite] = React.useState(false);
    const [notice, setNotice] = React.useState<NoticeState | null>(null);
    const isMountedRef = React.useRef(true);

    React.useEffect(() => {
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const fetchProfile = React.useCallback(async () => {
        if (!identity.isReady || !identity.isAuthenticated) {
            return null;
        }

        if (isMountedRef.current) {
            setIsLoadingProfile(true);
        }

        try {
            const response = await fetch('/api/users/me', { credentials: 'include' });
            const payload = (await response.json().catch(() => null)) as
                | { profile?: UserProfile; error?: string }
                | null;

            if (!response.ok || !payload?.profile) {
                const message = payload?.error ?? 'Unable to load profile.';
                throw new Error(message);
            }

            if (!isMountedRef.current) {
                return payload.profile;
            }

            setProfile(payload.profile);
            setProfileForm(mapProfileToForm(payload.profile));
            setNotice(null);

            return payload.profile;
        } catch (error) {
            if (isMountedRef.current) {
                const message = error instanceof Error ? error.message : 'Unable to load profile.';
                setNotice({ type: 'error', message });
            }
            return null;
        } finally {
            if (isMountedRef.current) {
                setIsLoadingProfile(false);
            }
        }
    }, [identity.isAuthenticated, identity.isReady]);

    React.useEffect(() => {
        if (!identity.isReady || !identity.isAuthenticated) {
            return;
        }

        void fetchProfile();
    }, [identity.isAuthenticated, identity.isReady, fetchProfile]);

    React.useEffect(() => {
        if (!notice || notice.type === 'error') {
            return;
        }
        if (typeof window === 'undefined') {
            return;
        }
        const timer = window.setTimeout(() => setNotice(null), 3600);
        return () => window.clearTimeout(timer);
    }, [notice]);

    const handleFieldChange = React.useCallback(
        (key: keyof ProfileFormState) =>
            (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
                const value = event.target.value;
                setProfileForm((previous) => ({ ...previous, [key]: value }));
            },
        []
    );

    const avatarPreview =
        profileForm.avatarUrl.trim().length > 0 ? profileForm.avatarUrl : AVATAR_PLACEHOLDER;
    const isProfileBusy = isLoadingProfile || isSavingProfile;

    const handleProfileSubmit = React.useCallback(
        async (event: React.FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            if (!identity.isAuthenticated) {
                setNotice({ type: 'error', message: 'You need to be signed in to update your profile.' });
                return;
            }

            if (isMountedRef.current) {
                setIsSavingProfile(true);
                setNotice(null);
            }

            try {
                const response = await fetch('/api/users/me', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: profileForm.name,
                        email: profileForm.email,
                        roleTitle: profileForm.roleTitle,
                        phone: profileForm.phone,
                        welcomeMessage: profileForm.welcomeMessage,
                        avatarUrl: profileForm.avatarUrl
                    })
                });

                const payload = (await response.json().catch(() => null)) as
                    | { profile?: UserProfile; error?: string }
                    | null;

                if (!response.ok || !payload?.profile) {
                    const message = payload?.error ?? 'Unable to update profile.';
                    throw new Error(message);
                }

                if (isMountedRef.current) {
                    setProfile(payload.profile);
                    setProfileForm(mapProfileToForm(payload.profile));
                    setNotice({ type: 'success', message: 'Profile saved.' });
                }

                try {
                    await identity.refresh();
                } catch (refreshError) {
                    console.warn('Failed to refresh identity after profile update', refreshError);
                }
            } catch (error) {
                if (isMountedRef.current) {
                    const message = error instanceof Error ? error.message : 'Unable to update profile.';
                    setNotice({ type: 'error', message });
                }
            } finally {
                if (isMountedRef.current) {
                    setIsSavingProfile(false);
                }
            }
        },
        [identity, profileForm]
    );

    const handleSendInvite = React.useCallback(async () => {
        if (isSendingInvite) {
            return;
        }

        const targetEmail = profileForm.email.trim();
        if (targetEmail.length === 0) {
            setNotice({ type: 'error', message: 'Add an email address before sending a preview invite.' });
            return;
        }

        if (isMountedRef.current) {
            setIsSendingInvite(true);
            setNotice(null);
        }

        try {
            await new Promise<void>((resolve) => {
                globalThis.setTimeout(resolve, 900);
            });

            console.info('Preview invite queued for delivery', {
                email: targetEmail,
                userId: profile?.id ?? 'unknown'
            });

            if (isMountedRef.current) {
                setNotice({ type: 'info', message: 'Preview invite queued for delivery.' });
            }
        } catch (error) {
            if (isMountedRef.current) {
                setNotice({ type: 'error', message: 'Unable to send preview invite.' });
            }
        } finally {
            if (isMountedRef.current) {
                setIsSendingInvite(false);
            }
        }
    }, [isSendingInvite, profile?.id, profileForm.email]);

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
                        {isLoadingProfile && !profile ? (
                            <div className="text-secondary small mb-3">Loading profile…</div>
                        ) : null}
                        {notice ? (
                            <div className={`alert ${NOTICE_CLASS[notice.type]} mb-3`} role="alert">
                                {notice.message}
                            </div>
                        ) : null}
                        <form className="row g-3" onSubmit={handleProfileSubmit}>
                            <div className="col-12">
                                <label className="form-label" htmlFor="studio-name">
                                    Studio name
                                </label>
                                <input
                                    id="studio-name"
                                    type="text"
                                    className="form-control"
                                    defaultValue="Aperture Studio"
                                />
                            </div>
                            <div className="col-12">
                                <label className="form-label" htmlFor="profile-avatar">
                                    Profile photo
                                </label>
                                <div className="d-flex align-items-center gap-3">
                                    <span className="avatar avatar-xl" style={{ backgroundImage: `url(${avatarPreview})` }} />
                                    <div className="flex-grow-1">
                                        <input
                                            id="profile-avatar"
                                            type="url"
                                            className="form-control"
                                            value={profileForm.avatarUrl}
                                            onChange={handleFieldChange('avatarUrl')}
                                            placeholder="https://"
                                            disabled={isProfileBusy}
                                        />
                                        <div className="form-text">Use a square image for best results.</div>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-6">
                                <label className="form-label" htmlFor="profile-name">
                                    Primary contact
                                </label>
                                <input
                                    id="profile-name"
                                    type="text"
                                    className="form-control"
                                    value={profileForm.name}
                                    onChange={handleFieldChange('name')}
                                    disabled={isProfileBusy}
                                />
                            </div>
                            <div className="col-md-6">
                                <label className="form-label" htmlFor="profile-role">
                                    Role
                                </label>
                                <input
                                    id="profile-role"
                                    type="text"
                                    className="form-control"
                                    value={profileForm.roleTitle}
                                    onChange={handleFieldChange('roleTitle')}
                                    disabled={isProfileBusy}
                                />
                            </div>
                            <div className="col-md-6">
                                <label className="form-label" htmlFor="profile-email">
                                    Email
                                </label>
                                <input
                                    id="profile-email"
                                    type="email"
                                    className="form-control"
                                    value={profileForm.email}
                                    onChange={handleFieldChange('email')}
                                    disabled={isProfileBusy}
                                    required
                                />
                            </div>
                            <div className="col-md-6">
                                <label className="form-label" htmlFor="profile-phone">
                                    Phone
                                </label>
                                <input
                                    id="profile-phone"
                                    type="tel"
                                    className="form-control"
                                    value={profileForm.phone}
                                    onChange={handleFieldChange('phone')}
                                    disabled={isProfileBusy}
                                />
                            </div>
                            <div className="col-12">
                                <label className="form-label" htmlFor="profile-welcome">
                                    Client welcome message
                                </label>
                                <textarea
                                    id="profile-welcome"
                                    className="form-control"
                                    rows={3}
                                    value={profileForm.welcomeMessage}
                                    onChange={handleFieldChange('welcomeMessage')}
                                    disabled={isProfileBusy}
                                />
                            </div>
                            <div className="col-12 d-flex flex-wrap gap-2">
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={isProfileBusy || profileForm.email.trim().length === 0}
                                >
                                    {isSavingProfile ? 'Saving…' : 'Save profile'}
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary"
                                    onClick={handleSendInvite}
                                    disabled={
                                        isLoadingProfile ||
                                        isSendingInvite ||
                                        profileForm.email.trim().length === 0
                                    }
                                >
                                    {isSendingInvite ? 'Sending…' : 'Send preview invite'}
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
    );
}
