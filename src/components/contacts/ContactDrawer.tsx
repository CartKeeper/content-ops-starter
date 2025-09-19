import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';

import { formatDate, formatRelative, formatPhone } from '../../lib/formatters';
import type { ContactRecord } from '../../types/contact';
import type { ContactTableRow } from '../../lib/api/contacts';

type ContactProfile = ContactTableRow & { record: ContactRecord };

type ContactDrawerProps = {
    contact: ContactProfile | null;
    open: boolean;
    onClose: () => void;
    onConvert: (contact: ContactProfile) => Promise<void>;
    isConverting?: boolean;
};

const CONTACT_TABS = ['Profile', 'Notes', 'Activity'] as const;
type ContactTab = (typeof CONTACT_TABS)[number];

export function ContactDrawer({ contact, open, onClose, onConvert, isConverting = false }: ContactDrawerProps) {
    const [activeTab, setActiveTab] = React.useState<ContactTab>('Profile');
    const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (open) {
            setActiveTab('Profile');
            setSuccessMessage(null);
        }
    }, [open, contact?.id]);

    if (!contact) {
        return null;
    }

    const handleConvert = async () => {
        try {
            await onConvert(contact);
            setSuccessMessage('Contact converted to client. Check the Clients table for the new record.');
        } catch (error) {
            setSuccessMessage(null);
            throw error;
        }
    };

    return (
        <Dialog.Root open={open} onOpenChange={(value) => (!value ? onClose() : undefined)}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-slate-950/60 backdrop-blur" />
                <Dialog.Content className="fixed right-0 top-0 z-50 flex h-full w-full max-w-lg flex-col gap-4 overflow-y-auto border-l border-slate-800 bg-slate-950/95 p-6 text-slate-100 shadow-2xl">
                    <header className="flex items-start justify-between gap-4">
                        <div>
                            <Dialog.Title className="text-xl font-semibold text-white">{contact.name}</Dialog.Title>
                            <Dialog.Description className="text-sm text-slate-400">
                                {contact.email ?? 'No email'} • {formatPhone(contact.phone)}
                            </Dialog.Description>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-full border border-transparent bg-slate-800/80 p-2 text-slate-300 transition hover:border-slate-600 hover:text-white"
                            aria-label="Close"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                                <path
                                    fillRule="evenodd"
                                    d="M5.22 5.22a.75.75 0 0 1 1.06 0L10 8.94l3.72-3.72a.75.75 0 1 1 1.06 1.06L11.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06L10 11.06l-3.72 3.72a.75.75 0 0 1-1.06-1.06L8.94 10L5.22 6.28a.75.75 0 0 1 0-1.06Z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        </button>
                    </header>

                    <div className="flex flex-wrap gap-2">
                        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStageBadge(contact.stage)}`}>
                            {contact.stage.toUpperCase()}
                        </span>
                        {contact.tags.map((tag) => (
                            <span key={tag} className="rounded-full border border-slate-700 bg-slate-800/80 px-3 py-1 text-xs text-slate-200">
                                {tag}
                            </span>
                        ))}
                    </div>

                    {successMessage ? (
                        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs text-emerald-200">
                            {successMessage}
                        </div>
                    ) : null}

                    <button
                        type="button"
                        onClick={handleConvert}
                        disabled={isConverting}
                        className="w-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:from-emerald-400 hover:via-teal-500 hover:to-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isConverting ? 'Converting…' : 'Convert to Client'}
                    </button>

                    <nav className="flex gap-2 overflow-x-auto rounded-full bg-slate-900/70 p-1 text-xs font-medium text-slate-300">
                        {CONTACT_TABS.map((tab) => (
                            <button
                                key={tab}
                                type="button"
                                onClick={() => setActiveTab(tab)}
                                className={`flex-1 rounded-full px-4 py-2 transition ${
                                    activeTab === tab
                                        ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 text-white shadow'
                                        : 'hover:text-white'
                                }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </nav>

                    <section>
                        {activeTab === 'Profile' ? <ContactProfileTab contact={contact} /> : null}
                        {activeTab === 'Notes' ? <ContactNotesTab contact={contact.record} /> : null}
                        {activeTab === 'Activity' ? <ContactActivityTab contact={contact} /> : null}
                    </section>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}

function ContactProfileTab({ contact }: { contact: ContactProfile }) {
    return (
        <div className="grid gap-4">
            <div className="rounded-2xl border border-slate-800/60 bg-slate-900/70 p-4">
                <h3 className="text-sm font-semibold text-white">Details</h3>
                <dl className="mt-3 grid grid-cols-1 gap-3 text-sm text-slate-300">
                    <div>
                        <dt className="text-xs uppercase text-slate-500">Business</dt>
                        <dd>{contact.business ?? '—'}</dd>
                    </div>
                    <div>
                        <dt className="text-xs uppercase text-slate-500">Owner</dt>
                        <dd>{contact.owner ?? 'Unassigned'}</dd>
                    </div>
                    <div>
                        <dt className="text-xs uppercase text-slate-500">Last interaction</dt>
                        <dd>{contact.lastInteractionAt ? formatRelative(contact.lastInteractionAt) : '—'}</dd>
                    </div>
                    <div>
                        <dt className="text-xs uppercase text-slate-500">Created</dt>
                        <dd>{contact.record.created_at ? formatDate(contact.record.created_at) : '—'}</dd>
                    </div>
                </dl>
            </div>
        </div>
    );
}

function ContactNotesTab({ contact }: { contact: ContactRecord }) {
    return (
        <div className="rounded-2xl border border-slate-800/60 bg-slate-900/70 p-4 text-sm text-slate-200">
            {contact.notes ?? 'No notes captured yet.'}
        </div>
    );
}

function ContactActivityTab({ contact }: { contact: ContactProfile }) {
    const items = [
        contact.record.updated_at
            ? {
                  id: 'updated',
                  label: 'Last updated',
                  detail: formatRelative(contact.record.updated_at),
                  subLabel: formatDate(contact.record.updated_at)
              }
            : null,
        contact.record.created_at
            ? {
                  id: 'created',
                  label: 'Created',
                  detail: formatRelative(contact.record.created_at),
                  subLabel: formatDate(contact.record.created_at)
              }
            : null
    ].filter(Boolean) as Array<{ id: string; label: string; detail: string; subLabel: string }>;

    if (items.length === 0) {
        return <p className="text-sm text-slate-400">No timeline events tracked yet.</p>;
    }

    return (
        <ol className="space-y-3 text-sm text-slate-200">
            {items.map((item) => (
                <li key={item.id} className="rounded-2xl border border-slate-800/60 bg-slate-900/70 p-4">
                    <p className="font-semibold text-white">{item.label}</p>
                    <p className="text-sm text-slate-300">{item.detail}</p>
                    <p className="text-xs text-slate-500">{item.subLabel}</p>
                </li>
            ))}
        </ol>
    );
}

function getStageBadge(stage: ContactTableRow['stage']): string {
    switch (stage) {
        case 'hot':
            return 'border-rose-400/50 bg-rose-500/10 text-rose-200';
        case 'warm':
            return 'border-amber-400/50 bg-amber-500/10 text-amber-200';
        default:
            return 'border-indigo-400/50 bg-indigo-500/10 text-indigo-200';
    }
}

export type { ContactProfile };
export default ContactDrawer;

