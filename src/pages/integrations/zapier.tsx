import * as React from 'react';
import Head from 'next/head';

import { SectionCard, WorkspaceLayout } from '../../components/crm';
import type { ZapierWebhookEventRecord } from '../../types/zapier';

function formatDate(value?: string | null): string {
    if (!value) {
        return '—';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }
    return date.toLocaleString();
}

export default function ZapierIntegrationPage() {
    const [events, setEvents] = React.useState<ZapierWebhookEventRecord[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        let active = true;
        async function loadEvents() {
            setIsLoading(true);
            setError(null);
            try {
                const response = await fetch('/api/integrations/zapier/events');
                if (!response.ok) {
                    throw new Error(`Request failed with status ${response.status}`);
                }
                const payload = (await response.json()) as { data?: ZapierWebhookEventRecord[] };
                if (active) {
                    setEvents(payload.data ?? []);
                }
            } catch (loadError) {
                console.error('Unable to load Zapier events', loadError);
                if (active) {
                    setError('Unable to load Zapier webhook activity. Confirm Supabase credentials and try again.');
                }
            } finally {
                if (active) {
                    setIsLoading(false);
                }
            }
        }

        void loadEvents();

        return () => {
            active = false;
        };
    }, []);

    return (
        <>
            <Head>
                <title>Zapier Automation Bridge · Studio CRM</title>
            </Head>
            <WorkspaceLayout>
                <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
                    <header className="flex flex-col gap-4">
                        <p className="text-sm font-semibold uppercase tracking-[0.4em] text-[#4534FF] dark:text-[#9DAAFF]">
                            Automation bridge
                        </p>
                        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
                            Zapier webhook monitor
                        </h1>
                        <p className="max-w-2xl text-base text-slate-600 dark:text-slate-300">
                            Inspect inbound Zapier deliveries, confirm the signature handshake, and replay payloads directly
                            from the studio CRM. These webhooks drive Slack alerts, Notion logs, and Dropbox automations when new
                            galleries publish or fresh assets arrive.
                        </p>
                    </header>

                    <SectionCard
                        title="Configuration checklist"
                        description="Set the environment variables and Zapier headers to activate the webhook target."
                    >
                        <div className="grid gap-6 lg:grid-cols-2">
                            <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500 dark:text-slate-400">
                                    Environment variables
                                </p>
                                <ul className="list-disc space-y-2 pl-5">
                                    <li>
                                        <code className="rounded bg-slate-100 px-1 text-xs dark:bg-slate-800">
                                            ZAPIER_WEBHOOK_SECRET
                                        </code>{' '}
                                        &ndash; shared secret used to verify the <code>x-zapier-signature</code> header.
                                    </li>
                                    <li>
                                        <code className="rounded bg-slate-100 px-1 text-xs dark:bg-slate-800">
                                            NEXT_PUBLIC_DROPBOX_APP_KEY
                                        </code>{' '}
                                        &ndash; required for the Dropbox Chooser on the galleries dashboard.
                                    </li>
                                    <li>
                                        <code className="rounded bg-slate-100 px-1 text-xs dark:bg-slate-800">
                                            SUPABASE_SERVICE_ROLE_KEY
                                        </code>{' '}
                                        &ndash; grants the API routes permission to persist imports and publication logs.
                                    </li>
                                </ul>
                            </div>
                            <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500 dark:text-slate-400">
                                    Zapier webhook template
                                </p>
                                <ul className="list-disc space-y-2 pl-5">
                                    <li>
                                        Method: <code className="rounded bg-slate-100 px-1 text-xs dark:bg-slate-800">POST</code>
                                    </li>
                                    <li>
                                        Headers: set{' '}
                                        <code className="rounded bg-slate-100 px-1 text-xs dark:bg-slate-800">x-zap-id</code> and{' '}
                                        <code className="rounded bg-slate-100 px-1 text-xs dark:bg-slate-800">x-zap-event</code> for
                                        traceability.
                                    </li>
                                    <li>
                                        Body: send JSON payloads such as <code>{'{"event":"gallery.published", "galleryId":"..."}'}</code>.
                                    </li>
                                    <li>
                                        Signature: compute an HMAC SHA-256 hash of the raw body using
                                        <code className="ml-1 rounded bg-slate-100 px-1 text-xs dark:bg-slate-800">ZAPIER_WEBHOOK_SECRET</code>
                                        and provide it via <code>x-zapier-signature</code>.
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </SectionCard>

                    <SectionCard title="Recent webhook activity" description="Latest deliveries logged to Supabase">
                        {isLoading ? (
                            <p className="text-sm text-slate-500 dark:text-slate-400">Loading Zapier webhook events…</p>
                        ) : error ? (
                            <p className="text-sm text-rose-500">{error}</p>
                        ) : events.length === 0 ? (
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                No webhook events logged yet. Trigger a gallery import or publish action to see activity.
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-200 text-left text-sm dark:divide-slate-800">
                                    <thead className="text-xs uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                                        <tr>
                                            <th className="px-4 py-3 font-semibold">Event</th>
                                            <th className="px-4 py-3 font-semibold">Zap</th>
                                            <th className="px-4 py-3 font-semibold">Received</th>
                                            <th className="px-4 py-3 font-semibold">Status</th>
                                            <th className="px-4 py-3 font-semibold">Payload preview</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                        {events.map((event) => (
                                            <tr key={event.id} className="align-top">
                                                <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                                                    {event.event_type ?? 'unknown'}
                                                </td>
                                                <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                                                    {event.zap_id ?? '—'}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200">
                                                    {formatDate(event.received_at)}
                                                </td>
                                                <td className="px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
                                                    {event.status}
                                                </td>
                                                <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-300">
                                                    <pre className="max-w-xs whitespace-pre-wrap rounded bg-slate-100/80 p-2 font-mono text-[11px] leading-snug dark:bg-slate-900/60">
                                                        {JSON.stringify(event.payload ?? {}, null, 2)}
                                                    </pre>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </SectionCard>
                </div>
            </WorkspaceLayout>
        </>
    );
}
