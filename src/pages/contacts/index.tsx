import * as React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import * as Dialog from '@radix-ui/react-dialog';

import { CrmAuthGuard, WorkspaceLayout, ContactCard } from '../../components/crm';
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
};

type ContactsApiResponse = {
    data?: ContactRecord[];
    error?: string;
};

type ConvertApiResponse = {
    data?: ConvertContactResponse;
    error?: string;
};

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
    business: ''
};

const inputClassName =
    'w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:border-indigo-300';

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
    const [conversionTarget, setConversionTarget] = React.useState<string | null>(null);
    const [conversionResult, setConversionResult] = React.useState<
        { contact: ContactRecord; result: ConvertContactResponse } | null
    >(null);

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

            setContacts(Array.isArray(payload.data) ? payload.data : []);
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

    const handleFormChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = event.target;
        setFormState((previous) => ({ ...previous, [name]: value }));
    }, []);

    const resetForm = React.useCallback(() => {
        setFormState({ ...INITIAL_FORM, owner_user_id: identity.user?.id ?? '' });
    }, [identity.user?.id]);

    const handleCreateContact = React.useCallback(
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
                    created_at: nowIso,
                    updated_at: nowIso
                };

                const response = await fetch('/api/contacts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const result = (await response.json()) as ContactsApiResponse;

                if (!response.ok) {
                    throw new Error(result.error ?? 'Unable to create contact');
                }

                notify('success', 'Contact added to CRM');
                setIsAddModalOpen(false);
                resetForm();
                setIsRefreshing(true);
                await loadContacts();
            } catch (error) {
                console.error('Failed to create contact', error);
                notify('error', error instanceof Error ? error.message : 'Unable to create contact');
            } finally {
                setIsSubmittingContact(false);
                setIsRefreshing(false);
            }
        },
        [formState, loadContacts, notify, resetForm]
    );

    const handleConvert = React.useCallback(
        async (contact: ContactRecord) => {
            setConversionTarget(contact.id);
            try {
                const response = await fetch('/api/contacts/convert', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contactId: contact.id })
                });

                const payload = (await response.json()) as ConvertApiResponse;

                if (!response.ok || !payload.data) {
                    throw new Error(payload.error ?? 'Unable to convert contact');
                }

                setConversionResult({ contact, result: payload.data });
                notify('success', `${getContactName(contact)} is now a client`);
                setIsRefreshing(true);
                await loadContacts();
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
                    <Dialog.Root open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                        <Dialog.Trigger asChild>
                            <button
                                type="button"
                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-transparent bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:focus-visible:ring-offset-slate-950"
                            >
                                Add contact
                            </button>
                        </Dialog.Trigger>
                        <AddContactModal
                            onSubmit={handleCreateContact}
                            onChange={handleFormChange}
                            isSubmitting={isSubmittingContact}
                            formState={formState}
                        />
                    </Dialog.Root>
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
                ) : contacts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-slate-300 p-12 text-center text-slate-500 dark:border-slate-700 dark:text-slate-400">
                        <p className="text-lg font-semibold text-slate-700 dark:text-slate-200">No contacts yet</p>
                        <p className="text-sm max-w-md">
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
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                        {contacts.map((contact) => (
                            <ContactCard
                                key={contact.id}
                                contact={contact}
                                onConvert={handleConvert}
                                isConverting={conversionTarget === contact.id}
                                isDisabled={Boolean(conversionTarget && conversionTarget !== contact.id)}
                            />
                        ))}
                    </div>
                )}
            </section>

            <ConversionSuccessModal conversion={conversionResult} onClose={() => setConversionResult(null)} />
        </div>
    );
}

type AddContactModalProps = {
    onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    formState: ContactFormState;
    isSubmitting: boolean;
};

function AddContactModal({ onSubmit, onChange, formState, isSubmitting }: AddContactModalProps) {
    return (
        <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm" />
            <Dialog.Content className="fixed inset-0 z-50 mx-auto my-10 h-fit w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl transition focus:outline-none dark:border-slate-800 dark:bg-slate-950">
                <form onSubmit={onSubmit} className="flex flex-col gap-6 p-8">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <Dialog.Title className="text-xl font-semibold text-slate-900 dark:text-white">Add contact</Dialog.Title>
                            <Dialog.Description className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                Capture the essentials so you can follow up quickly and convert to a client later.
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
                                {isSubmitting ? 'Saving…' : 'Save contact'}
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
