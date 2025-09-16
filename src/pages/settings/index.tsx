import type { GetStaticProps } from 'next';
import { useState } from 'react';
import { CRMLayout } from '../../components/crm/CRMLayout';
import { getCurrentUser } from '../../lib/auth';
import type { CMSCollection } from '../../lib/cms';
import { listCollections } from '../../lib/cms';

interface SettingsPageProps {
    collections: CMSCollection[];
}

export default function SettingsPage({ collections }: SettingsPageProps) {
    const user = getCurrentUser();
    const [brandName, setBrandName] = useState(user.brandName ?? '');
    const [replyToEmail, setReplyToEmail] = useState(user.email);
    const [notifications, setNotifications] = useState({
        bookingReminder: true,
        invoiceReminder: true,
        galleryExpiring: true
    });

    return (
        <CRMLayout
            title="Studio Settings"
            description="Update your brand presence, automate reminders and review the data models powering the CRM."
        >
            <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
                <h2 className="text-lg font-semibold text-white">Brand identity</h2>
                <p className="mt-2 text-xs uppercase tracking-[0.3em] text-slate-400">
                    These details sync to invoices, proposals and client emails
                </p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.3em] text-slate-400">
                        Studio name
                        <input
                            type="text"
                            className="rounded-lg border border-slate-800 bg-slate-950 px-4 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            value={brandName}
                            onChange={(event) => setBrandName(event.target.value)}
                        />
                    </label>
                    <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.3em] text-slate-400">
                        Reply-to email
                        <input
                            type="email"
                            className="rounded-lg border border-slate-800 bg-slate-950 px-4 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            value={replyToEmail}
                            onChange={(event) => setReplyToEmail(event.target.value)}
                        />
                    </label>
                    <label className="md:col-span-2">
                        <span className="text-xs uppercase tracking-[0.3em] text-slate-400">Brand statement</span>
                        <textarea
                            className="mt-2 h-24 w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            placeholder="Tell clients what makes working with you unforgettable."
                        />
                    </label>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-300">
                    <button className="rounded-full border border-emerald-500/40 px-4 py-2 hover:border-emerald-300 hover:text-emerald-200">
                        Upload logo
                    </button>
                    <button className="rounded-full border border-emerald-500/40 px-4 py-2 hover:border-emerald-300 hover:text-emerald-200">
                        Save settings
                    </button>
                </div>
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
                <h2 className="text-lg font-semibold text-white">Automation</h2>
                <p className="mt-2 text-xs uppercase tracking-[0.3em] text-slate-400">
                    Send timely reminders and surprise-and-delight touchpoints
                </p>
                <div className="mt-4 space-y-4 text-sm">
                    <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-800/80 bg-slate-950/60 px-4 py-3">
                        <div>
                            <p className="font-semibold text-white">Booking prep reminder</p>
                            <p className="text-xs text-slate-400">Email clients a prep guide 3 days before their session.</p>
                        </div>
                        <input
                            type="checkbox"
                            checked={notifications.bookingReminder}
                            onChange={(event) =>
                                setNotifications((prev) => ({
                                    ...prev,
                                    bookingReminder: event.target.checked
                                }))
                            }
                            className="h-5 w-5 rounded border border-emerald-500/30 bg-slate-900 text-emerald-500 focus:ring-emerald-500"
                        />
                    </label>
                    <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-800/80 bg-slate-950/60 px-4 py-3">
                        <div>
                            <p className="font-semibold text-white">Invoice reminder</p>
                            <p className="text-xs text-slate-400">Send an automated nudge 2 days after the due date.</p>
                        </div>
                        <input
                            type="checkbox"
                            checked={notifications.invoiceReminder}
                            onChange={(event) =>
                                setNotifications((prev) => ({
                                    ...prev,
                                    invoiceReminder: event.target.checked
                                }))
                            }
                            className="h-5 w-5 rounded border border-emerald-500/30 bg-slate-900 text-emerald-500 focus:ring-emerald-500"
                        />
                    </label>
                    <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-800/80 bg-slate-950/60 px-4 py-3">
                        <div>
                            <p className="font-semibold text-white">Gallery expiry</p>
                            <p className="text-xs text-slate-400">Let clients know when galleries will archive or need renewal.</p>
                        </div>
                        <input
                            type="checkbox"
                            checked={notifications.galleryExpiring}
                            onChange={(event) =>
                                setNotifications((prev) => ({
                                    ...prev,
                                    galleryExpiring: event.target.checked
                                }))
                            }
                            className="h-5 w-5 rounded border border-emerald-500/30 bg-slate-900 text-emerald-500 focus:ring-emerald-500"
                        />
                    </label>
                </div>
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
                <h2 className="text-lg font-semibold text-white">Content model blueprint</h2>
                <p className="mt-2 text-xs uppercase tracking-[0.3em] text-slate-400">
                    Collections ready to sync with Netlify (Decap) CMS or another git-based workflow
                </p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                    {collections.map((collection) => (
                        <article
                            key={collection.name}
                            className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-4 text-sm text-slate-200"
                        >
                            <h3 className="text-base font-semibold text-white">{collection.label}</h3>
                            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{collection.folder}</p>
                            <ul className="mt-3 space-y-2 text-xs text-slate-300">
                                {collection.fields.map((field) => (
                                    <li key={field.name} className="flex items-start justify-between gap-2">
                                        <span className="font-medium text-white">{field.label}</span>
                                        <span className="text-slate-400">{field.widget}</span>
                                    </li>
                                ))}
                            </ul>
                        </article>
                    ))}
                </div>
            </section>
        </CRMLayout>
    );
}

export const getStaticProps: GetStaticProps<SettingsPageProps> = async () => {
    return {
        props: {
            collections: listCollections()
        }
    };
};
