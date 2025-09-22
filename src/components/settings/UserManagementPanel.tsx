'use client';

import * as React from 'react';

import type { ManagedUserRecord, UserPermissions, UserRole } from '../../types/user';

type UserManagementPanelProps = {
    currentUserId: string | null;
};

type CreationFormState = {
    name: string;
    email: string;
    role: UserRole;
    permissions: UserPermissions;
};

type EditFormState = {
    name: string;
    role: UserRole;
    permissions: UserPermissions;
    status: string;
    active: boolean;
};

const STANDARD_DEFAULT_PERMISSIONS: UserPermissions = {
    canManageUsers: false,
    canEditSettings: false,
    canViewGalleries: true,
    canManageIntegrations: true,
    canManageCalendar: true,
};

const RESTRICTED_DEFAULT_PERMISSIONS: UserPermissions = {
    canManageUsers: false,
    canEditSettings: false,
    canViewGalleries: true,
    canManageIntegrations: false,
    canManageCalendar: true,
};

function createInitialCreationForm(): CreationFormState {
    return {
        name: '',
        email: '',
        role: 'standard',
        permissions: { ...STANDARD_DEFAULT_PERMISSIONS },
    };
}

function formatRole(role: UserRole): string {
    switch (role) {
        case 'admin':
            return 'Administrator';
        case 'restricted':
            return 'Restricted access';
        case 'standard':
        default:
            return 'Team member';
    }
}

function formatDate(value: string | null): string {
    if (!value) {
        return '—';
    }

    try {
        const date = new Date(value);
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        }).format(date);
    } catch {
        return value;
    }
}

function buildEditForm(user: ManagedUserRecord): EditFormState {
    return {
        name: user.name ?? '',
        role: user.role,
        permissions: { ...user.permissions },
        status: user.status ?? '',
        active: !user.deactivatedAt,
    };
}

async function fetchUsers(): Promise<ManagedUserRecord[]> {
    const response = await fetch('/api/users', { credentials: 'include' });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
        const error = payload?.error ?? 'Unable to load users.';
        throw new Error(error);
    }

    return Array.isArray(payload?.users) ? payload.users : [];
}

async function createUser(payload: {
    name: string;
    email: string;
    role: UserRole;
    permissions: UserPermissions;
}): Promise<ManagedUserRecord> {
    const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
    });

    const body = await response.json().catch(() => null);

    if (!response.ok) {
        const message = body?.error ?? 'Unable to create user.';
        throw new Error(message);
    }

    if (!body?.user) {
        throw new Error('User response was malformed.');
    }

    return body.user as ManagedUserRecord;
}

async function updateUser(userId: string, payload: Record<string, unknown>): Promise<ManagedUserRecord> {
    const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
    });

    const body = await response.json().catch(() => null);

    if (!response.ok) {
        const message = body?.error ?? 'Unable to update user.';
        throw new Error(message);
    }

    if (!body?.user) {
        throw new Error('User response was malformed.');
    }

    return body.user as ManagedUserRecord;
}

function sanitizeStatus(value: string): string {
    return value.trim().slice(0, 80);
}

export function UserManagementPanel({ currentUserId }: UserManagementPanelProps) {
    const [users, setUsers] = React.useState<ManagedUserRecord[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [notice, setNotice] = React.useState<string | null>(null);
    const [creation, setCreation] = React.useState<CreationFormState>(() => createInitialCreationForm());
    const [submitting, setSubmitting] = React.useState(false);
    const [selectedUserId, setSelectedUserId] = React.useState<string | null>(null);
    const [editForm, setEditForm] = React.useState<EditFormState | null>(null);
    const [savingEdit, setSavingEdit] = React.useState(false);

    const selectedUser = React.useMemo(
        () => users.find((candidate) => candidate.id === selectedUserId) ?? null,
        [selectedUserId, users],
    );

    React.useEffect(() => {
        let isMounted = true;
        setLoading(true);
        setError(null);

        fetchUsers()
            .then((fetched) => {
                if (!isMounted) {
                    return;
                }
                setUsers(fetched);
                if (fetched.length > 0 && !selectedUserId) {
                    setSelectedUserId(fetched[0].id);
                }
            })
            .catch((loadError) => {
                if (!isMounted) {
                    return;
                }
                const message = loadError instanceof Error ? loadError.message : 'Unable to load users.';
                setError(message);
            })
            .finally(() => {
                if (isMounted) {
                    setLoading(false);
                }
            });

        return () => {
            isMounted = false;
        };
    }, []);

    React.useEffect(() => {
        if (!selectedUser) {
            setEditForm(null);
            return;
        }
        setEditForm(buildEditForm(selectedUser));
    }, [selectedUser]);

    React.useEffect(() => {
        if (!notice) {
            return;
        }

        const timer = window.setTimeout(() => setNotice(null), 4000);
        return () => window.clearTimeout(timer);
    }, [notice]);

    const handleCreationFieldChange = React.useCallback(
        (key: keyof CreationFormState) =>
            (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
                const value = event.target.value;
                setCreation((previous) => {
                    if (key === 'role') {
                        const nextRole = value as UserRole;
                        const nextPermissions =
                            nextRole === 'restricted'
                                ? { ...RESTRICTED_DEFAULT_PERMISSIONS }
                                : nextRole === 'admin'
                                  ? { ...STANDARD_DEFAULT_PERMISSIONS, canManageUsers: true, canEditSettings: true }
                                  : { ...STANDARD_DEFAULT_PERMISSIONS };
                        return { ...previous, role: nextRole, permissions: nextPermissions };
                    }

                    return { ...previous, [key]: value };
                });
            },
        [],
    );

    const handleCreationPermissionToggle = React.useCallback(
        (key: keyof UserPermissions) =>
            (event: React.ChangeEvent<HTMLInputElement>) => {
                const checked = event.target.checked;
                setCreation((previous) => ({
                    ...previous,
                    permissions: { ...previous.permissions, [key]: checked },
                }));
            },
        [],
    );

    const handleCreateSubmit = React.useCallback(
        async (event: React.FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            if (submitting) {
                return;
            }

            if (creation.email.trim().length === 0) {
                setError('Provide an email address for the invitation.');
                return;
            }

            setSubmitting(true);
            setError(null);

            try {
                const user = await createUser({
                    email: creation.email,
                    name: creation.name,
                    role: creation.role,
                    permissions: creation.permissions,
                });
                setUsers((previous) => [user, ...previous]);
                setNotice(`Invitation sent to ${user.email}.`);
                setCreation(createInitialCreationForm());
                if (!selectedUserId) {
                    setSelectedUserId(user.id);
                }
            } catch (createError) {
                const message = createError instanceof Error ? createError.message : 'Unable to create user.';
                setError(message);
            } finally {
                setSubmitting(false);
            }
        },
        [creation, selectedUserId, submitting],
    );

    const handleEditFieldChange = React.useCallback(
        (field: keyof EditFormState) =>
            (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
                const value = event.target.value;
                setEditForm((previous) => {
                    if (!previous) {
                        return previous;
                    }

                    if (field === 'role') {
                        const nextRole = value as UserRole;
                        const nextPermissions =
                            nextRole === 'restricted'
                                ? { ...RESTRICTED_DEFAULT_PERMISSIONS }
                                : nextRole === 'admin'
                                  ? {
                                        canManageUsers: true,
                                        canEditSettings: true,
                                        canViewGalleries: true,
                                        canManageIntegrations: true,
                                        canManageCalendar: true,
                                    }
                                  : {
                                        ...STANDARD_DEFAULT_PERMISSIONS,
                                        canViewGalleries: previous.permissions.canViewGalleries,
                                        canManageIntegrations: previous.permissions.canManageIntegrations,
                                        canManageCalendar: previous.permissions.canManageCalendar,
                                    };
                        return { ...previous, role: nextRole, permissions: nextPermissions };
                    }

                    if (field === 'status') {
                        return { ...previous, status: sanitizeStatus(value) };
                    }

                    return { ...previous, [field]: value } as EditFormState;
                });
            },
        [],
    );

    const handleEditPermissionToggle = React.useCallback(
        (key: keyof UserPermissions) =>
            (event: React.ChangeEvent<HTMLInputElement>) => {
                const checked = event.target.checked;
                setEditForm((previous) => {
                    if (!previous) {
                        return previous;
                    }
                    return {
                        ...previous,
                        permissions: { ...previous.permissions, [key]: checked },
                    };
                });
            },
        [],
    );

    const handleEditActiveToggle = React.useCallback(() => {
        setEditForm((previous) => {
            if (!previous) {
                return previous;
            }
            return { ...previous, active: !previous.active };
        });
    }, []);

    const handleEditSubmit = React.useCallback(
        async (event: React.FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            if (!selectedUser || !editForm || savingEdit) {
                return;
            }

            const payload: Record<string, unknown> = {};

            if ((editForm.name ?? '').trim() !== (selectedUser.name ?? '')) {
                payload.name = editForm.name.trim();
            }

            if (editForm.role !== selectedUser.role) {
                payload.role = editForm.role;
            }

            if (JSON.stringify(editForm.permissions) !== JSON.stringify(selectedUser.permissions)) {
                payload.permissions = editForm.permissions;
            }

            if (editForm.status !== (selectedUser.status ?? '')) {
                payload.status = editForm.status;
            }

            const currentlyActive = !selectedUser.deactivatedAt;
            if (editForm.active !== currentlyActive) {
                payload.active = editForm.active;
            }

            if (Object.keys(payload).length === 0) {
                setNotice('No changes to save.');
                return;
            }

            setSavingEdit(true);
            setError(null);

            try {
                const updated = await updateUser(selectedUser.id, payload);
                setUsers((previous) =>
                    previous.map((entry) => (entry.id === updated.id ? updated : entry)),
                );
                setNotice('User updated.');
                setEditForm(buildEditForm(updated));
            } catch (updateError) {
                const message = updateError instanceof Error ? updateError.message : 'Unable to update user.';
                setError(message);
            } finally {
                setSavingEdit(false);
            }
        },
        [editForm, savingEdit, selectedUser],
    );

    return (
        <section className="mt-14 rounded-3xl border border-slate-800 bg-slate-950/60 p-10">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.48em] text-[#4DE5FF]">Team access</p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">User management</h2>
                    <p className="mt-2 max-w-3xl text-sm text-slate-300">
                        Invite teammates, assign the right level of access, and deactivate accounts when someone leaves the
                        studio. Permissions apply to both the dashboard and connected integrations.
                    </p>
                </div>
            </div>

            {error ? (
                <div className="mt-6 rounded-2xl border border-red-500/40 bg-red-500/10 px-5 py-4 text-sm text-red-200">
                    {error}
                </div>
            ) : null}

            {notice ? (
                <div className="mt-6 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-200">
                    {notice}
                </div>
            ) : null}

            <div className="mt-8 flex flex-col gap-10 xl:flex-row xl:items-start xl:justify-between">
                <div className="xl:flex-1 xl:min-w-[300px]">
                    <h3 className="text-sm font-semibold text-slate-200">Invite a new teammate</h3>
                    <p className="mt-2 text-xs text-slate-400">
                        They will receive a temporary password and verification link to finish setup.
                    </p>
                    <form className="mt-4 space-y-4" onSubmit={handleCreateSubmit}>
                        <div>
                            <label className="block text-xs font-medium text-slate-300" htmlFor="new-user-name">
                                Name
                            </label>
                            <input
                                id="new-user-name"
                                type="text"
                                value={creation.name}
                                onChange={handleCreationFieldChange('name')}
                                className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-[#4DE5FF] focus:ring-2 focus:ring-[#4DE5FF]/60"
                                placeholder="Avery Logan"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-300" htmlFor="new-user-email">
                                Email
                            </label>
                            <input
                                id="new-user-email"
                                type="email"
                                required
                                value={creation.email}
                                onChange={handleCreationFieldChange('email')}
                                className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-[#4DE5FF] focus:ring-2 focus:ring-[#4DE5FF]/60"
                                placeholder="teammate@studio.com"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-300" htmlFor="new-user-role">
                                Role
                            </label>
                            <select
                                id="new-user-role"
                                value={creation.role}
                                onChange={handleCreationFieldChange('role')}
                                className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-[#4DE5FF] focus:ring-2 focus:ring-[#4DE5FF]/60"
                            >
                                <option value="standard">Standard — calendars, contacts, integrations</option>
                                <option value="admin">Full admin — all settings and team management</option>
                                <option value="restricted">Restricted — limited access</option>
                            </select>
                        </div>
                        <fieldset className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4">
                            <legend className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                                Permissions
                            </legend>
                            <PermissionToggle
                                id="create-can-manage-users"
                                label="Manage users"
                                description="Allow this teammate to invite, edit, or deactivate other accounts."
                                checked={creation.permissions.canManageUsers}
                                onChange={handleCreationPermissionToggle('canManageUsers')}
                                disabled={creation.role === 'admin'}
                            />
                            <PermissionToggle
                                id="create-can-edit-settings"
                                label="Edit workspace settings"
                                description="Access branding, billing, and integration settings."
                                checked={creation.permissions.canEditSettings}
                                onChange={handleCreationPermissionToggle('canEditSettings')}
                                disabled={creation.role === 'admin'}
                            />
                            <PermissionToggle
                                id="create-can-view-galleries"
                                label="View galleries"
                                description="Give access to client galleries and delivery history."
                                checked={creation.permissions.canViewGalleries}
                                onChange={handleCreationPermissionToggle('canViewGalleries')}
                            />
                            <PermissionToggle
                                id="create-can-manage-integrations"
                                label="Manage integrations"
                                description="Connect and disconnect integrations like Dropbox."
                                checked={creation.permissions.canManageIntegrations}
                                onChange={handleCreationPermissionToggle('canManageIntegrations')}
                                disabled={creation.role === 'restricted'}
                            />
                            <PermissionToggle
                                id="create-can-manage-calendar"
                                label="Manage shared calendar"
                                description="Create and edit calendar events across the studio."
                                checked={creation.permissions.canManageCalendar}
                                onChange={handleCreationPermissionToggle('canManageCalendar')}
                            />
                        </fieldset>
                        <button
                            type="submit"
                            className="w-full rounded-xl bg-[#4DE5FF] px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-[#86f0ff]"
                            disabled={submitting}
                        >
                            {submitting ? 'Sending invite…' : 'Send invite'}
                        </button>
                    </form>
                </div>
                <div className="xl:flex-[1.3] xl:min-w-[320px]">
                    <h3 className="text-sm font-semibold text-slate-200">Team roster</h3>
                    {loading ? (
                        <p className="mt-4 text-sm text-slate-400">Loading users…</p>
                    ) : users.length === 0 ? (
                        <p className="mt-4 text-sm text-slate-400">No teammates yet. Send your first invitation.</p>
                    ) : (
                        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-800/80">
                            <table className="min-w-full divide-y divide-slate-800/80">
                                <thead className="bg-slate-900/80 text-xs uppercase tracking-wide text-slate-400">
                                    <tr>
                                        <th className="px-4 py-3 text-left">User</th>
                                        <th className="px-4 py-3 text-left">Role</th>
                                        <th className="px-4 py-3 text-left">Status</th>
                                        <th className="px-4 py-3 text-left">Verified</th>
                                        <th className="px-4 py-3 text-left">Last login</th>
                                        <th className="px-4 py-3 text-left">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/80 text-sm text-slate-200">
                                    {users.map((user) => {
                                        const isCurrent = currentUserId === user.id;
                                        const isSelected = selectedUserId === user.id;
                                        return (
                                            <tr key={user.id} className={isSelected ? 'bg-slate-900/70' : undefined}>
                                                <td className="px-4 py-3">
                                                    <div className="font-semibold text-white">
                                                        {user.name ?? user.email}
                                                        {isCurrent ? (
                                                            <span className="ml-2 rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-300">
                                                                You
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                    <div className="text-xs text-slate-400">{user.email}</div>
                                                </td>
                                                <td className="px-4 py-3">{formatRole(user.role)}</td>
                                                <td className="px-4 py-3">{user.status ?? '—'}</td>
                                                <td className="px-4 py-3">{user.emailVerified ? 'Yes' : 'Pending'}</td>
                                                <td className="px-4 py-3">{formatDate(user.lastLoginAt)}</td>
                                                <td className="px-4 py-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedUserId(user.id)}
                                                        className="rounded-lg border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-200 hover:border-[#4DE5FF] hover:text-[#4DE5FF]"
                                                    >
                                                        Manage
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                </div>

                <div className="xl:flex-1 xl:min-w-[300px]">
                    <h3 className="text-sm font-semibold text-slate-200">Manage teammate</h3>
                    {selectedUser && editForm ? (
                        <form className="mt-4 space-y-4 rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6" onSubmit={handleEditSubmit}>
                            <h4 className="text-sm font-semibold text-slate-200">Manage {selectedUser.name ?? selectedUser.email}</h4>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <label className="block text-xs font-medium text-slate-300" htmlFor="edit-name">
                                        Name
                                    </label>
                                    <input
                                        id="edit-name"
                                        type="text"
                                        value={editForm.name}
                                        onChange={handleEditFieldChange('name')}
                                        className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-[#4DE5FF] focus:ring-2 focus:ring-[#4DE5FF]/60"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-300" htmlFor="edit-role">
                                        Role
                                    </label>
                                    <select
                                        id="edit-role"
                                        value={editForm.role}
                                        onChange={handleEditFieldChange('role')}
                                        className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-[#4DE5FF] focus:ring-2 focus:ring-[#4DE5FF]/60"
                                        disabled={currentUserId === selectedUser.id}
                                    >
                                        <option value="standard">Standard — calendars, contacts, integrations</option>
                                        <option value="admin">Full admin — all settings and team management</option>
                                        <option value="restricted">Restricted — limited access</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-300" htmlFor="edit-status">
                                    Status label
                                </label>
                                <input
                                    id="edit-status"
                                    type="text"
                                    value={editForm.status}
                                    onChange={handleEditFieldChange('status')}
                                    className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-[#4DE5FF] focus:ring-2 focus:ring-[#4DE5FF]/60"
                                    placeholder="Active, Onboarding, External"
                                />
                            </div>
                            <fieldset className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
                                <legend className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                                    Permissions
                                </legend>
                                <PermissionToggle
                                    id="edit-can-manage-users"
                                    label="Manage users"
                                    description="Allow this teammate to invite, edit, or deactivate other accounts."
                                    checked={editForm.permissions.canManageUsers}
                                    onChange={handleEditPermissionToggle('canManageUsers')}
                                    disabled={editForm.role === 'admin' || currentUserId === selectedUser.id}
                                />
                                <PermissionToggle
                                    id="edit-can-edit-settings"
                                    label="Edit workspace settings"
                                    description="Access branding, billing, and integration settings."
                                    checked={editForm.permissions.canEditSettings}
                                    onChange={handleEditPermissionToggle('canEditSettings')}
                                    disabled={editForm.role === 'admin'}
                                />
                                <PermissionToggle
                                    id="edit-can-view-galleries"
                                    label="View galleries"
                                    description="Give access to client galleries and delivery history."
                                    checked={editForm.permissions.canViewGalleries}
                                    onChange={handleEditPermissionToggle('canViewGalleries')}
                                />
                                <PermissionToggle
                                    id="edit-can-manage-integrations"
                                    label="Manage integrations"
                                    description="Connect and disconnect integrations like Dropbox."
                                    checked={editForm.permissions.canManageIntegrations}
                                    onChange={handleEditPermissionToggle('canManageIntegrations')}
                                    disabled={editForm.role === 'restricted'}
                                />
                                <PermissionToggle
                                    id="edit-can-manage-calendar"
                                    label="Manage shared calendar"
                                    description="Create and edit calendar events across the studio."
                                    checked={editForm.permissions.canManageCalendar}
                                    onChange={handleEditPermissionToggle('canManageCalendar')}
                                />
                            </fieldset>
                            <div className="flex items-center justify-between">
                                <label className="flex items-center gap-3 text-sm text-slate-200">
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-[#4DE5FF] focus:ring-[#4DE5FF]"
                                        checked={editForm.active}
                                        onChange={handleEditActiveToggle}
                                        disabled={currentUserId === selectedUser.id}
                                    />
                                    <span>{editForm.active ? 'Account active' : 'Account deactivated'}</span>
                                </label>
                                <button
                                    type="submit"
                                    className="rounded-xl bg-[#4DE5FF] px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-[#86f0ff]"
                                    disabled={savingEdit}
                                >
                                    {savingEdit ? 'Saving…' : 'Save changes'}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="mt-4 rounded-2xl border border-dashed border-slate-800/80 bg-slate-950/40 p-6 text-sm text-slate-400">
                            Select a teammate from the roster to manage their settings.
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}

type PermissionToggleProps = {
    id: string;
    label: string;
    description: string;
    checked: boolean;
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    disabled?: boolean;
};

function PermissionToggle({ id, label, description, checked, onChange, disabled }: PermissionToggleProps) {
    return (
        <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
            <input
                id={id}
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-slate-700 bg-slate-950 text-[#4DE5FF] focus:ring-[#4DE5FF]"
                checked={checked}
                onChange={onChange}
                disabled={disabled}
            />
            <span className="text-xs text-slate-300">
                <span className="block font-semibold text-slate-100">{label}</span>
                <span className="text-slate-400">{description}</span>
            </span>
        </label>
    );
}
