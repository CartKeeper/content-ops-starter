import * as React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import * as Dialog from '@radix-ui/react-dialog';
import classNames from 'classnames';
import dayjs from 'dayjs';

import { CrmAuthGuard, WorkspaceLayout, ContactsTable, ContactModal, DashboardCard } from '../../components/crm';
import { useNetlifyIdentity } from '../../components/auth';
import type { ContactRecord, ConvertContactResponse } from '../../types/contact';
import { getContactName } from '../../types/contact';
import { useAutoDismiss } from '../../utils/use-auto-dismiss';

type FeedbackNotice = {
    id: string;
    tone: 'success' | 'error';
    message: string;
};

type ContactFormState = {
    owner_user_id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    notes: string;
    address: string;
    city: string;
    state: string;
    business: string;
    status: 'lead' | 'active' | 'client';
};

type ContactsApiResponse = {
    data?: ContactRecord | ContactRecord[];
    error?: string;
};

type ConvertApiResponse = {
    data?: ConvertContactResponse;
    error?: string;
};

type ContactFilter = 'all' | 'withEmail' | 'withNotes';

const INITIAL_FORM: ContactFormState = {
    owner_user_id: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    notes: '',
    address: '',
    city: '',
    state: '',
    business: '',
    status: 'lead'
};

const inputClassName =
    'w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:border-indigo-300';

const FILTER_OPTIONS: Array<{ id: ContactFilter; label: string }> = [
    { id: 'all', label: 'All leads' },
    { id: 'withEmail', label: 'Email captured' },
    { id: 'withNotes', label: 'With notes' }
];

export default function ContactsPage() {
    return (
        <CrmAuthGuard title="Secure contacts" description="Sign in with the studio access code to add and convert contacts.">
            <WorkspaceLayout>
                <Head>
                    <title>Contacts | Codex CRM</title>
                </Head>
                <ContactsWorkspace />
            </WorkspaceLayout>
        </CrmAuthGuard>
    );
}

function ContactsWorkspace() {
    const identity = useNetlifyIdentity();
    const [contacts, setContacts] = React.useState<ContactRecord[]>([]);
    const [isLoading, setIsLoading] = React.useState<boolean>(true);
    const [isRefreshing, setIsRefreshing] = React.useState<boolean>(false);
    const [feedback, setFeedback] = React.useState<FeedbackNotice | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = React.useState<boolean>(false);
    const [isSubmittingContact, setIsSubmittingContact] = React.useState<boolean>(false);
    const [formState, setFormState] = React.useState<ContactFormState>(() => ({
        ...INITIAL_FORM,
        owner_user_id: identity.user?.id ?? ''
    }));
    const [editingContactId, setEditingContactId] = React.useState<string | null>(null);
    const [conversionTarget, setConversionTarget] = React.useState<string | null>(null);
    const [conversionResult, setConversionResult] = React.useState<
        { contact: ContactRecord; result: ConvertContactResponse } | null
    >(null);
    const [searchTerm, setSearchTerm] = React.useState<string>('');
    const [activeFilter, setActiveFilter] = React.useState<ContactFilter>('all');
    const [isContactModalOpen, setIsContactModalOpen] = React.useState<boolean>(false);
    const [selectedContactId, setSelectedContactId] = React.useState<string | null>(null);

    useAutoDismiss(feedback, () => setFeedback(null));

    const notify = React.useCallback((tone: FeedbackNotice['tone'], message: string) => {
        setFeedback({ id: `${Date.now()}`, tone, message });
    }, []);

    const loadContacts = React.useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/contacts');
            const payload = (await response.json()) as ContactsApiResponse;

            if (!response.ok) {
                throw new Error(payload.error ?? 'Unable to load contacts');
            }

            const records = Array.isArray(payload.data) ? payload.data : [];
            setContacts(
                records.map((contact) => ({
                    ...contact,
                    status: contact.status ?? 'lead'
                }))
            );
        } catch (error) {
            console.error('Failed to load contacts', error);
            notify('error', error instanceof Error ? error.message : 'Unable to load contacts');
        } finally {
            setIsLoading(false);
        }
    }, [notify]);

    React.useEffect(() => {
        void loadContacts();
    }, [loadContacts]);

    const handleFormChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = event.target;
        setFormState((previous) => ({ ...previous, [name]: value }));
    }, []);

    const resetForm = React.useCallback(() => {
        setFormState({ ...INITIAL_FORM, owner_user_id: identity.user?.id ?? '' });
        setEditingContactId(null);
    }, [identity.user?.id]);

    const handleSubmitContact = React.useCallback(
        async (event: React.FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            setIsSubmittingContact(true);

            try {
                const nowIso = new Date().toISOString();
                const payload = {
                    owner_user_id: formState.owner_user_id?.trim() || null,
                    first_name: formState.first_name.trim() || null,
                    last_name: formState.last_name.trim() || null,
                    email: formState.email.trim() || null,
                    phone: formState.phone.trim() || null,
                    notes: formState.notes.trim() || null,
                    address: formState.address.trim() || null,
                    city: formState.city.trim() || null,
                    state: formState.state.trim() || null,
                    business: formState.business.trim() || null,
                    status: formState.status,
                    updated_at: nowIso,
                    ...(editingContactId ? {} : { created_at: nowIso })
                };

                const endpoint = editingContactId ? `/api/contacts/${editingContactId}` : '/api/contacts';
                const method = editingContactId ? 'PUT' : 'POST';

                const response = await fetch(endpoint, {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const result = (await response.json()) as ContactsApiResponse;

                if (!response.ok) {
                    throw new Error(result.error ?? (editingContactId ? 'Unable to update contact' : 'Unable to create contact'));
                }

                notify('success', editingContactId ? 'Contact updated' : 'Contact added to CRM');
                setIsAddModalOpen(false);
                resetForm();
                setIsRefreshing(true);
                await loadContacts();
            } catch (error) {
                console.error('Failed to submit contact', error);
                notify(
                    'error',
                    error instanceof Error
                        ? error.message
                        : editingContactId
                          ? 'Unable to update contact'
                          : 'Unable to create contact'
                );
            } finally {
                setIsSubmittingContact(false);
                setIsRefreshing(false);
            }
        },
        [editingContactId, formState, loadContacts, notify, resetForm]
    );

    const handleConvert = React.useCallback(
        async (contact: ContactRecord) => {
            setConversionTarget(contact.id);
            try {
                const response = await fetch(`/api/contacts/${contact.id}/convert`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });

                const payload = (await response.json()) as ConvertApiResponse;

                if (!response.ok || !payload.data) {
                    throw new Error(payload.error ?? 'Unable to convert contact');
                }

                setConversionResult({ contact, result: payload.data });
                notify('success', `${getContactName(contact)} is now a client`);
                setIsRefreshing(true);
                await loadContacts();
                setIsContactModalOpen(false);
                setSelectedContactId(null);
            } catch (error) {
                console.error('Failed to convert contact', error);
                notify('error', error instanceof Error ? error.message : 'Unable to convert contact');
            } finally {
                setConversionTarget(null);
                setIsRefreshing(false);
            }
        },
        [loadContacts, notify]
    );

    const handleViewContact = React.useCallback((contactId: string) => {
        setSelectedContactId(contactId);
        setIsContactModalOpen(true);
    }, []);

    const handleCloseContactModal = React.useCallback(() => {
        setIsContactModalOpen(false);
        setSelectedContactId(null);
    }, []);

    const handleEditContact = React.useCallback(
        (contact: ContactRecord) => {
            setFormState({
                owner_user_id: contact.owner_user_id ?? identity.user?.id ?? '',
                first_name: contact.first_name ?? '',
                last_name: contact.last_name ?? '',
                email: contact.email ?? '',
                phone: contact.phone ?? '',
                notes: contact.notes ?? '',
                address: contact.address ?? '',
                city: contact.city ?? '',
                state: contact.state ?? '',
                business: contact.business ?? '',
                status: contact.status ?? 'lead'
            });
            setEditingContactId(contact.id);
            setIsAddModalOpen(true);
            setIsContactModalOpen(false);
            setSelectedContactId(null);
        },
        [identity.user?.id]
    );

    const handleDeleteContact = React.useCallback(
        async (contact: ContactRecord) => {
            setIsRefreshing(true);
            try {
                const response = await fetch(`/api/contacts/${contact.id}`, {
                    method: 'DELETE'
                });

                const payload = (await response.json()) as ContactsApiResponse;

                if (!response.ok) {
                    throw new Error(payload.error ?? 'Unable to delete contact');
                }

                notify('success', 'Contact deleted');
                handleCloseContactModal();
                await loadContacts();
            } catch (error) {
                console.error('Failed to delete contact', error);
                notify('error', error instanceof Error ? error.message : 'Unable to delete contact');
            } finally {
                setIsRefreshing(false);
            }
        },
        [handleCloseContactModal, loadContacts, notify]
    );

    const handleFormModalToggle = React.useCallback(
        (open: boolean) => {
            setIsAddModalOpen(open);
            if (!open) {
                resetForm();
            }
        },
        [resetForm]
    );

    const analytics = React.useMemo(() => {
        if (contacts.length === 0) {
            return {
                total: 0,
                withEmail: 0,
                withPhone: 0,
                withNotes: 0,
                newThisMonth: 0,
                staleCount: 0,
                cityCount: 0,
                topCity: null as string | null,
                latestActivity: null as string | null
            };
        }

        const now = dayjs();
        const cityCounts = new Map<string, number>();
        let withEmail = 0;
        let withPhone = 0;
        let withNotes = 0;
        let newThisMonth = 0;
        let staleCount = 0;
        let latestActivity: string | null = null;

        contacts.forEach((contact) => {
            if (contact.email && contact.email.trim()) {
                withEmail += 1;
            }
            if (contact.phone && contact.phone.trim()) {
                withPhone += 1;
            }
            if (contact.notes && contact.notes.trim()) {
                withNotes += 1;
            }
            if (contact.created_at && dayjs(contact.created_at).isSame(now, 'month')) {
                newThisMonth += 1;
            }

            const updatedSource = contact.updated_at ?? contact.created_at;
            if (updatedSource) {
                const updatedAt = dayjs(updatedSource);
                if (!latestActivity || updatedAt.isAfter(dayjs(latestActivity))) {
                    latestActivity = updatedAt.toISOString();
                }
                if (updatedAt.isBefore(now.subtract(21, 'day'))) {
                    staleCount += 1;
                }
            }

            const location = [contact.city, contact.state].filter(Boolean).join(', ');
            if (location) {
                cityCounts.set(location, (cityCounts.get(location) ?? 0) + 1);
            }
        });

        const [topCity] = Array.from(cityCounts.entries()).sort((a, b) => b[1] - a[1])[0] ?? [null];

        return {
            total: contacts.length,
            withEmail,
            withPhone,
            withNotes,
            newThisMonth,
            staleCount,
            cityCount: cityCounts.size,
            topCity,
            latestActivity
        };
    }, [contacts]);

    const filteredContacts = React.useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase();

        const sorted = [...contacts].sort((a, b) => {
            const getTime = (value?: string | null) => {
                if (!value) {
                    return 0;
                }
                const timestamp = dayjs(value);
                return timestamp.isValid() ? timestamp.valueOf() : 0;
            };

            return getTime(b.updated_at ?? b.created_at) - getTime(a.updated_at ?? a.created_at);
        });

        const filteredByStage = sorted.filter((contact) => {
            if (activeFilter === 'withEmail') {
                return Boolean(contact.email && contact.email.trim());
            }

            if (activeFilter === 'withNotes') {
                return Boolean(contact.notes && contact.notes.trim());
            }

            return true;
        });

        if (!normalizedSearch) {
            return filteredByStage;
        }

        return filteredByStage.filter((contact) => {
            const haystack = [
                contact.first_name,
                contact.last_name,
                contact.business,
                contact.email,
                contact.phone,
                contact.city,
                contact.state,
                contact.notes
            ]
                .filter((value): value is string => Boolean(value))
                .map((value) => value.toLowerCase());

            return haystack.some((value) => value.includes(normalizedSearch));
        });
    }, [contacts, activeFilter, searchTerm]);

    const hasContacts = contacts.length > 0;
    const visibleContacts = hasContacts ? filteredContacts : [];
    const isEditingContact = Boolean(editingContactId);

    const handleResetFilters = React.useCallback(() => {
        setActiveFilter('all');
        setSearchTerm('');
    }, []);

    return (
        <div className="px-4 pb-16 pt-8 sm:px-6 lg:px-10">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.4em] text-indigo-500 dark:text-indigo-300">
                        Studio network
                    </p>
                    <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">Contacts</h1>
                    <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
                        Keep every lead organised. Add contacts as they come in, then upgrade them to clients when projects become real.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => void loadContacts()}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus-visible:ring-offset-slate-950"
                        disabled={isRefreshing}
                    >
                        {isRefreshing ? 'Refreshing…' : 'Refresh'}
                    </button>
                    <Dialog.Root open={isAddModalOpen} onOpenChange={handleFormModalToggle}>
                        <Dialog.Trigger asChild>
                            <button
                                type="button"
                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-transparent bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:focus-visible:ring-offset-slate-950"
                            >
                                Add contact
                            </button>
                        </Dialog.Trigger>
                        <AddContactModal
                            onSubmit={handleSubmitContact}
                            onChange={handleFormChange}
                            isSubmitting={isSubmittingContact}
                            formState={formState}
                            isEditing={isEditingContact}
                        />
                    </Dialog.Root>
                </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <DashboardCard
                    title="Active contacts"
                    value={`${analytics.total}`}
                    trend={{
                        value:
                            analytics.newThisMonth > 0
                                ? `${analytics.newThisMonth} added this month`
                                : 'Log your next lead',
                        label: 'Studio pipeline',
                        isPositive: analytics.newThisMonth > 0
                    }}
                >
                    <p className="mb-0 text-sm">
                        {analytics.staleCount > 0
                            ? `${analytics.staleCount} contacts need a follow-up touch.`
                            : 'Every lead has been touched recently.'}
                    </p>
                </DashboardCard>
                <DashboardCard
                    title="Reachable audience"
                    value={
                        analytics.total > 0
                            ? `${analytics.withEmail}/${analytics.total} emails`
                            : '0 emails'
                    }
                    trend={{
                        value: `${analytics.withPhone} phone numbers`,
                        label: 'Contact coverage',
                        isPositive: analytics.withEmail >= Math.ceil(analytics.total / 2)
                    }}
                >
                    <p className="mb-0 text-sm">
                        {analytics.withEmail === analytics.total
                            ? 'Every lead can be emailed instantly.'
                            : `${analytics.total - analytics.withEmail} contacts still need an email captured.`}
                    </p>
                </DashboardCard>
                <DashboardCard
                    title="Context captured"
                    value={`${analytics.withNotes}`}
                    trend={{
                        value: `${Math.round(
                            (analytics.total === 0 ? 0 : (analytics.withNotes / analytics.total) * 100)
                        )}% enriched`,
                        label: 'Discovery notes',
                        isPositive: analytics.withNotes >= Math.ceil(Math.max(analytics.total, 1) * 0.5)
                    }}
                >
                    <p className="mb-0 text-sm">
                        {analytics.withNotes > 0
                            ? 'Detailed notes keep handoffs smooth when projects become real.'
                            : 'Add quick notes after intro calls to boost conversions.'}
                    </p>
                </DashboardCard>
                <DashboardCard
                    title="Regional reach"
                    value={analytics.cityCount > 0 ? `${analytics.cityCount} cities` : '—'}
                    trend={{
                        value: analytics.topCity ? `Hotspot: ${analytics.topCity}` : 'Capture locations on intake',
                        label: 'Lead geography',
                        isPositive: Boolean(analytics.topCity)
                    }}
                >
                    <p className="mb-0 text-sm">
                        {analytics.latestActivity
                            ? `Last update ${dayjs(analytics.latestActivity).format('MMM D, YYYY')}.`
                            : 'No activity recorded yet.'}
                    </p>
                </DashboardCard>
            </div>

            <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <label htmlFor="contact-search" className="sr-only">
                        Search contacts
                    </label>
                    <input
                        id="contact-search"
                        type="search"
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        placeholder="Search by name, company, or notes"
                        className={`${inputClassName} w-full max-w-xs`}
                    />
                </div>
                <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
                    <div className="inline-flex rounded-full bg-slate-100 p-1 dark:bg-slate-800/60">
                        {FILTER_OPTIONS.map((option) => (
                            <button
                                key={option.id}
                                type="button"
                                onClick={() => setActiveFilter(option.id)}
                                className={classNames(
                                    'rounded-full px-3 py-1.5 text-xs font-semibold transition',
                                    activeFilter === option.id
                                        ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white'
                                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                                )}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">
                        {hasContacts
                            ? `Showing ${visibleContacts.length} of ${contacts.length}`
                            : 'No contacts yet'}
                    </span>
                </div>
            </div>

            {feedback ? (
                <div
                    className={`mt-6 rounded-3xl border px-4 py-3 text-sm font-medium shadow-sm ${
                        feedback.tone === 'success'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300'
                            : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300'
                    }`}
                >
                    {feedback.message}
                </div>
            ) : null}

            <section className="mt-10">
                {isLoading ? (
                    <div className="flex h-48 items-center justify-center rounded-3xl border border-dashed border-slate-300 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                        Loading contacts…
                    </div>
                ) : !hasContacts ? (
                    <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-slate-300 p-12 text-center text-slate-500 dark:border-slate-700 dark:text-slate-400">
                        <p className="text-lg font-semibold text-slate-700 dark:text-slate-200">No contacts yet</p>
                        <p className="max-w-md text-sm">
                            Start by adding your first contact. When you win the work, convert them to a client and activate billing, invoices, and a gallery.
                        </p>
                        <button
                            type="button"
                            onClick={() => setIsAddModalOpen(true)}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-transparent bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:focus-visible:ring-offset-slate-950"
                        >
                            Add your first contact
                        </button>
                    </div>
                ) : visibleContacts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-slate-300 p-12 text-center text-slate-500 dark:border-slate-700 dark:text-slate-400">
                        <p className="text-lg font-semibold text-slate-700 dark:text-slate-200">No matches</p>
                        <p className="max-w-md text-sm">
                            Adjust your search or filter to rediscover contacts hidden from view.
                        </p>
                        <button
                            type="button"
                            onClick={handleResetFilters}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus-visible:ring-offset-slate-950"
                        >
                            Clear filters
                        </button>
                    </div>
                ) : (
                    <ContactsTable contacts={visibleContacts} onSelect={handleViewContact} isLoading={isRefreshing} />
                )}
            </section>

            <ContactModal
                contactId={selectedContactId}
                open={isContactModalOpen}
                onClose={handleCloseContactModal}
                onEdit={handleEditContact}
                onConvert={handleConvert}
                onDelete={handleDeleteContact}
                isConverting={Boolean(conversionTarget && selectedContactId === conversionTarget)}
            />
            <ConversionSuccessModal conversion={conversionResult} onClose={() => setConversionResult(null)} />
        </div>
    );
}

type AddContactModalProps = {
    onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
    formState: ContactFormState;
    isSubmitting: boolean;
    isEditing: boolean;
};

function AddContactModal({ onSubmit, onChange, formState, isSubmitting, isEditing }: AddContactModalProps) {
    const heading = isEditing ? 'Edit contact' : 'Add contact';
    const description = isEditing
        ? 'Update the latest details so your team always has the right context.'
        : 'Capture the essentials so you can follow up quickly and convert to a client later.';
    const submitLabel = isSubmitting ? 'Saving…' : isEditing ? 'Save changes' : 'Create contact';

    return (
        <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm" />
            <Dialog.Content className="fixed inset-0 z-50 mx-auto my-10 h-fit w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl transition focus:outline-none dark:border-slate-800 dark:bg-slate-950">
                <form onSubmit={onSubmit} className="flex flex-col gap-6 p-8">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <Dialog.Title className="text-xl font-semibold text-slate-900 dark:text-white">{heading}</Dialog.Title>
                            <Dialog.Description className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                {description}
                            </Dialog.Description>
                        </div>
                        <Dialog.Close asChild>
                            <button
                                type="button"
                                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:focus-visible:ring-offset-slate-950"
                                aria-label="Close"
                            >
                                ×
                            </button>
                        </Dialog.Close>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300">
                            <span className="font-semibold">First name</span>
                            <input
                                className={inputClassName}
                                name="first_name"
                                value={formState.first_name}
                                onChange={onChange}
                                placeholder="Taylor"
                            />
                        </label>
                        <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300">
                            <span className="font-semibold">Last name</span>
                            <input
                                className={inputClassName}
                                name="last_name"
                                value={formState.last_name}
                                onChange={onChange}
                                placeholder="Henderson"
                            />
                        </label>
                        <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300">
                            <span className="font-semibold">Email</span>
                            <input
                                className={inputClassName}
                                name="email"
                                value={formState.email}
                                onChange={onChange}
                                type="email"
                                placeholder="taylor@example.com"
                            />
                        </label>
                        <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300">
                            <span className="font-semibold">Phone</span>
                            <input
                                className={inputClassName}
                                name="phone"
                                value={formState.phone}
                                onChange={onChange}
                                placeholder="(415) 555-0110"
                            />
                        </label>
                        <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300 md:col-span-2">
                            <span className="font-semibold">Business</span>
                            <input
                                className={inputClassName}
                                name="business"
                                value={formState.business}
                                onChange={onChange}
                                placeholder="Henderson Creative"
                            />
                        </label>
                        <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300 md:col-span-2">
                            <span className="font-semibold">Address</span>
                            <input
                                className={inputClassName}
                                name="address"
                                value={formState.address}
                                onChange={onChange}
                                placeholder="100 Market Street"
                            />
                        </label>
                        <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300">
                            <span className="font-semibold">City</span>
                            <input
                                className={inputClassName}
                                name="city"
                                value={formState.city}
                                onChange={onChange}
                                placeholder="San Francisco"
                            />
                        </label>
                        <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300">
                            <span className="font-semibold">State</span>
                            <input
                                className={inputClassName}
                                name="state"
                                value={formState.state}
                                onChange={onChange}
                                placeholder="CA"
                            />
                        </label>
                        <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300">
                            <span className="font-semibold">Status</span>
                            <select
                                className={inputClassName}
                                name="status"
                                value={formState.status}
                                onChange={onChange}
                            >
                                <option value="lead">Lead</option>
                                <option value="active">Active</option>
                                <option value="client">Client</option>
                            </select>
                        </label>
                    </div>

                    <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300">
                        <span className="font-semibold">Notes</span>
                        <textarea
                            className={`${inputClassName} h-28 resize-none`}
                            name="notes"
                            value={formState.notes}
                            onChange={onChange}
                            placeholder="Met at the architecture expo. Interested in a spring shoot."
                        />
                    </label>

                    <div className="flex items-center justify-between">
                        <div className="text-xs text-slate-400">
                            <span className="font-semibold text-slate-500 dark:text-slate-300">Owner user ID</span>
                            <input
                                className={`${inputClassName} mt-1`}
                                name="owner_user_id"
                                value={formState.owner_user_id}
                                onChange={onChange}
                                placeholder="Supabase auth user ID"
                            />
                        </div>
                        <div className="flex gap-3">
                            <Dialog.Close asChild>
                                <button
                                    type="button"
                                    className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus-visible:ring-offset-slate-950"
                                >
                                    Cancel
                                </button>
                            </Dialog.Close>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="inline-flex items-center justify-center rounded-2xl border border-transparent bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:opacity-60 dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:focus-visible:ring-offset-slate-950"
                            >
                                {submitLabel}
                            </button>
                        </div>
                    </div>
                </form>
            </Dialog.Content>
        </Dialog.Portal>
    );
}

type ConversionSuccessModalProps = {
    conversion: { contact: ContactRecord; result: ConvertContactResponse } | null;
    onClose: () => void;
};

function ConversionSuccessModal({ conversion, onClose }: ConversionSuccessModalProps) {
    const open = Boolean(conversion);

    if (!conversion) {
        return null;
    }

    const { contact, result } = conversion;

    return (
        <Dialog.Root
            open={open}
            onOpenChange={(value) => {
                if (!value) {
                    onClose();
                }
            }}
        >
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm" />
                <Dialog.Content className="fixed inset-0 z-50 mx-auto my-16 h-fit w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl focus:outline-none dark:border-slate-700 dark:bg-slate-950">
                    <div className="flex flex-col gap-6">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <Dialog.Title className="text-2xl font-semibold text-slate-900 dark:text-white">
                                    Client ready to launch
                                </Dialog.Title>
                                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                                    {getContactName(contact)} now has a client record with billing, invoices, calendar, and gallery tabs prepared.
                                </p>
                            </div>
                            <Dialog.Close asChild>
                                <button
                                    type="button"
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:focus-visible:ring-offset-slate-950"
                                    aria-label="Close"
                                >
                                    ×
                                </button>
                            </Dialog.Close>
                        </div>

                        <div className="space-y-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/60">
                            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Portal modules</p>
                            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                                {result.portal.tabs.map((tab) => (
                                    <li key={tab.id} className="flex items-start gap-2">
                                        <span className="mt-0.5 text-emerald-500">✓</span>
                                        <div>
                                            <p className="font-semibold text-slate-700 dark:text-slate-100">{tab.label}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">{tab.description}</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="flex flex-col gap-3 rounded-3xl border border-indigo-200 bg-indigo-50/70 p-5 text-sm text-indigo-700 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-200">
                            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-400">Client portal</p>
                            <p>Send the link below once you are ready for them to log in.</p>
                            <Link
                                href={result.portal.url}
                                className="break-all font-semibold text-indigo-600 underline hover:text-indigo-500 dark:text-indigo-300"
                            >
                                {result.portal.url}
                            </Link>
                        </div>

                        <div className="flex items-center justify-end gap-3">
                            <Dialog.Close asChild>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus-visible:ring-offset-slate-950"
                                >
                                    Close
                                </button>
                            </Dialog.Close>
                            <Link
                                href={result.portal.url}
                                className="inline-flex items-center justify-center rounded-2xl border border-transparent bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:focus-visible:ring-offset-slate-950"
                            >
                                Open portal
                            </Link>
                        </div>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
