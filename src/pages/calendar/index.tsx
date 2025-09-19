import * as React from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import timeGridPlugin from '@fullcalendar/timegrid';

import { CrmAuthGuard, WorkspaceLayout, SectionCard } from '../../components/crm';
import { useNetlifyIdentity } from '../../components/auth';
import type { CalendarEventRecord } from '../../types/calendar';

const FullCalendar = dynamic(async () => {
    const mod = await import('@fullcalendar/react');
    return mod.default;
}, { ssr: false });

type CalendarDisplayEvent = {
    id: string;
    title: string;
    start: string;
    end: string;
    extendedProps: { description?: string | null };
};

type FormState = {
    title: string;
    description: string;
    start: string;
    end: string;
};

const emptyForm: FormState = {
    title: '',
    description: '',
    start: '',
    end: ''
};

function mapRecordToEvent(record: CalendarEventRecord): CalendarDisplayEvent {
    return {
        id: record.id,
        title: record.title,
        start: record.startTime,
        end: record.endTime,
        extendedProps: { description: record.description }
    };
}

function CalendarWorkspace() {
    const identity = useNetlifyIdentity();
    const [events, setEvents] = React.useState<CalendarDisplayEvent[]>([]);
    const [isLoading, setIsLoading] = React.useState(false);
    const [isSaving, setIsSaving] = React.useState(false);
    const [formState, setFormState] = React.useState<FormState>(emptyForm);
    const [calendarError, setCalendarError] = React.useState<string | null>(null);
    const [formError, setFormError] = React.useState<string | null>(null);
    const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

    const loadEvents = React.useCallback(async () => {
        setIsLoading(true);
        setCalendarError(null);

        try {
            const token = await identity.getToken();
            if (!token) {
                setEvents([]);
                return;
            }

            const response = await fetch('/api/calendar/events', {
                headers: { Authorization: `Bearer ${token}` }
            });

            const payload = await response.json().catch(() => null);

            if (!response.ok) {
                const message = payload?.error ?? 'Unable to load calendar events.';
                throw new Error(message);
            }

            const items: CalendarEventRecord[] = Array.isArray(payload?.events) ? payload.events : [];
            setEvents(items.map(mapRecordToEvent));
            setCalendarError(null);
        } catch (loadError) {
            console.error('Failed to load calendar events', loadError);
            setCalendarError(loadError instanceof Error ? loadError.message : 'Unable to load calendar events.');
        } finally {
            setIsLoading(false);
        }
    }, [identity]);

    React.useEffect(() => {
        if (!identity.isReady || !identity.isAuthenticated) {
            return;
        }

        void loadEvents();
    }, [identity.isAuthenticated, identity.isReady, loadEvents]);

    const handleChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = event.target;
        setFormState((previous) => ({ ...previous, [name]: value }));
    }, []);

    const handleSubmit = React.useCallback(
        async (event: React.FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            if (isSaving) {
                return;
            }

            if (!formState.title || !formState.start || !formState.end) {
                setFormError('Provide a title, start date, and end date to schedule a session.');
                return;
            }

            setIsSaving(true);
            setFormError(null);
            setSuccessMessage(null);

            try {
                const token = await identity.getToken();
                if (!token) {
                    throw new Error('Authentication expired. Please sign in again.');
                }

                const response = await fetch('/api/calendar/events', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        title: formState.title,
                        description: formState.description,
                        start: formState.start,
                        end: formState.end
                    })
                });

                const payload = await response.json().catch(() => null);

                if (!response.ok) {
                    const message = payload?.error ?? 'Unable to save the event.';
                    throw new Error(message);
                }

                const record: CalendarEventRecord | undefined = payload?.event;
                if (record) {
                    setEvents((previous) => [...previous, mapRecordToEvent(record)]);
                }

                setFormState(emptyForm);
                setSuccessMessage('Event added to the calendar.');
                setFormError(null);
            } catch (submitError) {
                console.error('Failed to create event', submitError);
                setFormError(submitError instanceof Error ? submitError.message : 'Unable to save the event.');
            } finally {
                setIsSaving(false);
            }
        },
        [formState, identity, isSaving]
    );

    return (
        <WorkspaceLayout>
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[2fr_1fr]">
                <SectionCard
                    title="Studio calendar"
                    description="View upcoming sessions and production milestones across your studio team."
                >
                    <div className="mt-6 rounded-2xl border border-slate-200/10 bg-slate-900/40 p-4">
                        <FullCalendar
                            height="auto"
                            events={events}
                            plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
                            initialView="dayGridMonth"
                            headerToolbar={{
                                left: 'prev,next today',
                                center: 'title',
                                right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
                            }}
                            eventTimeFormat={{ hour: '2-digit', minute: '2-digit', meridiem: true }}
                            displayEventTime
                            eventDisplay="block"
                            eventClassNames={() => ['bg-primary/30', 'border-primary/60', 'text-slate-100']}
                            loading={(loading) => {
                                setIsLoading(loading);
                            }}
                        />
                        {isLoading ? (
                            <p className="mt-4 text-sm text-slate-400">Loading calendar events…</p>
                        ) : null}
                        {calendarError ? (
                            <p className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                                {calendarError}
                            </p>
                        ) : null}
                    </div>
                </SectionCard>
                <SectionCard
                    title="Add a new event"
                    description="Schedule a shoot, production milestone, or internal meeting to keep the team aligned."
                >
                    <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
                        <div>
                            <label htmlFor="title" className="block text-sm font-medium text-slate-200">
                                Title
                            </label>
                            <input
                                id="title"
                                name="title"
                                type="text"
                                required
                                value={formState.title}
                                onChange={handleChange}
                                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-[#4DE5FF] focus:ring-2 focus:ring-[#4DE5FF]/60"
                                placeholder="Editorial shoot"
                            />
                        </div>
                        <div>
                            <label htmlFor="description" className="block text-sm font-medium text-slate-200">
                                Description
                            </label>
                            <textarea
                                id="description"
                                name="description"
                                value={formState.description}
                                onChange={handleChange}
                                rows={3}
                                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-[#4DE5FF] focus:ring-2 focus:ring-[#4DE5FF]/60"
                                placeholder="Production notes, crew reminders, or location details"
                            />
                        </div>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label htmlFor="start" className="block text-sm font-medium text-slate-200">
                                    Start
                                </label>
                                <input
                                    id="start"
                                    name="start"
                                    type="datetime-local"
                                    required
                                    value={formState.start}
                                    onChange={handleChange}
                                    className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-[#4DE5FF] focus:ring-2 focus:ring-[#4DE5FF]/60"
                                />
                            </div>
                            <div>
                                <label htmlFor="end" className="block text-sm font-medium text-slate-200">
                                    End
                                </label>
                                <input
                                    id="end"
                                    name="end"
                                    type="datetime-local"
                                    required
                                    value={formState.end}
                                    onChange={handleChange}
                                    className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-[#4DE5FF] focus:ring-2 focus:ring-[#4DE5FF]/60"
                                />
                            </div>
                        </div>
                        {successMessage ? (
                            <p className="rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
                                {successMessage}
                            </p>
                        ) : null}
                        {formError ? (
                            <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                                {formError}
                            </p>
                        ) : null}
                        <div className="flex items-center justify-between">
                            <button
                                type="submit"
                                className="rounded-xl bg-[#4DE5FF] px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-[#86f0ff]"
                                disabled={isSaving}
                            >
                                {isSaving ? 'Saving…' : 'Add event'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormState(emptyForm)}
                                className="text-sm font-medium text-slate-400 hover:text-white"
                            >
                                Clear form
                            </button>
                        </div>
                    </form>
                </SectionCard>
            </div>
        </WorkspaceLayout>
    );
}

export default function CalendarPage() {
    return (
        <>
            <Head>
                <title>Calendar • Studio CRM</title>
            </Head>
            <CrmAuthGuard>
                <CalendarWorkspace />
            </CrmAuthGuard>
        </>
    );
}
