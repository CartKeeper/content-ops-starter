import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';

import type { ContactRecord } from '../../types/contact';
import { getContactName } from '../../types/contact';

type ContactModalProps = {
    contactId: string | null;
    open: boolean;
    onClose: () => void;
    onEdit: (contact: ContactRecord) => void;
    onConvert: (contact: ContactRecord) => Promise<void> | void;
    onDelete: (contact: ContactRecord) => Promise<void> | void;
    isConverting?: boolean;
};

type ContactDetailResponse = {
    data?: ContactRecord;
    error?: string;
};

const STATUS_LABELS: Record<NonNullable<ContactRecord['status']>, string> = {
    lead: 'Lead',
    active: 'Active',
    client: 'Client'
};

const STATUS_STYLES: Record<NonNullable<ContactRecord['status']>, string> = {
    lead: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-200',
    active: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-200',
    client: 'bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-200'
};

function getStatusBadge(status: ContactRecord['status']): { label: string; className: string } {
    const normalized = status ?? 'lead';
    return {
        label: STATUS_LABELS[normalized],
        className: `inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${STATUS_STYLES[normalized]}`
    };
}

export function ContactModal({ contactId, open, onClose, onEdit, onConvert, onDelete, isConverting = false }: ContactModalProps) {
    const [contact, setContact] = React.useState<ContactRecord | null>(null);
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [isDeleting, setIsDeleting] = React.useState(false);
    const [isConvertPending, setIsConvertPending] = React.useState(false);

    React.useEffect(() => {
        if (!open || !contactId) {
            setContact(null);
            setError(null);
            setIsLoading(false);
            return;
        }

        let isMounted = true;
        const controller = new AbortController();

        async function loadContact() {
            setIsLoading(true);
            setError(null);

            try {
                const response = await fetch(`/api/contacts/${contactId}`, {
                    signal: controller.signal
                });
                const payload = (await response.json()) as ContactDetailResponse;

                if (!response.ok || !payload.data) {
                    throw new Error(payload.error ?? 'Unable to load contact');
                }

                if (isMounted) {
                    setContact({
                        ...payload.data,
                        status: payload.data.status ?? 'lead'
                    });
                }
            } catch (requestError) {
                if (!isMounted || (requestError instanceof DOMException && requestError.name === 'AbortError')) {
                    return;
                }

                console.error('Failed to load contact details', requestError);
                setError(requestError instanceof Error ? requestError.message : 'Unable to load contact');
                setContact(null);
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        }

        void loadContact();

        return () => {
            isMounted = false;
            controller.abort();
        };
    }, [contactId, open]);

    const handleConvert = React.useCallback(async () => {
        if (!contact || isConverting || isConvertPending) {
            return;
        }

        try {
            setIsConvertPending(true);
            await onConvert(contact);
        } catch (error) {
            console.error('Convert action failed', error);
        } finally {
            setIsConvertPending(false);
        }
    }, [contact, isConverting, isConvertPending, onConvert]);

    const handleDelete = React.useCallback(async () => {
        if (!contact || isDeleting) {
            return;
        }

        try {
            setIsDeleting(true);
            await onDelete(contact);
        } catch (error) {
            console.error('Delete action failed', error);
        } finally {
            setIsDeleting(false);
        }
    }, [contact, isDeleting, onDelete]);

    const handleEdit = React.useCallback(() => {
        if (!contact) {
            return;
        }
        onEdit(contact);
    }, [contact, onEdit]);

    const statusBadge = contact ? getStatusBadge(contact.status) : null;
    const isClient = contact?.status === 'client';
    const disableConvert = isClient || isConverting || isConvertPending;

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
                <Dialog.Content className="fixed inset-0 z-50 mx-auto my-12 flex h-fit w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl focus:outline-none dark:border-slate-800 dark:bg-slate-950">
                    <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-8 py-6 dark:border-slate-800">
                        <div className="flex flex-col gap-2">
                            <Dialog.Title className="text-2xl font-semibold text-slate-900 dark:text-white">
                                {contact ? getContactName(contact) : 'Contact details'}
                            </Dialog.Title>
                            {contact?.business ? (
                                <p className="text-sm text-slate-500 dark:text-slate-400">{contact.business}</p>
                            ) : null}
                            {contact ? (
                                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                                    {statusBadge ? (
                                        <span className={statusBadge.className}>{statusBadge.label}</span>
                                    ) : null}
                                    {contact.updated_at ? (
                                        <span>Updated {new Date(contact.updated_at).toLocaleDateString()}</span>
                                    ) : null}
                                </div>
                            ) : null}
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

                    <div className="flex-1 space-y-6 overflow-y-auto px-8 py-6">
                        {isLoading ? (
                            <div className="flex h-40 items-center justify-center text-sm text-slate-500 dark:text-slate-400">
                                Loading contact…
                            </div>
                        ) : error ? (
                            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300">
                                {error}
                            </div>
                        ) : contact ? (
                            <div className="space-y-6">
                                <dl className="grid gap-4 text-sm text-slate-600 dark:text-slate-300 md:grid-cols-2">
                                    <div>
                                        <dt className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Email</dt>
                                        <dd className="mt-1 break-all">{contact.email ?? '—'}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Phone</dt>
                                        <dd className="mt-1">{contact.phone ?? '—'}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Location</dt>
                                        <dd className="mt-1">{[contact.city, contact.state].filter(Boolean).join(', ') || '—'}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Address</dt>
                                        <dd className="mt-1">{contact.address ?? '—'}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Status</dt>
                                        <dd className="mt-1">
                                            {statusBadge ? <span className={statusBadge.className}>{statusBadge.label}</span> : 'Lead'}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Owner</dt>
                                        <dd className="mt-1">{contact.owner_user_id ?? 'Unassigned'}</dd>
                                    </div>
                                </dl>
                                {contact.notes ? (
                                    <div>
                                        <h4 className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Notes</h4>
                                        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                                            {contact.notes}
                                        </p>
                                    </div>
                                ) : null}
                                <div className="grid gap-3 text-xs text-slate-400 md:grid-cols-2">
                                    {contact.created_at ? (
                                        <div>
                                            <span className="font-semibold text-slate-500 dark:text-slate-300">Created</span>
                                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                                                {new Date(contact.created_at).toLocaleString()}
                                            </p>
                                        </div>
                                    ) : null}
                                    {contact.updated_at ? (
                                        <div>
                                            <span className="font-semibold text-slate-500 dark:text-slate-300">Updated</span>
                                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                                                {new Date(contact.updated_at).toLocaleString()}
                                            </p>
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        ) : (
                            <div className="flex h-40 items-center justify-center text-sm text-slate-500 dark:text-slate-400">
                                Select a contact to view details.
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-8 py-6 dark:border-slate-800 dark:bg-slate-900/60 md:flex-row md:items-center md:justify-between">
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                            {contact?.email ? `Ready to follow up with ${contact.email}` : 'Track interactions and convert when the timing is right.'}
                        </div>
                        <div className="flex flex-col gap-3 md:flex-row">
                            <button
                                type="button"
                                onClick={handleEdit}
                                disabled={!contact}
                                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus-visible:ring-offset-slate-950"
                            >
                                Edit contact
                            </button>
                            <button
                                type="button"
                                onClick={handleConvert}
                                disabled={!contact || disableConvert}
                                className="inline-flex items-center justify-center rounded-2xl border border-transparent bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:opacity-60 dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:focus-visible:ring-offset-slate-950"
                            >
                                {isConverting || isConvertPending ? 'Converting…' : isClient ? 'Already a client' : 'Convert to client'}
                            </button>
                            <button
                                type="button"
                                onClick={handleDelete}
                                disabled={!contact || isDeleting}
                                className="inline-flex items-center justify-center rounded-2xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:opacity-60 dark:border-rose-500/40 dark:text-rose-300 dark:hover:bg-rose-500/10 dark:focus-visible:ring-offset-slate-950"
                            >
                                {isDeleting ? 'Deleting…' : 'Delete contact'}
                            </button>
                        </div>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}

export default ContactModal;
