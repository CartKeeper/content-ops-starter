import * as React from 'react';
import classNames from 'classnames';

import type { ContactRecord } from '../../types/contact';
import { getContactInitials, getContactName } from '../../types/contact';

type ContactCardProps = {
    contact: ContactRecord;
    onConvert?: (contact: ContactRecord) => void;
    isConverting?: boolean;
    isDisabled?: boolean;
};

export function ContactCard({ contact, onConvert, isConverting = false, isDisabled = false }: ContactCardProps) {
    const name = getContactName(contact);
    const initials = getContactInitials(contact);
    const location = [contact.city, contact.state].filter(Boolean).join(', ');

    return (
        <article className="relative flex flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-lg font-semibold text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300">
                    {initials}
                </div>
                <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{name}</h3>
                    {contact.business ? (
                        <p className="text-sm text-slate-500 dark:text-slate-400">{contact.business}</p>
                    ) : null}
                    {location ? <p className="mt-1 text-xs text-slate-400">{location}</p> : null}
                </div>
                <div className="flex flex-col items-end gap-2">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium uppercase tracking-wide text-slate-500 dark:bg-slate-800/80 dark:text-slate-300">
                        Contact
                    </span>
                </div>
            </div>
            <dl className="mt-5 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                {contact.email ? (
                    <div className="flex flex-col">
                        <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Email</dt>
                        <dd className="mt-1 break-all">{contact.email}</dd>
                    </div>
                ) : null}
                {contact.phone ? (
                    <div className="flex flex-col">
                        <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Phone</dt>
                        <dd className="mt-1">{contact.phone}</dd>
                    </div>
                ) : null}
                {contact.notes ? (
                    <div className="flex flex-col">
                        <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Notes</dt>
                        <dd className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400 line-clamp-3">
                            {contact.notes}
                        </dd>
                    </div>
                ) : null}
            </dl>
            {onConvert ? (
                <button
                    type="button"
                    onClick={() => onConvert(contact)}
                    disabled={isConverting || isDisabled}
                    className={classNames(
                        'mt-6 inline-flex items-center justify-center gap-2 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-600 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-300 dark:focus-visible:ring-offset-slate-950',
                        { 'animate-pulse': isConverting }
                    )}
                >
                    {isConverting ? 'Converting…' : 'Convert to Client'}
                </button>
            ) : null}
        </article>
    );
}
