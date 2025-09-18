import * as React from 'react';

import type { ContactRecord } from '../../types/contact';
import { getContactName } from '../../types/contact';

type ContactsTableProps = {
    contacts: ContactRecord[];
    onSelect: (contactId: string) => void;
    isLoading?: boolean;
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

function getStatusDisplay(status: ContactRecord['status']): { label: string; className: string } {
    const normalized = status ?? 'lead';
    return {
        label: STATUS_LABELS[normalized],
        className: `inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${STATUS_STYLES[normalized]}`
    };
}

export function ContactsTable({ contacts, onSelect, isLoading = false }: ContactsTableProps) {
    return (
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            {isLoading ? (
                <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-end bg-gradient-to-b from-indigo-500/10 via-indigo-500/5 to-transparent px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-indigo-500 dark:text-indigo-300">
                    Refreshing…
                </div>
            ) : null}
            <div className="hidden md:block">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                    <thead className="bg-slate-50 dark:bg-slate-900/60">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                                Name
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                                Email
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                                Phone
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                                Status
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                                Location
                            </th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-sm dark:divide-slate-800">
                        {contacts.map((contact) => {
                            const name = getContactName(contact);
                            const statusDisplay = getStatusDisplay(contact.status);
                            const location = [contact.city, contact.state].filter(Boolean).join(', ');

                            return (
                                <tr key={contact.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-900/60">
                                    <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">
                                        <div className="flex flex-col">
                                            <span>{name}</span>
                                            {contact.business ? (
                                                <span className="text-xs font-normal text-slate-500 dark:text-slate-400">{contact.business}</span>
                                            ) : null}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                                        {contact.email ? <span className="break-all">{contact.email}</span> : <span className="text-slate-400 dark:text-slate-500">—</span>}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                                        {contact.phone ? contact.phone : <span className="text-slate-400 dark:text-slate-500">—</span>}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                                        <span className={statusDisplay.className}>{statusDisplay.label}</span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                                        {location || <span className="text-slate-400 dark:text-slate-500">—</span>}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            type="button"
                                            onClick={() => onSelect(contact.id)}
                                            className="inline-flex items-center justify-center rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-indigo-600 transition hover:bg-indigo-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-200 dark:hover:bg-indigo-500/20 dark:focus-visible:ring-offset-slate-950"
                                        >
                                            View details
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="grid gap-4 p-4 md:hidden">
                {contacts.map((contact) => {
                    const name = getContactName(contact);
                    const statusDisplay = getStatusDisplay(contact.status);
                    const location = [contact.city, contact.state].filter(Boolean).join(', ');

                    return (
                        <article
                            key={contact.id}
                            className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h3 className="text-base font-semibold text-slate-900 dark:text-white">{name}</h3>
                                    {contact.business ? (
                                        <p className="text-xs text-slate-500 dark:text-slate-400">{contact.business}</p>
                                    ) : null}
                                    {location ? (
                                        <p className="mt-1 text-xs text-slate-400">{location}</p>
                                    ) : null}
                                </div>
                                <span className={statusDisplay.className}>{statusDisplay.label}</span>
                            </div>
                            <dl className="grid gap-2 text-sm text-slate-600 dark:text-slate-300">
                                <div>
                                    <dt className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Email</dt>
                                    <dd className="mt-1 break-all">{contact.email || <span className="text-slate-400 dark:text-slate-500">—</span>}</dd>
                                </div>
                                <div>
                                    <dt className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Phone</dt>
                                    <dd className="mt-1">{contact.phone || <span className="text-slate-400 dark:text-slate-500">—</span>}</dd>
                                </div>
                                {contact.notes ? (
                                    <div>
                                        <dt className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Notes</dt>
                                        <dd className="mt-1 text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{contact.notes}</dd>
                                    </div>
                                ) : null}
                            </dl>
                            <button
                                type="button"
                                onClick={() => onSelect(contact.id)}
                                className="inline-flex items-center justify-center rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-200 dark:hover:bg-indigo-500/20 dark:focus-visible:ring-offset-slate-950"
                            >
                                View details
                            </button>
                        </article>
                    );
                })}
            </div>
        </div>
    );
}

export default ContactsTable;
