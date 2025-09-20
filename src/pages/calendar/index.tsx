import * as React from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import * as Dialog from '@radix-ui/react-dialog';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import timeGridPlugin from '@fullcalendar/timegrid';

import { CrmAuthGuard, WorkspaceLayout } from '../../components/crm';
import { useNetlifyIdentity } from '../../components/auth';
import { useAutoDismiss } from '../../utils/use-auto-dismiss';
import { getSupabaseBrowserClient } from '../../lib/supabase-browser';
import type { CalendarEventRecord } from '../../types/calendar';
import { calendarVisibilitySchema } from '../../lib/calendar-schemas';

const FullCalendar = dynamic(async () => {
    const mod = await import('@fullcalendar/react');
    return mod.default;
}, { ssr: false });

type CalendarUser = { id: string; name: string };

type DrawerMode = 'create' | 'edit';

type EventFormSchema = z.infer<typeof eventFormSchema>;

type DrawerState = {
    open: boolean;
    mode: DrawerMode;
    eventId: string | null;
    canEdit: boolean;
    initialValues: EventFormSchema;
};

const FILTER_STORAGE_PREFIX = 'crm-calendar-active-users';
const DEFAULT_VISIBILITY: 'team' | 'private' = 'team';

function pad(value: number): string {
    return value.toString().padStart(2, '0');
}

function formatDateTimeLocal(date: Date): string {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDateLocal(date: Date): string {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseInputToDate(value: string, allDay: boolean): Date | null {
    if (!value) {
        return null;
    }

    if (allDay) {
        const [year, month, day] = value.split('-').map((part) => Number.parseInt(part, 10));
        if (!year || !month || !day) {
            return null;
        }

        return new Date(year, month - 1, day, 0, 0, 0, 0);
    }

    const [datePart, timePart] = value.split('T');
    if (!datePart || !timePart) {
        return null;
    }

    const [year, month, day] = datePart.split('-').map((part) => Number.parseInt(part, 10));
    const [hours, minutes] = timePart.split(':').map((part) => Number.parseInt(part, 10));

    if (!year || !month || !day || Number.isNaN(hours) || Number.isNaN(minutes)) {
        return null;
    }

    return new Date(year, month - 1, day, hours, minutes, 0, 0);
}

function startOfDay(date: Date): Date {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
}

function endOfDay(date: Date): Date {
    const result = startOfDay(date);
    result.setDate(result.getDate() + 1);
    return result;
}

function subtractOneDay(date: Date): Date {
    const result = new Date(date);
    result.setDate(result.getDate() - 1);
    return result;
}

function generateUserHue(userId: string): number {
    let hash = 0;
    for (let index = 0; index < userId.length; index += 1) {
        hash = (hash * 31 + userId.charCodeAt(index)) % 360;
    }

    return (hash + 360) % 360;
}

function createEventColors(userId: string) {
    const hue = generateUserHue(userId);
    return {
        borderColor: `hsl(${hue} 80% 55%)`,
        backgroundColor: `hsl(${hue} 85% 45% / 0.25)`,
        textColor: '#f8fafc'
    };
}

function mapResponseEvent(record: Record<string, any>): CalendarEventRecord {
    return {
        id: record.id,
        ownerUserId: record.owner_user_id,
        title: record.title,
        description: record.description ?? null,
        startAt: record.start_at,
        endAt: record.end_at,
        allDay: Boolean(record.all_day),
        visibility: record.visibility ?? DEFAULT_VISIBILITY,
        createdAt: record.created_at ?? null,
        updatedAt: record.updated_at ?? null
    };
}

function buildFilterStorageKey(userId: string | null): string {
    return userId ? `${FILTER_STORAGE_PREFIX}:${userId}` : FILTER_STORAGE_PREFIX;
}

function loadStoredFilters(userId: string | null): string[] | null {
    if (typeof window === 'undefined') {
        return null;
    }

    const raw = window.localStorage.getItem(buildFilterStorageKey(userId));
    if (!raw) {
        return null;
    }

    const ids = raw.split(',').map((value) => value.trim()).filter(Boolean);
    return ids.length > 0 ? ids : null;
}

function persistFilters(userId: string | null, ids: string[]) {
    if (typeof window === 'undefined') {
        return;
    }

    window.localStorage.setItem(buildFilterStorageKey(userId), ids.join(','));
}

const eventFormSchema = z
    .object({
        title: z.string().min(1, 'Title is required.'),
        description: z.string().optional(),
        start_at: z.string().min(1, 'Start time is required.'),
        end_at: z.string().min(1, 'End time is required.'),
        all_day: z.boolean(),
        owner_user_id: z.string().min(1, 'Select an event owner.'),
        visibility: calendarVisibilitySchema
    })
    .superRefine((data, ctx) => {
        const startDate = parseInputToDate(data.start_at, data.all_day);
        const endDate = parseInputToDate(data.end_at, data.all_day);

        if (!startDate) {
            ctx.addIssue({ path: ['start_at'], code: 'custom', message: 'Provide a valid start date.' });
        }

        if (!endDate) {
            ctx.addIssue({ path: ['end_at'], code: 'custom', message: 'Provide a valid end date.' });
        }

        if (!startDate || !endDate) {
            return;
        }

        const normalizedStart = data.all_day ? startOfDay(startDate) : startDate;
        const normalizedEnd = data.all_day ? startOfDay(endDate) : endDate;

        if (data.all_day) {
            if (normalizedEnd < normalizedStart) {
                ctx.addIssue({ path: ['end_at'], code: 'custom', message: 'End date cannot be before the start date.' });
            }
        } else if (normalizedEnd <= normalizedStart) {
            ctx.addIssue({ path: ['end_at'], code: 'custom', message: 'End time must be after the start time.' });
        }
    });

function toFullCalendarEvent(record: CalendarEventRecord, user: CalendarUser | undefined) {
    const colors = createEventColors(record.ownerUserId);

    return {
        id: record.id,
        title: record.title,
        start: record.startAt,
        end: record.endAt,
        allDay: record.allDay,
        backgroundColor: colors.backgroundColor,
        borderColor: colors.borderColor,
        textColor: colors.textColor,
        extendedProps: {
            description: record.description ?? undefined,
            ownerName: user?.name ?? 'Unassigned',
            ownerUserId: record.ownerUserId,
            visibility: record.visibility
        }
    };
}

function toFormValues(record: CalendarEventRecord, fallbackOwnerId: string): EventFormSchema {
    const startDate = new Date(record.startAt);
    const endDate = new Date(record.endAt);
    const endForDisplay = record.allDay ? subtractOneDay(endDate) : endDate;

    return {
        title: record.title,
        description: record.description ?? '',
        start_at: record.allDay ? formatDateLocal(startDate) : formatDateTimeLocal(startDate),
        end_at: record.allDay ? formatDateLocal(endForDisplay) : formatDateTimeLocal(endForDisplay),
        all_day: record.allDay,
        owner_user_id: record.ownerUserId ?? fallbackOwnerId,
        visibility: record.visibility ?? DEFAULT_VISIBILITY
    };
}

function getDefaultEventValues(ownerId: string | null, baseDate: Date | null = null): EventFormSchema {
    const start = baseDate ? new Date(baseDate) : new Date();
    start.setMinutes(0, 0, 0);
    const end = new Date(start.getTime() + 60 * 60 * 1000);

    return {
        title: '',
        description: '',
        start_at: formatDateTimeLocal(start),
        end_at: formatDateTimeLocal(end),
        all_day: false,
        owner_user_id: ownerId ?? '',
        visibility: DEFAULT_VISIBILITY
    };
}

function buildPayload(values: EventFormSchema) {
    const startDate = parseInputToDate(values.start_at, values.all_day);
    const endDate = parseInputToDate(values.end_at, values.all_day);

    if (!startDate || !endDate) {
        throw new Error('Provide valid start and end times.');
    }

    if (values.all_day) {
        return {
            title: values.title.trim(),
            description: values.description?.trim() ?? '',
            start_at: startOfDay(startDate).toISOString(),
            end_at: endOfDay(endDate).toISOString(),
            all_day: true,
            owner_user_id: values.owner_user_id,
            visibility: values.visibility
        };
    }

    return {
        title: values.title.trim(),
        description: values.description?.trim() ?? '',
        start_at: startDate.toISOString(),
        end_at: endDate.toISOString(),
        all_day: false,
        owner_user_id: values.owner_user_id,
        visibility: values.visibility
    };
}

function CalendarEventDrawer({
    open,
    mode,
    canEdit,
    isSubmitting,
    isDeleting,
    onClose,
    onSubmit,
    onDelete,
    users,
    initialValues
}: {
    open: boolean;
    mode: DrawerMode;
    canEdit: boolean;
    isSubmitting: boolean;
    isDeleting: boolean;
    onClose: () => void;
    onSubmit: (values: EventFormSchema) => Promise<void>;
    onDelete?: () => Promise<void>;
    users: CalendarUser[];
    initialValues: EventFormSchema;
}) {
    const form = useForm<EventFormSchema>({
        resolver: zodResolver(eventFormSchema),
        defaultValues: initialValues
    });

    const { register, handleSubmit, reset, watch, formState, setValue } = form;
    const allDay = watch('all_day');
    const startValue = watch('start_at');
    const endValue = watch('end_at');

    React.useEffect(() => {
        if (open) {
            reset(initialValues);
        }
    }, [initialValues, open, reset]);

    React.useEffect(() => {
        if (!open) {
            return;
        }

        if (allDay) {
            if (startValue && startValue.includes('T')) {
                setValue('start_at', startValue.split('T')[0]);
            }

            if (endValue && endValue.includes('T')) {
                setValue('end_at', endValue.split('T')[0]);
            }
        } else {
            if (startValue && !startValue.includes('T')) {
                setValue('start_at', `${startValue}T09:00`);
            }

            if (endValue && !endValue.includes('T')) {
                setValue('end_at', `${endValue}T10:00`);
            }
        }
    }, [allDay, endValue, open, setValue, startValue]);

    const submitHandler = React.useCallback(
        async (values: EventFormSchema) => {
            if (!canEdit) {
                return;
            }

            await onSubmit(values);
        },
        [canEdit, onSubmit]
    );

    const handleDelete = React.useCallback(async () => {
        if (onDelete) {
            await onDelete();
        }
    }, [onDelete]);

    const disabled = !canEdit || isSubmitting || isDeleting;

    return (
        <Dialog.Root open={open} onOpenChange={(value) => (!value ? onClose() : undefined)}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-slate-950/60 backdrop-blur" />
                <Dialog.Content className="fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-y-auto border-l border-slate-800/80 bg-slate-950/95 p-6 text-slate-100 shadow-2xl">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <Dialog.Title className="text-xl font-semibold text-white">
                                {mode === 'create' ? 'Add calendar event' : canEdit ? 'Edit calendar event' : 'View calendar event'}
                            </Dialog.Title>
                            <Dialog.Description className="text-sm text-slate-400">
                                Keep the team aligned by sharing shoots, milestones, and meetings.
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
                                    d="M5.22 5.22a.75.75 0 0 1 1.06 0L10 8.94l3.72-3.72a.75.75 0 1 1 1.06 1.06L11.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06L10 11.06l-3.72 3.72a.75.75 0 0 1-1.06-1.06L8.94 10 5.22 6.28a.75.75 0 0 1 0-1.06Z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        </button>
                    </div>

                    <form className="mt-6 space-y-5" onSubmit={handleSubmit(submitHandler)}>
                        <div>
                            <label htmlFor="title" className="block text-sm font-semibold text-slate-200">
                                Title
                            </label>
                            <input
                                id="title"
                                type="text"
                                autoComplete="off"
                                {...register('title')}
                                disabled={disabled}
                                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-[#4DE5FF] focus:ring-2 focus:ring-[#4DE5FF]/60 disabled:cursor-not-allowed disabled:opacity-60"
                                placeholder="Editorial shoot"
                            />
                            {formState.errors.title ? (
                                <p className="mt-2 text-xs text-red-300">{formState.errors.title.message}</p>
                            ) : null}
                        </div>

                        <div>
                            <label htmlFor="description" className="block text-sm font-semibold text-slate-200">
                                Description
                            </label>
                            <textarea
                                id="description"
                                rows={3}
                                {...register('description')}
                                disabled={disabled}
                                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-[#4DE5FF] focus:ring-2 focus:ring-[#4DE5FF]/60 disabled:cursor-not-allowed disabled:opacity-60"
                                placeholder="Production notes, crew reminders, or location details"
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label htmlFor="start_at" className="block text-sm font-semibold text-slate-200">
                                    Start
                                </label>
                                <input
                                    id="start_at"
                                    type={allDay ? 'date' : 'datetime-local'}
                                    {...register('start_at')}
                                    disabled={disabled}
                                    className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-[#4DE5FF] focus:ring-2 focus:ring-[#4DE5FF]/60 disabled:cursor-not-allowed disabled:opacity-60"
                                />
                                {formState.errors.start_at ? (
                                    <p className="mt-2 text-xs text-red-300">{formState.errors.start_at.message}</p>
                                ) : null}
                            </div>
                            <div>
                                <label htmlFor="end_at" className="block text-sm font-semibold text-slate-200">
                                    End
                                </label>
                                <input
                                    id="end_at"
                                    type={allDay ? 'date' : 'datetime-local'}
                                    {...register('end_at')}
                                    disabled={disabled}
                                    className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-[#4DE5FF] focus:ring-2 focus:ring-[#4DE5FF]/60 disabled:cursor-not-allowed disabled:opacity-60"
                                />
                                {formState.errors.end_at ? (
                                    <p className="mt-2 text-xs text-red-300">{formState.errors.end_at.message}</p>
                                ) : null}
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-4">
                            <label className="inline-flex items-center gap-3 text-sm font-semibold text-slate-200">
                                <input
                                    type="checkbox"
                                    {...register('all_day')}
                                    disabled={disabled}
                                    className="h-4 w-4 rounded border border-slate-600 bg-slate-900 text-[#4DE5FF] focus:ring-[#4DE5FF] disabled:cursor-not-allowed"
                                />
                                All-day
                            </label>
                            <div className="flex flex-1 items-center justify-end gap-3 text-xs text-slate-400">
                                {mode === 'edit' && !canEdit ? (
                                    <span>This event belongs to a teammate.</span>
                                ) : null}
                            </div>
                        </div>

                        <div>
                            <label htmlFor="owner_user_id" className="block text-sm font-semibold text-slate-200">
                                Owner
                            </label>
                            <select
                                id="owner_user_id"
                                {...register('owner_user_id')}
                                disabled={disabled || users.length <= 1}
                                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-[#4DE5FF] focus:ring-2 focus:ring-[#4DE5FF]/60 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {users.map((user) => (
                                    <option key={user.id} value={user.id}>
                                        {user.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label htmlFor="visibility" className="block text-sm font-semibold text-slate-200">
                                Visibility
                            </label>
                            <select
                                id="visibility"
                                {...register('visibility')}
                                disabled={disabled}
                                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-[#4DE5FF] focus:ring-2 focus:ring-[#4DE5FF]/60 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <option value="team">Team</option>
                                <option value="private">Private</option>
                            </select>
                        </div>

                        <div className="flex items-center justify-between gap-3">
                            <button
                                type="submit"
                                disabled={disabled}
                                className="inline-flex items-center justify-center rounded-xl bg-[#4DE5FF] px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-[#86f0ff] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {mode === 'create' ? (isSubmitting ? 'Creating…' : 'Create event') : isSubmitting ? 'Saving…' : 'Save changes'}
                            </button>
                            {mode === 'edit' && canEdit && onDelete ? (
                                <button
                                    type="button"
                                    onClick={() => void handleDelete()}
                                    disabled={isDeleting}
                                    className="inline-flex items-center justify-center rounded-xl border border-red-500/60 px-4 py-3 text-sm font-semibold text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {isDeleting ? 'Deleting…' : 'Delete'}
                                </button>
                            ) : null}
                        </div>
                    </form>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}

function useCalendarEventUpdater() {
    const updater = React.useCallback((events: CalendarEventRecord[], next: CalendarEventRecord) => {
        const exists = events.some((event) => event.id === next.id);
        if (exists) {
            return events.map((event) => (event.id === next.id ? next : event));
        }

        return [...events, next];
    }, []);

    return updater;
}

function CalendarWorkspace() {
    const identity = useNetlifyIdentity();
    const supabase = React.useMemo(() => getSupabaseBrowserClient(), []);
    const calendarRef = React.useRef<any>(null);
    const rangeRef = React.useRef<{ from: string; to: string } | null>(null);
    const activeUsersKeyRef = React.useRef<string>('');

    const [users, setUsers] = React.useState<CalendarUser[]>([]);
    const [events, setEvents] = React.useState<CalendarEventRecord[]>([]);
    const [activeUserIds, setActiveUserIds] = React.useState<string[]>([]);
    const [currentView, setCurrentView] = React.useState<string>('dayGridMonth');
    const [isLoadingUsers, setIsLoadingUsers] = React.useState(false);
    const [isLoadingEvents, setIsLoadingEvents] = React.useState(false);
    const [drawerState, setDrawerState] = React.useState<DrawerState>({
        open: false,
        mode: 'create',
        eventId: null,
        canEdit: true,
        initialValues: getDefaultEventValues(identity.user?.id ?? null)
    });
    const [formMessage, setFormMessage] = React.useState<string | null>(null);
    const [calendarError, setCalendarError] = React.useState<string | null>(null);
    const [toastMessage, setToastMessage] = React.useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [isDeleting, setIsDeleting] = React.useState(false);

    useAutoDismiss(toastMessage, () => setToastMessage(null));

    const upsertEvent = useCalendarEventUpdater();

    const isAdmin = identity.isAdmin;
    const currentUserId = identity.user?.id ?? null;

    const closeDrawer = React.useCallback(() => {
        setDrawerState((previous) => ({ ...previous, open: false }));
        setFormMessage(null);
    }, []);

    const loadUsers = React.useCallback(async () => {
        if (!identity.isAuthenticated) {
            return;
        }

        setIsLoadingUsers(true);
        try {
            const response = await fetch('/api/calendar/users', { credentials: 'include' });
            const payload = await response.json().catch(() => null);

            if (!response.ok) {
                const message = payload?.error ?? 'Unable to load users.';
                throw new Error(message);
            }

            const fetchedUsers: CalendarUser[] = Array.isArray(payload?.users)
                ? payload.users.map((user: any) => ({ id: user.id, name: user.name }))
                : [];

            setUsers(fetchedUsers);

            const stored = loadStoredFilters(currentUserId);
            if (stored) {
                setActiveUserIds(stored);
                activeUsersKeyRef.current = stored.slice().sort().join(',');
            } else {
                const defaultIds = fetchedUsers.map((user) => user.id);
                setActiveUserIds(defaultIds);
                activeUsersKeyRef.current = defaultIds.slice().sort().join(',');
            }
        } catch (error) {
            console.error('Failed to load calendar users', error);
            setCalendarError(error instanceof Error ? error.message : 'Unable to load users.');
        } finally {
            setIsLoadingUsers(false);
        }
    }, [currentUserId, identity.isAuthenticated]);

    const fetchEvents = React.useCallback(async () => {
        if (!identity.isAuthenticated || !rangeRef.current) {
            return;
        }

        setIsLoadingEvents(true);
        setCalendarError(null);

        try {
            if (!activeUsersKeyRef.current) {
                setEvents([]);
                return;
            }

            const params = new URLSearchParams({
                from: rangeRef.current.from,
                to: rangeRef.current.to
            });

            if (activeUsersKeyRef.current) {
                params.set('userIds', activeUsersKeyRef.current);
            }

            const response = await fetch(`/api/calendar/events?${params.toString()}`, { credentials: 'include' });
            const payload = await response.json().catch(() => null);

            if (!response.ok) {
                const message = payload?.error ?? 'Unable to load events.';
                throw new Error(message);
            }

            const fetchedEvents: CalendarEventRecord[] = Array.isArray(payload?.events)
                ? payload.events.map((record: Record<string, any>) => mapResponseEvent(record))
                : [];

            setEvents(fetchedEvents);
        } catch (error) {
            console.error('Failed to load calendar events', error);
            setCalendarError(error instanceof Error ? error.message : 'Unable to load events.');
        } finally {
            setIsLoadingEvents(false);
        }
    }, [identity.isAuthenticated]);

    React.useEffect(() => {
        if (!identity.isReady || !identity.isAuthenticated) {
            return;
        }

        void loadUsers();
    }, [identity.isAuthenticated, identity.isReady, loadUsers]);

    React.useEffect(() => {
        if (!identity.isAuthenticated || !rangeRef.current) {
            return;
        }

        void fetchEvents();
    }, [identity.isAuthenticated, fetchEvents]);

    React.useEffect(() => {
        if (!identity.isAuthenticated) {
            return;
        }

        activeUsersKeyRef.current = activeUserIds.slice().sort().join(',');
        persistFilters(currentUserId, activeUserIds);

        if (rangeRef.current) {
            void fetchEvents();
        }
    }, [activeUserIds, currentUserId, fetchEvents, identity.isAuthenticated]);

    React.useEffect(() => {
        const channel = supabase
            .channel('calendar-events')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'calendar_events' },
                () => {
                    if (rangeRef.current && identity.isAuthenticated) {
                        void fetchEvents();
                    }
                }
            )
            .subscribe();

        return () => {
            void supabase.removeChannel(channel);
        };
    }, [fetchEvents, identity.isAuthenticated, supabase]);

    const calendarUsersMap = React.useMemo(() => {
        return new Map(users.map((user) => [user.id, user] as const));
    }, [users]);

    const calendarEvents = React.useMemo(() => {
        return events.map((event) => toFullCalendarEvent(event, calendarUsersMap.get(event.ownerUserId)));
    }, [calendarUsersMap, events]);

    const openCreateDrawer = React.useCallback(
        (baseDate: Date | null = null, initial?: Partial<EventFormSchema>) => {
            const ownerId = currentUserId ?? users[0]?.id ?? '';
            const defaults = {
                ...getDefaultEventValues(ownerId, baseDate),
                ...(initial ?? {})
            };

            setDrawerState({ open: true, mode: 'create', eventId: null, canEdit: true, initialValues: defaults });
            setFormMessage(null);
        },
        [currentUserId, users]
    );

    const handleDatesSet = React.useCallback(
        (arg: any) => {
            rangeRef.current = { from: arg.startStr, to: arg.endStr };
            setCurrentView(arg.view?.type ?? 'dayGridMonth');
            if (identity.isAuthenticated) {
                void fetchEvents();
            }
        },
        [fetchEvents, identity.isAuthenticated]
    );

    const handleSelect = React.useCallback(
        (info: any) => {
            const selectionStart: Date | null = info.start ? new Date(info.start) : null;
            const selectionEnd: Date | null = info.end ? new Date(info.end) : null;

            const startDefault = selectionStart ?? new Date();
            const endDefault = selectionEnd ?? new Date(startDefault.getTime() + 60 * 60 * 1000);

            const initialValues: Partial<EventFormSchema> = {
                start_at: info.allDay ? formatDateLocal(startDefault) : formatDateTimeLocal(startDefault),
                end_at: info.allDay ? formatDateLocal(subtractOneDay(endDefault)) : formatDateTimeLocal(endDefault),
                all_day: info.allDay
            };

            openCreateDrawer(startDefault, initialValues);
        },
        [openCreateDrawer]
    );

    const handleEventClick = React.useCallback(
        (arg: any) => {
            const eventId = arg.event?.id;
            if (!eventId) {
                return;
            }

            const record = events.find((event) => event.id === eventId);
            if (!record) {
                return;
            }

            const canEdit = isAdmin || record.ownerUserId === currentUserId;
            const fallbackOwnerId = record.ownerUserId ?? currentUserId ?? '';

            setDrawerState({
                open: true,
                mode: 'edit',
                eventId,
                canEdit,
                initialValues: toFormValues(record, fallbackOwnerId)
            });
            setFormMessage(null);
        },
        [currentUserId, events, isAdmin]
    );

    const handleEventTimingUpdate = React.useCallback(
        async (info: any) => {
            const eventId = info.event?.id;
            const start = info.event?.start ? new Date(info.event.start) : null;
            const end = info.event?.end ? new Date(info.event.end) : null;
            const allDay = Boolean(info.event?.allDay);

            if (!eventId || !start || !end) {
                info.revert();
                return;
            }

            const record = events.find((event) => event.id === eventId);
            if (!record) {
                info.revert();
                return;
            }

            if (!isAdmin && record.ownerUserId !== currentUserId) {
                setFormMessage('You can only adjust events you own.');
                info.revert();
                return;
            }

            try {
                const response = await fetch(`/api/calendar/events/${eventId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        start_at: start.toISOString(),
                        end_at: end.toISOString(),
                        all_day: allDay
                    })
                });

                const payload = await response.json().catch(() => null);

                if (!response.ok) {
                    const message = payload?.error ?? 'Unable to update event.';
                    throw new Error(message);
                }

                const updated = mapResponseEvent(payload.event);
                setEvents((previous) => upsertEvent(previous, updated));
                setToastMessage('Event updated.');
            } catch (error) {
                console.error('Failed to update event timing', error);
                setFormMessage(error instanceof Error ? error.message : 'Unable to update event.');
                info.revert();
            }
        },
        [currentUserId, events, isAdmin, upsertEvent]
    );

    const handleCreate = React.useCallback(
        async (values: EventFormSchema) => {
            setIsSubmitting(true);
            setFormMessage(null);

            try {
                const payload = buildPayload(values);
                const response = await fetch('/api/calendar/events', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(payload)
                });

                const json = await response.json().catch(() => null);

                if (!response.ok) {
                    const message = json?.error ?? 'Unable to create event.';
                    throw new Error(message);
                }

                const created = mapResponseEvent(json.event);
                setEvents((previous) => upsertEvent(previous, created));
                setToastMessage('Event added to the calendar.');
                closeDrawer();
            } catch (error) {
                console.error('Failed to create event', error);
                setFormMessage(error instanceof Error ? error.message : 'Unable to create event.');
            } finally {
                setIsSubmitting(false);
            }
        },
        [closeDrawer, upsertEvent]
    );

    const handleUpdate = React.useCallback(
        async (values: EventFormSchema, eventId: string) => {
            setIsSubmitting(true);
            setFormMessage(null);

            try {
                const payload = buildPayload(values);
                const response = await fetch(`/api/calendar/events/${eventId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(payload)
                });

                const json = await response.json().catch(() => null);

                if (!response.ok) {
                    const message = json?.error ?? 'Unable to update event.';
                    throw new Error(message);
                }

                const updated = mapResponseEvent(json.event);
                setEvents((previous) => upsertEvent(previous, updated));
                setToastMessage('Event updated.');
                closeDrawer();
            } catch (error) {
                console.error('Failed to update event', error);
                setFormMessage(error instanceof Error ? error.message : 'Unable to update event.');
            } finally {
                setIsSubmitting(false);
            }
        },
        [closeDrawer, upsertEvent]
    );

    const handleDelete = React.useCallback(
        async (eventId: string) => {
            setIsDeleting(true);
            setFormMessage(null);

            try {
                const response = await fetch(`/api/calendar/events/${eventId}`, {
                    method: 'DELETE',
                    credentials: 'include'
                });

                if (!response.ok && response.status !== 204) {
                    const payload = await response.json().catch(() => null);
                    const message = payload?.error ?? 'Unable to delete event.';
                    throw new Error(message);
                }

                setEvents((previous) => previous.filter((event) => event.id !== eventId));
                setToastMessage('Event removed.');
                closeDrawer();
            } catch (error) {
                console.error('Failed to delete event', error);
                setFormMessage(error instanceof Error ? error.message : 'Unable to delete event.');
            } finally {
                setIsDeleting(false);
            }
        },
        [closeDrawer]
    );

    const toggleUser = React.useCallback((userId: string) => {
        setActiveUserIds((previous) => {
            const set = new Set(previous);
            if (set.has(userId)) {
                set.delete(userId);
            } else {
                set.add(userId);
            }

            return Array.from(set);
        });
    }, []);

    const goToToday = React.useCallback(() => {
        calendarRef.current?.getApi()?.today();
    }, []);

    const goToPrev = React.useCallback(() => {
        calendarRef.current?.getApi()?.prev();
    }, []);

    const goToNext = React.useCallback(() => {
        calendarRef.current?.getApi()?.next();
    }, []);

    const changeView = React.useCallback((view: string) => {
        calendarRef.current?.getApi()?.changeView(view);
    }, []);

    const drawerSubmit = React.useCallback(
        async (values: EventFormSchema) => {
            if (drawerState.mode === 'create' || !drawerState.eventId) {
                await handleCreate(values);
            } else {
                await handleUpdate(values, drawerState.eventId);
            }
        },
        [drawerState.eventId, drawerState.mode, handleCreate, handleUpdate]
    );

    const drawerDelete = React.useCallback(() => {
        if (!drawerState.eventId) {
            return Promise.resolve();
        }

        return handleDelete(drawerState.eventId);
    }, [drawerState.eventId, handleDelete]);

    const isLoaded = identity.isReady && identity.isAuthenticated;

    return (
        <WorkspaceLayout>
            <div className="w-full max-w-[1400px] px-4 pb-10 pt-6">
                <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-semibold text-white">Studio calendar</h1>
                        <p className="mt-1 text-sm text-slate-400">
                            Coordinate your studio schedule, production milestones, and internal meetings.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => openCreateDrawer()}
                        className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#4DE5FF] via-cyan-400 to-sky-500 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/30 transition hover:from-cyan-300 hover:via-sky-400 hover:to-sky-500"
                    >
                        Add event
                    </button>
                </header>

                <div className="sticky top-4 z-20 -mx-4 mb-5 rounded-2xl border border-slate-800/80 bg-slate-950/80 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-slate-950/60 sm:top-6">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={goToPrev}
                                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-700/80 bg-slate-900/80 text-slate-200 transition hover:border-slate-500 hover:text-white"
                                aria-label="Previous"
                            >
                                ‹
                            </button>
                            <button
                                type="button"
                                onClick={goToToday}
                                className="flex h-9 items-center justify-center rounded-full border border-slate-700/80 bg-slate-900/80 px-4 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-slate-500 hover:text-white"
                            >
                                Today
                            </button>
                            <button
                                type="button"
                                onClick={goToNext}
                                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-700/80 bg-slate-900/80 text-slate-200 transition hover:border-slate-500 hover:text-white"
                                aria-label="Next"
                            >
                                ›
                            </button>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            {[
                                { id: 'dayGridMonth', label: 'Month' },
                                { id: 'timeGridWeek', label: 'Week' },
                                { id: 'timeGridDay', label: 'Day' },
                                { id: 'listWeek', label: 'List' }
                            ].map((view) => (
                                <button
                                    key={view.id}
                                    type="button"
                                    onClick={() => changeView(view.id)}
                                    className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                                        currentView === view.id
                                            ? 'bg-[#4DE5FF]/20 text-[#4DE5FF]'
                                            : 'border border-transparent text-slate-300 hover:border-[#4DE5FF]/40 hover:text-white'
                                    }`}
                                >
                                    {view.label}
                                </button>
                            ))}
                        </div>

                        <div className="flex flex-1 items-center justify-end">
                            <div className="flex w-full gap-2 overflow-x-auto rounded-full border border-slate-800/70 bg-slate-950/70 p-1 text-xs text-slate-200">
                                {users.map((user) => {
                                    const isActive = activeUserIds.includes(user.id);
                                    return (
                                        <button
                                            key={user.id}
                                            type="button"
                                            onClick={() => toggleUser(user.id)}
                                            className={`whitespace-nowrap rounded-full px-3 py-1 transition ${
                                                isActive
                                                    ? 'bg-[#4DE5FF]/20 text-[#4DE5FF]'
                                                    : 'text-slate-300 hover:text-white'
                                            }`}
                                        >
                                            {user.name}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {toastMessage ? (
                    <div className="mb-4 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                        {toastMessage}
                    </div>
                ) : null}

                {formMessage ? (
                    <div className="mb-4 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                        {formMessage}
                    </div>
                ) : null}

                {calendarError ? (
                    <div className="mb-4 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                        {calendarError}
                    </div>
                ) : null}

                <div className="relative rounded-3xl border border-slate-800/80 bg-slate-950/60 shadow-inner">
                    <FullCalendar
                        ref={calendarRef}
                        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
                        headerToolbar={false}
                        initialView="dayGridMonth"
                        events={calendarEvents}
                        selectable
                        selectMirror
                        select={handleSelect}
                        eventClick={handleEventClick}
                        eventDrop={handleEventTimingUpdate}
                        eventResize={handleEventTimingUpdate}
                        datesSet={handleDatesSet}
                        height="100%"
                        contentHeight="auto"
                        expandRows
                        nowIndicator
                        weekNumbers={false}
                        slotMinTime="06:00:00"
                        slotMaxTime="22:00:00"
                        dayMaxEventRows
                    />
                    {isLoadingEvents ? (
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-3xl bg-slate-950/60 text-sm text-slate-200">
                            Loading events…
                        </div>
                    ) : null}
                </div>

                {!isLoaded ? (
                    <p className="mt-6 text-sm text-slate-400">Preparing your workspace…</p>
                ) : null}
            </div>

            <CalendarEventDrawer
                open={drawerState.open}
                mode={drawerState.mode}
                canEdit={drawerState.canEdit}
                isSubmitting={isSubmitting}
                isDeleting={isDeleting}
                onClose={closeDrawer}
                onSubmit={drawerSubmit}
                onDelete={drawerState.mode === 'edit' ? drawerDelete : undefined}
                users={users}
                initialValues={drawerState.initialValues}
            />
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

