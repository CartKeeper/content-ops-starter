import * as React from 'react';
import type { GetStaticProps } from 'next';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import type {
    DateSelectArg,
    EventClickArg,
    EventContentArg,
    EventInput,
    EventMountArg
} from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import timeGridPlugin from '@fullcalendar/timegrid';

import {
    BookingList,
    CrmAuthGuard,
    WorkspaceLayout,
    useCrmAuth,
    type BookingRecord,
    type BookingStatus
} from '../../components/crm';
import { CalendarIcon, SparklesIcon } from '../../components/crm/icons';
import { clients } from '../../data/crm';
import { QuickActionModal, type QuickActionFormField, type QuickActionModalSubmitValues } from '../../components/crm/QuickActionModal';
import { readCmsCollection } from '../../utils/read-cms-collection';

dayjs.extend(customParseFormat);

const FullCalendar = dynamic(async () => {
    const mod = await import('@fullcalendar/react');
    return mod.default;
}, { ssr: false });

type CalendarEventExtendedProps = {
    resource: BookingRecord;
    status: BookingStatus;
    location: string;
};

type CalendarEvent = EventInput & {
    id: string;
    title: string;
    start: Date;
    end: Date;
    extendedProps: CalendarEventExtendedProps;
    classNames: string[];
};

type FullCalendarRef = {
    getApi: () => { updateSize: () => void };
};

type ModalState =
    | {
          mode: 'create';
          defaults?: Partial<BookingRecord>;
      }
    | {
          mode: 'edit';
          booking: BookingRecord;
      };

type FeedbackNotice = {
    id: string;
    type: 'success' | 'error';
    message: string;
};

type BookingsPageProps = {
    bookings: BookingRecord[];
};

type RawBookingRecord = Record<string, unknown>;

const STATUS_COLOR_MAP: Record<BookingStatus, { background: string; border: string }> = {
    Confirmed: { background: '#10b981', border: 'rgba(16, 185, 129, 0.25)' },
    Pending: { background: '#f59e0b', border: 'rgba(245, 158, 11, 0.25)' },
    Editing: { background: '#6366f1', border: 'rgba(99, 102, 241, 0.25)' }
};

const clientOptions = clients
    .map((client) => ({ value: client.name, label: client.name }))
    .sort((first, second) => first.label.localeCompare(second.label));

function BookingCalendarWorkspace({ bookings: initialBookings }: BookingsPageProps) {
    const { signOut, guardEnabled } = useCrmAuth();
    const [bookings, setBookings] = React.useState<BookingRecord[]>(() => sortBookings(initialBookings));
    const [modalState, setModalState] = React.useState<ModalState | null>(null);
    const [feedback, setFeedback] = React.useState<FeedbackNotice | null>(null);
    const [isSyncing, setIsSyncing] = React.useState(false);
    const [lastSyncedAt, setLastSyncedAt] = React.useState<string | null>(null);
    const calendarRef = React.useRef<FullCalendarRef | null>(null);
    const handleSidebarChange = React.useCallback(() => {
        if (!calendarRef.current) {
            return;
        }

        const api = calendarRef.current.getApi();
        window.setTimeout(() => api.updateSize(), 160);
    }, []);

    const calendarEvents = React.useMemo<CalendarEvent[]>(
        () => bookings.map((booking) => createCalendarEvent(booking)),
        [bookings]
    );

    React.useEffect(() => {
        if (!calendarRef.current) {
            return;
        }

        const api = calendarRef.current.getApi();
        const handle = window.setTimeout(() => api.updateSize(), 120);
        return () => window.clearTimeout(handle);
    }, [calendarEvents]);

    const upcomingShoots = React.useMemo(() => buildUpcomingList(bookings), [bookings]);

    const enhancedClientOptions = React.useMemo(() => {
        if (!modalState) {
            return clientOptions;
        }

        const activeClient =
            modalState.mode === 'edit' ? modalState.booking.client : modalState.defaults?.client;

        if (activeClient && !clientOptions.some((option) => option.value === activeClient)) {
            return [...clientOptions, { value: activeClient, label: activeClient }];
        }

        return clientOptions;
    }, [modalState]);

    const modalFields = React.useMemo<QuickActionFormField[]>(() => {
        const defaults =
            modalState?.mode === 'edit'
                ? modalState.booking
                : modalState?.defaults ?? undefined;

        const defaultDate = defaults?.date ?? dayjs().format('YYYY-MM-DD');
        const defaultStartTime = toTimeInputValue(defaults?.startTime) || '09:00';
        const defaultEndTime = toTimeInputValue(defaults?.endTime) || '';
        const defaultClient = defaults?.client ?? enhancedClientOptions[0]?.value ?? '';
        const defaultShootType = defaults?.shootType ?? '';
        const defaultLocation = defaults?.location ?? '';
        const defaultStatus = defaults?.status ?? 'Pending';

        return [
            {
                id: 'client',
                label: 'Client',
                inputType: 'select',
                options: enhancedClientOptions,
                defaultValue: defaultClient,
                required: true
            },
            {
                id: 'shootType',
                label: 'Shoot type',
                inputType: 'text',
                placeholder: 'Editorial portraits',
                defaultValue: defaultShootType,
                required: true
            },
            {
                id: 'date',
                label: 'Shoot date',
                inputType: 'date',
                defaultValue: defaultDate,
                required: true
            },
            {
                id: 'startTime',
                label: 'Start time',
                inputType: 'time',
                defaultValue: defaultStartTime,
                required: true
            },
            {
                id: 'endTime',
                label: 'End time',
                inputType: 'time',
                defaultValue: defaultEndTime
            },
            {
                id: 'location',
                label: 'Location',
                inputType: 'text',
                placeholder: 'Studio or on-site address',
                defaultValue: defaultLocation,
                required: true
            },
            {
                id: 'status',
                label: 'Status',
                inputType: 'select',
                options: [
                    { value: 'Pending', label: 'Pending' },
                    { value: 'Confirmed', label: 'Confirmed' },
                    { value: 'Editing', label: 'Editing' }
                ],
                defaultValue: defaultStatus
            }
        ];
    }, [enhancedClientOptions, modalState]);

    const refreshBookings = React.useCallback(async () => {
        if (isSyncing) {
            return;
        }

        setIsSyncing(true);

        try {
            const response = await fetch('/api/crm/bookings', { headers: { accept: 'application/json' } });
            let payload: { data?: unknown; error?: string } | null = null;

            try {
                payload = await response.json();
            } catch (parseError) {
                payload = null;
            }

            if (!response.ok) {
                const message = payload?.error ?? 'Unable to refresh bookings. Please try again.';
                throw new Error(message);
            }

            const normalized = normalizeBookings(Array.isArray(payload?.data) ? payload!.data : []);
            setBookings(sortBookings(normalized));
            setLastSyncedAt(dayjs().toISOString());
        } catch (error) {
            console.error('Unable to refresh bookings', error);
            setFeedback({
                id: `${Date.now()}`,
                type: 'error',
                message: error instanceof Error ? error.message : 'Unable to refresh bookings. Try again.'
            });
        } finally {
            setIsSyncing(false);
        }
    }, [isSyncing]);

    React.useEffect(() => {
        void refreshBookings();
    }, [refreshBookings]);

    React.useEffect(() => {
        if (!feedback) {
            return;
        }

        const timeout = window.setTimeout(() => setFeedback(null), 6000);
        return () => window.clearTimeout(timeout);
    }, [feedback]);

    const handleOpenCreate = React.useCallback(() => {
        setModalState({
            mode: 'create',
            defaults: {
                date: dayjs().format('YYYY-MM-DD'),
                startTime: '09:00',
                status: 'Pending'
            }
        });
    }, []);

    const handleSelectSlot = React.useCallback((selection: DateSelectArg) => {
        const start = dayjs(selection.start);
        const end = dayjs(selection.end);
        const duration = end.diff(start, 'minute');
        const isAllDay = selection.allDay || duration >= 24 * 60;

        const defaultStart = isAllDay ? '09:00' : start.format('HH:mm');
        const defaultEnd = !isAllDay && duration >= 15 ? end.format('HH:mm') : '';

        selection.view.calendar.unselect();

        setModalState({
            mode: 'create',
            defaults: {
                date: start.format('YYYY-MM-DD'),
                startTime: defaultStart,
                endTime: defaultEnd,
                status: 'Pending'
            }
        });
    }, []);

    const handleSelectEvent = React.useCallback((event: EventClickArg) => {
        const extendedProps = event.event.extendedProps as CalendarEventExtendedProps | undefined;
        if (!extendedProps?.resource) {
            return;
        }

        setModalState({ mode: 'edit', booking: extendedProps.resource });
    }, []);

    const renderEventContent = React.useCallback((eventInfo: EventContentArg) => {
        const extendedProps = eventInfo.event.extendedProps as CalendarEventExtendedProps | undefined;
        return (
            <div className="crm-event-content">
                <span className="crm-event-title">{eventInfo.event.title}</span>
                {extendedProps?.location ? (
                    <span className="crm-event-location">{extendedProps.location}</span>
                ) : null}
            </div>
        );
    }, []);

    const handleEventDidMount = React.useCallback((info: EventMountArg) => {
        const extendedProps = info.event.extendedProps as CalendarEventExtendedProps | undefined;
        if (!extendedProps) {
            return;
        }

        const tone = STATUS_COLOR_MAP[extendedProps.status];
        if (info.view.type.startsWith('list')) {
            const dot = info.el.querySelector('.fc-list-event-dot');
            if (dot instanceof HTMLElement) {
                dot.style.borderColor = tone.background;
                dot.style.backgroundColor = tone.background;
            }
        }
    }, []);

    const handleCloseModal = React.useCallback(() => {
        setModalState(null);
    }, []);

    const handleSubmitModal = React.useCallback(
        async (values: QuickActionModalSubmitValues) => {
            if (!modalState) {
                return;
            }

            const payload = buildBookingPayload(values);

            if (modalState.mode === 'create') {
                const response = await fetch('/api/crm/bookings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                let result: { data?: unknown; error?: string } | null = null;
                try {
                    result = await response.json();
                } catch (parseError) {
                    result = null;
                }

                if (!response.ok) {
                    const message = result?.error ?? 'Unable to save booking. Please try again.';
                    throw new Error(message);
                }

                const rawRecord = mergeRecordSources(payload, result?.data, `bk-${Date.now()}`);
                const normalized = normalizeBookingRecord(rawRecord, `bk-${Date.now()}`, 0);

                if (!normalized) {
                    throw new Error('Booking saved but could not be normalized.');
                }

                setBookings((previous) => sortBookings([...previous, normalized]));
                setFeedback({
                    id: `${Date.now()}`,
                    type: 'success',
                    message: `Scheduled ${normalized.shootType} for ${normalized.client}.`
                });
                setLastSyncedAt(dayjs().toISOString());
                return;
            }

            const bookingId = modalState.booking.id;
            const response = await fetch(`/api/crm/bookings?id=${encodeURIComponent(bookingId)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            let result: { data?: unknown; error?: string } | null = null;
            try {
                result = await response.json();
            } catch (parseError) {
                result = null;
            }

            if (!response.ok) {
                const message = result?.error ?? 'Unable to update booking. Please try again.';
                throw new Error(message);
            }

            const rawRecord = mergeRecordSources({ ...modalState.booking, ...payload }, result?.data, bookingId);
            const normalized = normalizeBookingRecord(rawRecord, bookingId, 0);

            if (!normalized) {
                throw new Error('Updated booking could not be normalized.');
            }

            setBookings((previous) =>
                sortBookings(previous.map((booking) => (booking.id === bookingId ? normalized : booking)))
            );
            setFeedback({
                id: `${Date.now()}`,
                type: 'success',
                message: `Updated ${normalized.shootType} for ${normalized.client}.`
            });
            setLastSyncedAt(dayjs().toISOString());
        },
        [modalState]
    );

    return (
        <>
            <Head>
                <title>Studio bookings calendar</title>
            </Head>
            <WorkspaceLayout onSidebarChange={handleSidebarChange}>
                <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-10">
                    <header className="flex flex-wrap items-start justify-between gap-6">
                        <div className="space-y-3">
                            <span className="inline-flex items-center rounded-full border border-[#C5C0FF] bg-[#E9E7FF] px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-[#4534FF] dark:border-[#4E46C8] dark:bg-[#2A1F67] dark:text-[#AEB1FF]">
                                Bookings
                            </span>
                            <div>
                                <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
                                    Production calendar
                                </h1>
                                <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
                                    Visualize every confirmed shoot, pencil-in pending sessions, and keep editing days on the radar without jumping between tools.
                                </p>
                            </div>
                            {feedback ? (
                                <div
                                    className={`max-w-xl rounded-2xl border px-4 py-3 text-sm font-medium shadow-sm ${
                                        feedback.type === 'success'
                                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-100'
                                            : 'border-rose-500/30 bg-rose-500/10 text-rose-800 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-100'
                                    }`}
                                >
                                    {feedback.message}
                                </div>
                            ) : null}
                        </div>
                        <div className="flex flex-col items-end gap-3 sm:flex-row sm:items-center">
                            <button
                                type="button"
                                onClick={refreshBookings}
                                disabled={isSyncing}
                                className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#4DE5FF] disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                            >
                                <SparklesIcon className="h-4 w-4" aria-hidden />
                                {isSyncing ? 'Syncing…' : 'Refresh schedule'}
                            </button>
                            <button
                                type="button"
                                onClick={handleOpenCreate}
                                className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#5D3BFF] via-[#3D7CFF] to-[#4DE5FF] px-5 py-2 text-sm font-semibold text-white shadow-lg transition hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[#4DE5FF] focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900"
                            >
                                <CalendarIcon className="h-4 w-4" aria-hidden />
                                Schedule shoot
                            </button>
                            {guardEnabled ? (
                                <button
                                    type="button"
                                    onClick={signOut}
                                    className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#4DE5FF] dark:border-slate-700 dark:text-slate-300"
                                >
                                    Sign out
                                </button>
                            ) : null}
                            {lastSyncedAt ? (
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Synced {dayjs(lastSyncedAt).format('MMM D, YYYY h:mm A')}
                                </p>
                            ) : null}
                        </div>
                    </header>
                    <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                        <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-lg dark:border-slate-800 dark:bg-slate-900">
                            <div className="flex flex-wrap items-center justify-between gap-4">
                                <div>
                                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Calendar view</h2>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        Toggle month, week, or agenda views to spot production clashes before they happen.
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <LegendDot color="bg-emerald-500">Confirmed</LegendDot>
                                    <LegendDot color="bg-amber-500">Pending</LegendDot>
                                    <LegendDot color="bg-indigo-500">Editing</LegendDot>
                                </div>
                            </div>
                            <div className="crm-calendar h-[720px] rounded-2xl border border-slate-200 bg-white p-3 shadow-inner dark:border-slate-800 dark:bg-slate-950/60">
                                <FullCalendar
                                    ref={calendarRef}
                                    plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
                                    initialView="dayGridMonth"
                                    headerToolbar={{
                                        start: 'prev,next today',
                                        center: 'title',
                                        end: 'dayGridMonth,timeGridWeek,listWeek'
                                    }}
                                    buttonText={{
                                        today: 'Today',
                                        dayGridMonth: 'Month',
                                        timeGridWeek: 'Week',
                                        listWeek: 'Agenda'
                                    }}
                                    height="100%"
                                    events={calendarEvents}
                                    selectable
                                    selectMirror
                                    select={handleSelectSlot}
                                    eventClick={handleSelectEvent}
                                    eventContent={renderEventContent}
                                    eventDidMount={handleEventDidMount}
                                    nowIndicator
                                    dayMaxEventRows={4}
                                    slotDuration="00:30:00"
                                    slotLabelFormat={{ hour: 'numeric', minute: '2-digit', hour12: true }}
                                    eventTimeFormat={{ hour: 'numeric', minute: '2-digit', meridiem: 'short' }}
                                    displayEventTime
                                />
                            </div>
                        </section>
                        <aside className="space-y-6">
                            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg dark:border-slate-800 dark:bg-slate-900">
                                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Upcoming shoots</h2>
                                <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
                                    The next confirmed and pending sessions pull straight from the production calendar.
                                </p>
                                {upcomingShoots.length > 0 ? (
                                    <BookingList bookings={upcomingShoots} />
                                ) : (
                                    <p className="rounded-2xl border border-dashed border-slate-300 bg-white/50 p-6 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400">
                                        Add shoots to the schedule to populate this list.
                                    </p>
                                )}
                            </section>
                        </aside>
                    </div>
                </div>
            </WorkspaceLayout>
            {modalState ? (
                <QuickActionModal
                    type="booking"
                    title={modalState.mode === 'edit' ? 'Edit booking' : 'Schedule new shoot'}
                    subtitle={
                        modalState.mode === 'edit'
                            ? 'Update shoot details and keep the team aligned.'
                            : 'Capture client details, location, and timing in one streamlined form.'
                    }
                    submitLabel={modalState.mode === 'edit' ? 'Save changes' : 'Create booking'}
                    baseFields={modalFields}
                    onClose={handleCloseModal}
                    onSubmit={handleSubmitModal}
                />
            ) : null}
        </>
    );
}

type LegendDotProps = {
    color: string;
    children: React.ReactNode;
};

function LegendDot({ color, children }: LegendDotProps) {
    return (
        <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span className={`h-2.5 w-2.5 rounded-full ${color}`} aria-hidden />
            {children}
        </span>
    );
}

export default function BookingsPage(props: BookingsPageProps) {
    return (
        <CrmAuthGuard
            title="Studio calendar access"
            description="Authenticate with the studio access code to manage private production bookings."
        >
            <BookingCalendarWorkspace {...props} />
        </CrmAuthGuard>
    );
}

export const getStaticProps: GetStaticProps<BookingsPageProps> = async () => {
    const records = await readCmsCollection<RawBookingRecord>('crm-bookings.json');
    const bookings = sortBookings(normalizeBookings(records));

    return {
        props: {
            bookings
        }
    };
};

function normalizeBookings(records: unknown[]): BookingRecord[] {
    return (Array.isArray(records) ? records : [])
        .map((record, index) => normalizeBookingRecord(record, `bk-seed-${index + 1}`, index))
        .filter((booking): booking is BookingRecord => Boolean(booking));
}

function normalizeBookingRecord(
    record: unknown,
    fallbackId: string,
    fallbackIndex: number
): BookingRecord | null {
    if (!isPlainObject(record)) {
        return null;
    }

    const date = parseDateValue(record.date ?? record.shootDate ?? record.scheduledDate);
    if (!date) {
        return null;
    }

    const id = parseOptionalString(record.id) ?? fallbackId ?? `bk-seed-${fallbackIndex + 1}`;
    const client = parseStringValue(record.client, 'New client');
    const shootType = parseStringValue(record.shootType ?? record.shoot_type, 'Session');
    const location = parseStringValue(record.location, 'Studio TBD');
    const status = toBookingStatus(record.status);
    const { startTime, endTime } = extractTimes(record);
    const customFields = parseCustomFields(record.customFields ?? record.custom_fields);

    const booking: BookingRecord = {
        id,
        client,
        shootType,
        date,
        startTime,
        location,
        status
    };

    if (endTime) {
        booking.endTime = endTime;
    }

    if (customFields && Object.keys(customFields).length > 0) {
        booking.customFields = customFields;
    }

    return booking;
}

function parseDateValue(value: unknown): string | null {
    if (typeof value !== 'string') {
        return null;
    }

    const trimmed = value.trim();
    if (!trimmed) {
        return null;
    }

    const parsed = dayjs(trimmed, ['YYYY-MM-DD', 'MM/DD/YYYY', 'MMM D, YYYY', 'MMMM D, YYYY'], true);
    if (parsed.isValid()) {
        return parsed.format('YYYY-MM-DD');
    }

    const fallback = dayjs(trimmed);
    return fallback.isValid() ? fallback.format('YYYY-MM-DD') : null;
}

function parseOptionalString(value: unknown): string | undefined {
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed) {
            return trimmed;
        }
    }

    return undefined;
}

function parseStringValue(value: unknown, fallback: string): string {
    return parseOptionalString(value) ?? fallback;
}

function toBookingStatus(value: unknown): BookingStatus {
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (normalized === 'confirmed') {
            return 'Confirmed';
        }
        if (normalized === 'editing') {
            return 'Editing';
        }
        if (normalized === 'pending') {
            return 'Pending';
        }
    }

    return 'Pending';
}

function extractTimes(record: Record<string, unknown>): { startTime: string; endTime?: string } {
    const startCandidate = formatTimeLabel(record.startTime ?? record.start_time);
    const endCandidate = formatTimeLabel(record.endTime ?? record.end_time);

    if (startCandidate) {
        return {
            startTime: startCandidate,
            endTime: endCandidate
        };
    }

    const timeRange = typeof record.time === 'string' ? record.time.trim() : '';
    if (timeRange) {
        const [startPart, endPart] = splitTimeRange(timeRange);
        const startTime = formatTimeLabel(startPart);
        const endTime = formatTimeLabel(endPart);

        if (startTime) {
            return {
                startTime,
                endTime
            };
        }

        if (endTime) {
            return {
                startTime: '9:00 AM',
                endTime
            };
        }
    }

    return { startTime: '9:00 AM' };
}

function splitTimeRange(value: string): [string | undefined, string | undefined] {
    const parts = value
        .split(/[\u2013\u2014-]/)
        .map((part) => part.trim())
        .filter(Boolean);

    if (parts.length === 0) {
        return [undefined, undefined];
    }

    if (parts.length === 1) {
        return [parts[0], undefined];
    }

    return [parts[0], parts[1]];
}

function formatTimeLabel(value: unknown): string | undefined {
    if (typeof value !== 'string') {
        return undefined;
    }

    const trimmed = value.trim();
    if (!trimmed) {
        return undefined;
    }

    const parsed = dayjs(trimmed, ['HH:mm', 'H:mm', 'h:mm A', 'h:mmA'], true);
    if (parsed.isValid()) {
        return parsed.format('h:mm A');
    }

    const fallback = dayjs(trimmed);
    return fallback.isValid() ? fallback.format('h:mm A') : trimmed;
}

function parseCustomFields(value: unknown): Record<string, string | boolean> | undefined {
    if (!isPlainObject(value)) {
        return undefined;
    }

    const result: Record<string, string | boolean> = {};

    for (const [key, entry] of Object.entries(value)) {
        if (typeof entry === 'boolean') {
            result[key] = entry;
        } else if (typeof entry === 'string') {
            const trimmed = entry.trim();
            if (trimmed) {
                result[key] = trimmed;
            }
        }
    }

    return Object.keys(result).length > 0 ? result : undefined;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function buildBookingPayload(values: QuickActionModalSubmitValues): Record<string, unknown> {
    const client = parseStringValue(values.client, 'New client');
    const shootType = parseStringValue(values.shootType, 'Session');
    const location = parseStringValue(values.location, 'Studio TBD');
    const status = toBookingStatus(values.status);

    const dateValue =
        typeof values.date === 'string' && dayjs(values.date).isValid()
            ? dayjs(values.date).format('YYYY-MM-DD')
            : dayjs().format('YYYY-MM-DD');

    const startTime = formatTimeLabel(values.startTime) ?? '9:00 AM';
    const endTime = formatTimeLabel(values.endTime);

    const payload: Record<string, unknown> = {
        client,
        shootType,
        date: dateValue,
        startTime,
        location,
        status,
        time: endTime ? `${startTime} – ${endTime}` : startTime
    };

    if (endTime) {
        payload.endTime = endTime;
    }

    const customFields = values.customFields ?? {};
    if (customFields && Object.keys(customFields).length > 0) {
        payload.customFields = customFields;
    }

    return payload;
}

function mergeRecordSources(
    base: Record<string, unknown>,
    serverRecord: unknown,
    fallbackId: string
): Record<string, unknown> {
    const merged: Record<string, unknown> = { ...base };

    if (isPlainObject(serverRecord)) {
        Object.assign(merged, serverRecord);
    }

    if (!merged.id) {
        merged.id = fallbackId;
    }

    return merged;
}

function createCalendarEvent(booking: BookingRecord): CalendarEvent {
    const { start, end } = resolveEventTimes(booking);
    const tone = STATUS_COLOR_MAP[booking.status];

    return {
        id: booking.id,
        title: `${booking.client} · ${booking.shootType}`,
        start: start.toDate(),
        end: end.toDate(),
        backgroundColor: tone.background,
        borderColor: tone.border,
        textColor: '#fff',
        display: 'block',
        classNames: ['crm-event', `crm-event--${booking.status.toLowerCase()}`],
        extendedProps: {
            resource: booking,
            status: booking.status,
            location: booking.location
        }
    };
}

function resolveEventTimes(booking: BookingRecord): { start: dayjs.Dayjs; end: dayjs.Dayjs } {
    const start = parseBookingDateTime(booking.date, booking.startTime);
    let end = booking.endTime ? parseBookingDateTime(booking.date, booking.endTime) : start.add(2, 'hour');

    if (!end.isAfter(start)) {
        end = start.add(2, 'hour');
    }

    return { start, end };
}

function parseBookingDateTime(date: string, time: string): dayjs.Dayjs {
    const normalizedTime = formatTimeLabel(time) ?? '9:00 AM';
    const parsed = dayjs(`${date} ${normalizedTime}`, 'YYYY-MM-DD h:mm A', true);

    if (parsed.isValid()) {
        return parsed;
    }

    const fallback = dayjs(`${date} ${normalizedTime}`);
    return fallback.isValid() ? fallback : dayjs(date).startOf('day');
}

function toTimeInputValue(value: string | undefined): string {
    if (!value) {
        return '';
    }

    const parsed = dayjs(value, ['h:mm A', 'HH:mm', 'H:mm'], true);
    if (parsed.isValid()) {
        return parsed.format('HH:mm');
    }

    const fallback = dayjs(value);
    return fallback.isValid() ? fallback.format('HH:mm') : '';
}

function sortBookings(records: BookingRecord[]): BookingRecord[] {
    return [...records].sort((first, second) => {
        const firstTime = resolveEventTimes(first).start.valueOf();
        const secondTime = resolveEventTimes(second).start.valueOf();
        return firstTime - secondTime;
    });
}

function buildUpcomingList(records: BookingRecord[]): BookingRecord[] {
    const today = dayjs().startOf('day');
    return sortBookings(records)
        .filter((booking) => {
            const bookingDate = dayjs(booking.date);
            return bookingDate.isSame(today, 'day') || bookingDate.isAfter(today);
        })
        .slice(0, 5);
}
