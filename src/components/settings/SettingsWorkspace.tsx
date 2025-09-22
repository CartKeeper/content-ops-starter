'use client';

import * as React from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormProvider, useForm } from 'react-hook-form';

import { useNetlifyIdentity } from '../auth';
import { CrmAuthGuard, WorkspaceLayout } from '../crm';
import { useIntegrations, type IntegrationStatus } from '../crm/integration-context';
import { INTEGRATION_CATEGORIES } from '../../data/integrations';
import { FieldGrid } from '../forms/FieldGrid';
import { FieldWrapper } from '../forms/FieldWrapper';
import { FormSectionCard } from '../forms/SectionCard';
import { Select, TextInput, Textarea } from '../forms/inputs';
import { UserManagementPanel } from './UserManagementPanel';
import type { UserProfile } from '../../types/user';
import { SettingsTabs } from './SettingsTabs';
import { SETTINGS_TABS, type SettingsSection } from './settings-sections';

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

type NoticeState = {
    type: 'success' | 'error' | 'info';
    message: string;
};

type EmailConnectionStatus = 'connected' | 'disconnected';

type SettingsWorkspaceProps = {
    activeSection: SettingsSection;
};

const NOTICE_STYLES: Record<NoticeState['type'], string> = {
    success: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
    error: 'border-red-500/40 bg-red-500/10 text-red-200',
    info: 'border-slate-500/40 bg-slate-500/15 text-slate-200'
};

const SECTION_TITLES: Record<SettingsSection, string> = SETTINGS_TABS.reduce(
    (accumulator, tab) => ({ ...accumulator, [tab.id]: tab.label }),
    {} as Record<SettingsSection, string>
);

function isValidUrl(value: string): boolean {
    if (value.length === 0) {
        return true;
    }
    try {
        const parsed = new URL(value);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch (error) {
        return false;
    }
}

function optionalString(max: number, message: string) {
    return z
        .string()
        .trim()
        .max(max, message)
        .optional()
        .transform((value) => value ?? '');
}

function optionalPattern(regex: RegExp, message: string) {
    return z
        .string()
        .trim()
        .optional()
        .transform((value) => value ?? '')
        .refine((value) => value.length === 0 || regex.test(value), message);
}

const profileSchema = z.object({
    name: z
        .string()
        .trim()
        .min(1, 'Studio name is required')
        .max(60, 'Studio name must be 60 characters or fewer'),
    email: z.string().trim().email('Enter a valid email address'),
    roleTitle: optionalString(60, 'Role title must be 60 characters or fewer'),
    phone: optionalPattern(/^[+0-9 ()-]{7,20}$/i, 'Enter a valid phone number'),
    welcomeMessage: optionalString(500, 'Welcome message must be 500 characters or fewer'),
    avatarUrl: z
        .string()
        .trim()
        .optional()
        .transform((value) => value ?? '')
        .refine((value) => isValidUrl(value), 'Enter a valid image URL')
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const PROFILE_DEFAULTS: ProfileFormValues = {
    name: '',
    email: '',
    roleTitle: '',
    phone: '',
    welcomeMessage: DEFAULT_WELCOME_MESSAGE,
    avatarUrl: ''
};

const emailSettingsSchema = z.object({
    provider: z.enum(['custom', 'sendgrid', 'postmark', 'ses']),
    encryption: z.enum(['none', 'ssl', 'tls']),
    fromName: z.string().trim().min(1, 'From name is required'),
    fromEmail: z.string().trim().email('Enter a valid from email'),
    replyTo: z.string().trim().email('Enter a valid reply-to email'),
    host: z.string().trim().min(1, 'SMTP host is required'),
    port: z
        .coerce.number()
        .int('Port must be an integer')
        .min(1, 'Port must be between 1 and 65535')
        .max(65535, 'Port must be between 1 and 65535'),
    username: z.string().trim().min(1, 'SMTP username is required'),
    password: z.string().trim().min(1, 'Password is required')
});

type EmailSettingsFormValues = z.infer<typeof emailSettingsSchema>;

const EMAIL_SETTINGS_DEFAULTS: EmailSettingsFormValues = {
    provider: 'custom',
    encryption: 'tls',
    fromName: 'Aperture Studio',
    fromEmail: 'hello@aperture.studio',
    replyTo: 'team@aperture.studio',
    host: 'smtp.aperture.studio',
    port: 587,
    username: 'hello@aperture.studio',
    password: ''
};

function safeTrim(value: string | null | undefined): string {
    if (typeof value !== 'string') {
        return '';
    }
    return value.trim();
}

function mapProfileToForm(profile: UserProfile): ProfileFormValues {
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

export function SettingsWorkspace({ activeSection }: SettingsWorkspaceProps) {
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
    const profileFormMethods = useForm<ProfileFormValues>({
        resolver: zodResolver(profileSchema),
        defaultValues: PROFILE_DEFAULTS,
        mode: 'onBlur'
    });
    const [profile, setProfile] = React.useState<UserProfile | null>(null);
    const [isLoadingProfile, setIsLoadingProfile] = React.useState(false);
    const [isSavingProfile, setIsSavingProfile] = React.useState(false);
    const [isSendingInvite, setIsSendingInvite] = React.useState(false);
    const [notice, setNotice] = React.useState<NoticeState | null>(null);
    const emailFormMethods = useForm<EmailSettingsFormValues>({
        resolver: zodResolver(emailSettingsSchema),
        defaultValues: EMAIL_SETTINGS_DEFAULTS,
        mode: 'onChange'
    });
    const {
        handleSubmit: submitProfileForm,
        reset: resetProfileForm,
        watch: watchProfile,
        getValues: getProfileValues
    } = profileFormMethods;
    const {
        handleSubmit: submitEmailForm,
        reset: resetEmailForm,
        setValue: setEmailValue,
        formState: emailFormState
    } = emailFormMethods;
    const [emailStatus, setEmailStatus] = React.useState<EmailConnectionStatus>('disconnected');
    const [isSavingEmail, setIsSavingEmail] = React.useState(false);
    const [isTestingEmail, setIsTestingEmail] = React.useState(false);
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
            resetProfileForm(mapProfileToForm(payload.profile));
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
    }, [identity.isAuthenticated, identity.isReady, resetProfileForm]);

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

    const avatarUrlValue = watchProfile('avatarUrl');
    const avatarPreview =
        avatarUrlValue && avatarUrlValue.trim().length > 0 ? avatarUrlValue : AVATAR_PLACEHOLDER;
    const isProfileBusy = isLoadingProfile || isSavingProfile;

    const handleProfileSubmit = React.useMemo(
        () =>
            submitProfileForm(async (formValues) => {
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
                            name: formValues.name,
                            email: formValues.email,
                            roleTitle: formValues.roleTitle,
                            phone: formValues.phone,
                            welcomeMessage: formValues.welcomeMessage,
                            avatarUrl: formValues.avatarUrl
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
                        resetProfileForm(mapProfileToForm(payload.profile));
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
            }),
        [identity, resetProfileForm, submitProfileForm]
    );

    const handleSendInvite = React.useCallback(async () => {
        if (isSendingInvite) {
            return;
        }

        const targetEmail = getProfileValues('email').trim();
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
    }, [getProfileValues, isSendingInvite, profile?.id]);

    const handleEmailSubmit = React.useMemo(
        () =>
            submitEmailForm(async (formValues) => {
                if (isSavingEmail) {
                    return;
                }

                if (isMountedRef.current) {
                    setIsSavingEmail(true);
                    setNotice(null);
                }

                try {
                    await new Promise<void>((resolve) => {
                        globalThis.setTimeout(resolve, 900);
                    });

                    if (isMountedRef.current) {
                        resetEmailForm(formValues);
                        setEmailStatus('connected');
                        setNotice({ type: 'success', message: 'Outgoing email settings saved.' });
                    }
                } catch (error) {
                    if (isMountedRef.current) {
                        setNotice({ type: 'error', message: 'Unable to save outgoing email settings.' });
                    }
                } finally {
                    if (isMountedRef.current) {
                        setIsSavingEmail(false);
                    }
                }
            }),
        [isSavingEmail, resetEmailForm, submitEmailForm]
    );

    const handleTestEmail = React.useMemo(
        () =>
            submitEmailForm(async (formValues) => {
                if (isTestingEmail) {
                    return;
                }
                if (emailStatus !== 'connected') {
                    setNotice({
                        type: 'error',
                        message: 'Save and connect your outgoing email before sending a test message.'
                    });
                    return;
                }

                if (isMountedRef.current) {
                    setIsTestingEmail(true);
                    setNotice(null);
                }

                try {
                    await new Promise<void>((resolve) => {
                        globalThis.setTimeout(resolve, 900);
                    });

                    if (isMountedRef.current) {
                        console.info('Test email queued', { provider: formValues.provider, to: formValues.replyTo });
                        setNotice({ type: 'info', message: 'Test email queued for delivery.' });
                    }
                } catch (error) {
                    if (isMountedRef.current) {
                        setNotice({ type: 'error', message: 'Unable to send test email.' });
                    }
                } finally {
                    if (isMountedRef.current) {
                        setIsTestingEmail(false);
                    }
                }
            }),
        [emailStatus, isTestingEmail, submitEmailForm]
    );

    const handleEmailDisconnect = React.useCallback(() => {
        setEmailStatus('disconnected');
        setEmailValue('password', '', { shouldDirty: true, shouldTouch: true });
        setNotice({ type: 'info', message: 'Outgoing email connection disabled.' });
    }, [setEmailValue]);

    React.useEffect(() => {
        if (emailStatus !== 'connected') {
            return;
        }
        if (!emailFormState.isDirty) {
            return;
        }

        setEmailStatus('disconnected');
    }, [emailFormState.isDirty, emailStatus]);

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
    const canManageUsers =
        identity.user?.role === 'admin' || identity.user?.permissions?.canManageUsers === true;
    const currentUserId = profile?.id ?? identity.user?.id ?? null;

    const statusBadgeTone: Record<IntegrationStatus, string> = {
        Connected: 'bg-emerald-500/20 text-emerald-200',
        Syncing: 'bg-sky-500/20 text-sky-200'
    };

    const statusLabels: Record<IntegrationStatus, string> = {
        Connected: 'Connected',
        Syncing: 'Syncing'
    };

    const renderPlaceholder = (title: string, description: string) => (
        <section className="mt-14 rounded-3xl border border-slate-800 bg-slate-950/60 p-10 shadow-[0_30px_80px_-60px_rgba(15,23,42,0.95)]">
            <p className="text-xs font-semibold uppercase tracking-[0.48em] text-[#4DE5FF]">Coming soon</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">{title}</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">{description}</p>
        </section>
    );

    let sectionContent: React.ReactNode;

    if (activeSection === 'general') {
        const profileEmailValue = watchProfile('email');
        sectionContent = (
            <div className="space-y-8">
                <FormProvider {...profileFormMethods}>
                    <FormSectionCard
                        onSubmit={handleProfileSubmit}
                        eyebrow="Studio profile"
                        title="Workspace identity"
                        subtitle="Update contact details and booking hand-offs for new projects."
                        actions={
                            <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
                                <span className="inline-flex items-center rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-200">
                                    Live
                                </span>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="submit"
                                        className="rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                                        disabled={isProfileBusy}
                                    >
                                        {isSavingProfile ? 'Saving…' : 'Save profile'}
                                    </button>
                                    <button
                                        type="button"
                                        className="rounded-2xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-[#4DE5FF] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                                        onClick={handleSendInvite}
                                        disabled={
                                            isLoadingProfile ||
                                            isSendingInvite ||
                                            profileEmailValue.trim().length === 0
                                        }
                                    >
                                        {isSendingInvite ? 'Sending…' : 'Send preview invite'}
                                    </button>
                                </div>
                            </div>
                        }
                    >
                        {isLoadingProfile && !profile ? (
                            <p className="text-sm text-slate-400">Loading profile…</p>
                        ) : null}
                        {notice ? (
                            <div
                                className={`mt-4 rounded-2xl border px-5 py-4 text-sm ${NOTICE_STYLES[notice.type]}`}
                                role="status"
                            >
                                {notice.message}
                            </div>
                        ) : null}
                        <FieldGrid className="gap-y-6 pt-4">
                            <div className="col-span-12 md:col-span-5 lg:col-span-4">
                                <div className="flex flex-col gap-4 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4 sm:flex-row sm:items-center">
                                    <span
                                        className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900"
                                        style={{
                                            backgroundImage: `url(${avatarPreview})`,
                                            backgroundSize: 'cover',
                                            backgroundPosition: 'center'
                                        }}
                                        aria-hidden
                                    />
                                    <p className="text-xs text-slate-400">
                                        Drop in a hosted image or upload to Supabase Storage. Use a square crop for the cleanest preview across invites.
                                    </p>
                                </div>
                            </div>
                            <FieldWrapper name="avatarUrl" label="Profile photo URL" size="lg" helpText="Use a square image for best results.">
                                <TextInput name="avatarUrl" type="url" placeholder="https://cdn.aperture.studio/avatar.png" />
                            </FieldWrapper>
                            <FieldWrapper name="name" label="Studio name" size="md">
                                <TextInput name="name" placeholder="Aperture Studio" autoComplete="organization" />
                            </FieldWrapper>
                            <FieldWrapper
                                name="roleTitle"
                                label="Role"
                                size="sm"
                                helpText="Shown on onboarding emails and client portal invites."
                            >
                                <TextInput name="roleTitle" placeholder="Producer" autoComplete="organization-title" />
                            </FieldWrapper>
                            <FieldWrapper
                                name="email"
                                label="Email"
                                size="lg"
                                helpText="Booking notifications and client replies are routed here."
                            >
                                <TextInput name="email" type="email" placeholder="hello@aperture.studio" autoComplete="email" />
                            </FieldWrapper>
                            <FieldWrapper
                                name="phone"
                                label="Phone number"
                                size="sm"
                                helpText="Format with a country code to help clients dial internationally."
                            >
                                <TextInput name="phone" type="tel" placeholder="+1 (555) 123-4567" autoComplete="tel" />
                            </FieldWrapper>
                            <FieldWrapper
                                name="welcomeMessage"
                                label="Welcome message"
                                size="xl"
                                helpText="Shared with clients immediately after their booking is confirmed."
                            >
                                <Textarea name="welcomeMessage" rows={5} />
                            </FieldWrapper>
                        </FieldGrid>
                    </FormSectionCard>
                </FormProvider>
                <FormProvider {...emailFormMethods}>
                    <FormSectionCard
                        onSubmit={handleEmailSubmit}
                        eyebrow="Deliverability"
                        title="Outgoing email"
                        subtitle="Connect your sending domain to deliver onboarding emails directly from the CRM."
                        actions={
                            <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
                                <span
                                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                                        emailStatus === 'connected'
                                            ? 'bg-emerald-500/20 text-emerald-200'
                                            : 'bg-slate-800/60 text-slate-300'
                                    }`}
                                >
                                    {emailStatus === 'connected' ? 'Connected' : 'Not connected'}
                                </span>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="submit"
                                        className="rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                                        disabled={isSavingEmail}
                                    >
                                        {isSavingEmail ? 'Saving…' : emailStatus === 'connected' ? 'Update connection' : 'Save connection'}
                                    </button>
                                    <button
                                        type="button"
                                        className="rounded-2xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-[#4DE5FF] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                                        onClick={handleTestEmail}
                                        disabled={isSavingEmail || isTestingEmail || emailStatus !== 'connected'}
                                    >
                                        {isTestingEmail ? 'Sending…' : 'Send test email'}
                                    </button>
                                    <button
                                        type="button"
                                        className="rounded-2xl border border-slate-800 px-4 py-2 text-sm font-semibold text-slate-400 transition hover:border-red-500 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-60"
                                        onClick={handleEmailDisconnect}
                                        disabled={emailStatus === 'disconnected'}
                                    >
                                        Disconnect
                                    </button>
                                </div>
                            </div>
                        }
                    >
                        <FieldGrid className="gap-y-6">
                            <FieldWrapper name="provider" label="Provider" size="sm">
                                <Select
                                    name="provider"
                                    options={[
                                        { label: 'Custom SMTP', value: 'custom' },
                                        { label: 'SendGrid', value: 'sendgrid' },
                                        { label: 'Postmark', value: 'postmark' },
                                        { label: 'Amazon SES', value: 'ses' }
                                    ]}
                                />
                            </FieldWrapper>
                            <FieldWrapper
                                name="encryption"
                                label="Encryption"
                                size="sm"
                                helpText="Choose TLS (587) or SSL (465) based on your provider."
                            >
                                <Select
                                    name="encryption"
                                    options={[
                                        { label: 'TLS', value: 'tls' },
                                        { label: 'SSL', value: 'ssl' },
                                        { label: 'None', value: 'none' }
                                    ]}
                                />
                            </FieldWrapper>
                            <FieldWrapper name="host" label="SMTP host" size="lg">
                                <TextInput name="host" placeholder="smtp.yourdomain.com" autoComplete="off" />
                            </FieldWrapper>
                            <FieldWrapper name="port" label="Port" size="xs">
                                <TextInput name="port" type="number" inputMode="numeric" placeholder="587" min={1} max={65535} />
                            </FieldWrapper>
                            <FieldWrapper name="username" label="Username" size="md">
                                <TextInput name="username" placeholder="apikey or mailbox" autoComplete="username" />
                            </FieldWrapper>
                            <FieldWrapper
                                name="password"
                                label="Password / API key"
                                size="md"
                                helpText="Stored securely in Supabase and never shown after saving."
                            >
                                <TextInput name="password" type="password" placeholder="••••••••" autoComplete="new-password" />
                            </FieldWrapper>
                            <FieldWrapper name="fromName" label="From name" size="md">
                                <TextInput name="fromName" placeholder="Aperture Studio" />
                            </FieldWrapper>
                            <FieldWrapper name="fromEmail" label="From email" size="lg">
                                <TextInput name="fromEmail" type="email" placeholder="noreply@yourdomain.com" autoComplete="email" />
                            </FieldWrapper>
                            <FieldWrapper name="replyTo" label="Reply-to email" size="lg">
                                <TextInput name="replyTo" type="email" placeholder="team@yourdomain.com" autoComplete="email" />
                            </FieldWrapper>
                        </FieldGrid>
                    </FormSectionCard>
                </FormProvider>
            </div>
        );
    } else if (activeSection === 'notifications') {
        sectionContent = (
            <section className="mt-14 rounded-3xl border border-slate-800 bg-slate-950/60 p-10 shadow-[0_30px_80px_-60px_rgba(15,23,42,0.95)]">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.48em] text-[#4DE5FF]">Communications</p>
                        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">Notification preferences</h2>
                        <p className="mt-2 max-w-2xl text-sm text-slate-300">
                            Choose how the studio stays in sync when new activity happens across projects.
                        </p>
                    </div>
                </div>
                <div className="mt-8 space-y-4">
                    {notificationPreferences.map((preference) => (
                        <label
                            key={preference.id}
                            htmlFor={preference.id}
                            className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4 transition hover:border-[#4DE5FF]/60"
                        >
                            <span className="text-sm text-slate-200">
                                <span className="block font-semibold text-white">{preference.label}</span>
                                <span className="mt-1 block text-xs text-slate-400">{preference.description}</span>
                            </span>
                            <input
                                id={preference.id}
                                type="checkbox"
                                defaultChecked={preference.defaultChecked}
                                className="h-5 w-5 shrink-0 rounded border-slate-700 bg-slate-950 text-[#4DE5FF] focus:ring-[#4DE5FF]"
                            />
                        </label>
                    ))}
                </div>
                <div className="mt-8 flex flex-wrap gap-3">
                    <button
                        type="button"
                        className="rounded-xl bg-[#4DE5FF] px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-[#86f0ff]"
                    >
                        Save preferences
                    </button>
                    <button
                        type="button"
                        className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-[#4DE5FF] hover:text-white"
                    >
                        Reset defaults
                    </button>
                </div>
            </section>
        );
    } else if (activeSection === 'integrations') {
        sectionContent = (
            <section className="mt-14 rounded-3xl border border-slate-800 bg-slate-950/60 p-10 shadow-[0_30px_80px_-60px_rgba(15,23,42,0.95)]">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.48em] text-[#4DE5FF]">Connections</p>
                        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">Connected integrations</h2>
                        <p className="mt-2 max-w-3xl text-sm text-slate-300">
                            Bring your favorite tools into the workflow and keep everything in sync.
                        </p>
                    </div>
                    <button
                        type="button"
                        className="self-start rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-[#4DE5FF] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={() => setIsAddOpen((previous) => !previous)}
                        aria-expanded={isAddOpen}
                        disabled={availableOptions.length === 0 && !isAddOpen}
                    >
                        {isAddOpen ? 'Close' : 'Add integration'}
                    </button>
                </div>
                {isAddOpen ? (
                    <div className="mt-6 rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-6">
                        <h3 className="text-sm font-semibold text-slate-200">Connect a new integration</h3>
                        {availableOptions.length > 0 ? (
                            <>
                                <label className="mt-4 block text-xs font-medium text-slate-300" htmlFor="integration-select">
                                    Choose from connected services
                                </label>
                                <select
                                    id="integration-select"
                                    className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-[#4DE5FF] focus:ring-2 focus:ring-[#4DE5FF]/60"
                                    value={selectedIntegrationId}
                                    onChange={(event) => setSelectedIntegrationId(event.target.value)}
                                >
                                    {INTEGRATION_CATEGORIES.map((category) => {
                                        const categoryOptions = availableOptions.filter((option) => option.categoryId === category.id);
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
                                <div className="mt-4 flex flex-wrap gap-3">
                                    <button
                                        type="button"
                                        className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                                        onClick={handleAddIntegration}
                                        disabled={!selectedIntegrationId}
                                    >
                                        Connect integration
                                    </button>
                                    <button
                                        type="button"
                                        className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-[#4DE5FF] hover:text-white"
                                        onClick={() => setIsAddOpen(false)}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </>
                        ) : (
                            <p className="mt-4 text-sm text-slate-400">All available integrations are already connected.</p>
                        )}
                    </div>
                ) : null}
                <div className="mt-8 grid gap-4">
                    {orderedIntegrations.length > 0 ? (
                        orderedIntegrations.map((integration) => {
                            const Icon = integration.definition.icon;
                            return (
                                <div
                                    key={integration.id}
                                    className="flex flex-col gap-4 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 shadow-[0_24px_60px_-45px_rgba(15,23,42,0.95)] md:flex-row md:items-center md:justify-between"
                                >
                                    <div className="flex items-start gap-4">
                                        <span
                                            className="flex h-12 w-12 items-center justify-center rounded-2xl text-base font-semibold text-white"
                                            style={{ backgroundColor: integration.definition.badgeColor, color: integration.definition.iconColor ?? '#ffffff' }}
                                            aria-hidden
                                        >
                                            <Icon size={20} aria-hidden />
                                        </span>
                                        <div>
                                            <p className="text-sm font-semibold text-white">{integration.definition.name}</p>
                                            <p className="mt-1 text-xs text-slate-400">{integration.definition.description}</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-start gap-2 md:items-end">
                                        <span
                                            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeTone[integration.status]}`}
                                        >
                                            {statusLabels[integration.status]}
                                        </span>
                                        <button
                                            type="button"
                                            className="text-sm font-semibold text-[#4DE5FF] transition hover:text-white"
                                            onClick={() =>
                                                setActiveIntegrationId((previous) => (previous === integration.id ? null : integration.id))
                                            }
                                            aria-expanded={activeIntegrationId === integration.id}
                                        >
                                            {activeIntegrationId === integration.id ? 'Hide controls' : 'Manage'}
                                        </button>
                                        {activeIntegrationId === integration.id ? (
                                            <div className="flex flex-col gap-3 rounded-2xl border border-slate-800/80 bg-slate-950/40 p-4 text-sm text-slate-200">
                                                <div className="flex flex-wrap gap-2">
                                                    <button
                                                        type="button"
                                                        className="rounded-xl border border-emerald-400 px-3 py-1 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                                                        onClick={() => handleStatusChange(integration.id, 'Connected')}
                                                        disabled={integration.status === 'Connected'}
                                                    >
                                                        Mark connected
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="rounded-xl border border-sky-400 px-3 py-1 text-xs font-semibold text-sky-200 transition hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                                                        onClick={() => handleStatusChange(integration.id, 'Syncing')}
                                                        disabled={integration.status === 'Syncing'}
                                                    >
                                                        Mark syncing
                                                    </button>
                                                </div>
                                                <button
                                                    type="button"
                                                    className="self-start rounded-xl border border-red-500 px-3 py-1 text-xs font-semibold text-red-200 transition hover:bg-red-500/10"
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
                        <div className="rounded-2xl border border-dashed border-slate-800/80 bg-slate-900/40 p-10 text-center text-sm text-slate-400">
                            <p className="font-semibold text-slate-200">No integrations are connected yet.</p>
                            <p className="mt-2">
                                Use the add integration button to bring tools into your dashboard and keep client data in sync.
                            </p>
                        </div>
                    )}
                </div>
            </section>
        );
    } else if (activeSection === 'team') {
        sectionContent = canManageUsers ? (
            <UserManagementPanel currentUserId={currentUserId} />
        ) : (
            renderPlaceholder(
                'Team access permissions required',
                'Invite an administrator to manage teammates. Your current role does not include user management access.'
            )
        );
    } else if (activeSection === 'billing') {
        sectionContent = renderPlaceholder(
            'Billing overview',
            'Connect Stripe to sync invoices, update payment methods, and manage receipts from one place.'
        );
    } else if (activeSection === 'security') {
        sectionContent = renderPlaceholder(
            'Security controls',
            'Enforce multi-factor authentication, review session history, and manage allowed device policies.'
        );
    } else {
        sectionContent = renderPlaceholder(
            'API access',
            'Generate personal access tokens, manage webhooks, and review integration activity logs.'
        );
    }

    return (
        <div className="min-h-[80vh] bg-slate-950/40">
            <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6 md:px-8">
                <header className="flex flex-col gap-1 pb-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.48em] text-[#4DE5FF]">Workspace</p>
                    <h1 className="text-3xl font-semibold tracking-tight text-white">Settings</h1>
                    <p className="max-w-3xl text-sm text-slate-300">
                        Configure your workspace, manage billing, and connect integrations. You&apos;re viewing the
                        {` ${SECTION_TITLES[activeSection].toLowerCase()} tab.`}
                    </p>
                </header>
                <div className="sticky top-0 z-30 -mx-4 mb-8 border-b border-white/10 bg-slate-950/80 px-4 backdrop-blur md:-mx-8 md:px-8">
                    <SettingsTabs activeSection={activeSection} />
                </div>
                <div className="space-y-10 pb-10">{sectionContent}</div>
            </div>
        </div>
    );
}

export function SettingsPageContainer({ children }: { children: React.ReactNode }) {
    return (
        <CrmAuthGuard>
            <WorkspaceLayout>{children}</WorkspaceLayout>
        </CrmAuthGuard>
    );
}
