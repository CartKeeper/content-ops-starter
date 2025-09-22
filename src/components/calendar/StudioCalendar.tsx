'use client';

import dynamic from 'next/dynamic';
import * as React from 'react';
import useSWR from 'swr';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import timeGridPlugin from '@fullcalendar/timegrid';

import { Button } from '../ui/button';
import { AssignTaskDialog } from './AssignTaskDialog';
import { EventDialog, type ClientOption, type EventDialogMode } from './EventDialog';
import {
    DEFAULT_TIME_ZONE,
    type CalendarEvent,
    type CalendarEventPayload,
    createCalendarEvent,
    deleteCalendarEvent,
    fetchCalendarEvents,
    updateCalendarEvent
} from '../../lib/supabase/calendar';
import { getSupabaseBrowserClient, isSupabaseBrowserConfigured } from '../../lib/supabase-browser';

const FullCalendar = dynamic(async () => {
    const module = await import('@fullcalendar/react');
    return module.default;
}, { ssr: false });

type ToastState = {
    id: number;
    message: string;
    variant: 'success' | 'error';
};

type VisibleRange = {
    start: string;
    end: string;
};

type CurrentUserRecord = {
    id: string;
    name: string | null;
    email: string | null;
    role: string | null;
    roles: string[] | null;
};

type CalendarPageSectionProps = {
    actions?: React.ReactNode;
    children: React.ReactNode;
};

function CalendarPageSection({ actions, children }: CalendarPageSectionProps) {
    return (
        <div className="container py-4">
            <div className="mb-4 rounded-4 border bg-white p-4 shadow-sm">
                <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
                    <div>
                        <h1 className="h4 mb-1">Studio calendar</h1>
                        <p className="text-secondary mb-0">Manage bookings, hold dates, and coordinate your team.</p>
                    </div>
                    {actions ? <div className="d-flex flex-wrap align-items-center gap-2">{actions}</div> : null}
                </div>
                {children}
            </div>
        </div>
    );
}

async function fetchClients(): Promise<ClientOption[]> {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase.from('clients').select('id, name').order('name', { ascending: true });
    if (error) {
        throw error;
    }
    return (data ?? []).map((row) => ({
        id: row.id,
        name: typeof row.name === 'string' && row.name.length > 0 ? row.name : 'Unnamed client'
    }));
}

function Toast({ toast }: { toast: ToastState | null }) {
    if (!toast) {
        return null;
    }

    const toneClass =
        toast.variant === 'success'
            ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-100'
            : 'border-rose-400/40 bg-rose-500/15 text-rose-100';

    return (
        <div className="pointer-events-none fixed bottom-6 right-6 z-50">
            <div className={`pointer-events-auto rounded-2xl border px-4 py-3 text-sm shadow-lg ${toneClass}`}>{toast.message}</div>
        </div>
    );
}

function mapPayloadToOptimisticEvent(
    payload: CalendarEventPayload,
    base: Partial<CalendarEvent> & { id: string }
): CalendarEvent {
    return {
        id: base.id,
        title: payload.title,
        description: payload.description ?? base.description ?? null,
        startAt: payload.start_at,
        endAt: payload.end_at,
        allDay: payload.all_day,
        ownerUserId: payload.owner_user_id ?? base.ownerUserId ?? '',
        clientId: payload.client_id ?? base.clientId ?? null,
        clientName: base.clientName ?? null,
        location: payload.location ?? base.location ?? null,
        createdAt: base.createdAt ?? null,
        updatedAt: base.updatedAt ?? null,
        assignees: base.assignees ?? []
    };
}

function hasOverlap(
    events: CalendarEvent[] | undefined,
    targetId: string,
    ownerId: string,
    proposedStart: Date,
    proposedEnd: Date
): boolean {
    if (!events || !ownerId) {
        return false;
    }

    return events.some((event) => {
        if (event.id === targetId) {
            return false;
        }
        if (event.ownerUserId !== ownerId) {
            return false;
        }
        const eventStart = new Date(event.startAt);
        const eventEnd = new Date(event.endAt);
        return eventStart < proposedEnd && eventEnd > proposedStart;
    });
}

function StudioCalendarContent() {
    const calendarRef = React.useRef<any>(null);
    const [visibleRange, setVisibleRange] = React.useState<VisibleRange | null>(null);
    const [calendarTitle, setCalendarTitle] = React.useState('');
    const [currentView, setCurrentView] = React.useState<'dayGridMonth' | 'timeGridWeek' | 'timeGridDay' | 'listWeek'>(
        'dayGridMonth'
    );
    const [eventDialogOpen, setEventDialogOpen] = React.useState(false);
    const [eventDialogMode, setEventDialogMode] = React.useState<EventDialogMode>('create');
    const [selectedRange, setSelectedRange] = React.useState<{ start: Date; end: Date; allDay: boolean } | null>(null);
    const [activeEvent, setActiveEvent] = React.useState<CalendarEvent | null>(null);
    const [assignDialogOpen, setAssignDialogOpen] = React.useState(false);
    const [toast, setToast] = React.useState<ToastState | null>(null);
    const [currentUser, setCurrentUser] = React.useState<CurrentUserRecord | null>(null);

    React.useEffect(() => {
        if (!toast) {
            return;
        }
        const timeout = window.setTimeout(() => setToast(null), 3200);
        return () => window.clearTimeout(timeout);
    }, [toast]);

    const supabase = React.useMemo(() => getSupabaseBrowserClient(), []);

    React.useEffect(() => {
        let isMounted = true;
        supabase.auth.getUser().then(({ data, error }) => {
            if (!isMounted) {
                return;
            }
            if (error || !data?.user) {
                setCurrentUser(null);
                return;
            }
            const userId = data.user.id;
            supabase
                .from('users')
                .select('id, name, email, role, roles')
                .eq('id', userId)
                .single()
                .then(({ data: record, error: recordError }) => {
                    if (recordError || !record) {
                        setCurrentUser({
                            id: userId,
                            name: data.user.user_metadata?.name ?? null,
                            email: data.user.email ?? null,
                            role: null,
                            roles: null
                        });
                        return;
                    }
                    setCurrentUser({
                        id: record.id,
                        name: record.name ?? null,
                        email: record.email ?? null,
                        role: record.role ?? null,
                        roles: Array.isArray(record.roles) ? (record.roles as string[]) : null
                    });
                });
        });
        return () => {
            isMounted = false;
        };
    }, [supabase]);

    const currentUserId = currentUser?.id ?? null;
    const isAdmin = React.useMemo(() => {
        if (!currentUser) {
            return false;
        }
        if (currentUser.role === 'admin') {
            return true;
        }
        if (Array.isArray(currentUser.roles)) {
            return currentUser.roles.includes('admin');
        }
        return false;
    }, [currentUser]);

    const { data: clientOptions = [], isLoading: isLoadingClients } = useSWR<ClientOption[]>(
        'calendar-client-options',
        fetchClients
    );

    const {
        data: events,
        error: eventsError,
        isLoading: isLoadingEvents,
        mutate: mutateEvents
    } = useSWR<CalendarEvent[]>(
        visibleRange ? ['studio-calendar-events', visibleRange.start, visibleRange.end] : null,
        (key) => {
            const [, start, end] = key as [string, string, string];
            return fetchCalendarEvents({ start, end });
        },
        { revalidateOnFocus: false }
    );

    const calendarEvents = React.useMemo(() => {
        return (events ?? []).map((event) => ({
            id: event.id,
            title: event.title,
            start: event.startAt,
            end: event.endAt,
            allDay: event.allDay,
            extendedProps: { calendarEvent: event }
        }));
    }, [events]);

    const handleDatesSet = React.useCallback((arg: any) => {
        setVisibleRange({ start: arg.start.toISOString(), end: arg.end.toISOString() });
        setCalendarTitle(arg.view.title);
        const viewType = arg.view.type;
        if (viewType === 'dayGridMonth' || viewType === 'timeGridWeek' || viewType === 'timeGridDay' || viewType === 'listWeek') {
            setCurrentView(viewType);
        }
    }, []);

    const handleCalendarReady = React.useCallback((calendar: any) => {
        calendarRef.current = calendar;
        setCalendarTitle(calendar.view.title);
        setCurrentView(calendar.view.type as typeof currentView);
        setVisibleRange({ start: calendar.view.activeStart.toISOString(), end: calendar.view.activeEnd.toISOString() });
    }, []);

    const openCreateDialog = React.useCallback((range: { start: Date; end: Date; allDay: boolean }) => {
        setEventDialogMode('create');
        setSelectedRange(range);
        setActiveEvent(null);
        setEventDialogOpen(true);
    }, []);

    const openEditDialog = React.useCallback((event: CalendarEvent) => {
        setEventDialogMode('edit');
        setActiveEvent(event);
        setSelectedRange(null);
        setEventDialogOpen(true);
    }, []);

    const closeEventDialog = React.useCallback(() => {
        setEventDialogOpen(false);
        setSelectedRange(null);
    }, []);

    const handleSelect = React.useCallback(
        (selection: any) => {
            if (!currentUserId) {
                setToast({ id: Date.now(), message: 'Sign in to create events.', variant: 'error' });
                return;
            }
            selection.view.calendar.unselect();
            openCreateDialog({ start: selection.start, end: selection.end, allDay: selection.allDay });
        },
        [currentUserId, openCreateDialog]
    );

    const handleEventClick = React.useCallback(
        (clickInfo: any) => {
            const calendarEvent = (clickInfo.event.extendedProps.calendarEvent as CalendarEvent | undefined) ?? null;
            if (!calendarEvent) {
                return;
            }
            setActiveEvent(calendarEvent);
            openEditDialog(calendarEvent);
        },
        [openEditDialog]
    );

    const canEditEvent = React.useCallback(
        (event: CalendarEvent | null | undefined) => {
            if (!event || !currentUserId) {
                return false;
            }
            return event.ownerUserId === currentUserId || isAdmin;
        },
        [currentUserId, isAdmin]
    );

    const handleAssignTask = React.useCallback(() => {
        if (!activeEvent) {
            return;
        }
        setAssignDialogOpen(true);
    }, [activeEvent]);

    const assignFromList = React.useCallback(
        (event: CalendarEvent) => {
            setActiveEvent(event);
            setAssignDialogOpen(true);
        },
        []
    );

    const renderEventContent = React.useCallback(
        (arg: any) => {
            const calendarEvent = arg.event.extendedProps.calendarEvent as CalendarEvent | undefined;
            if (!calendarEvent) {
                return undefined;
            }

            if (arg.view.type.startsWith('list') && currentUserId) {
                return (
                    <div className="d-flex w-100 align-items-center justify-content-between gap-3">
                        <div>
                            <div className="fw-semibold">
                                {arg.timeText ? `${arg.timeText} · ` : ''}
                                {calendarEvent.title}
                            </div>
                            {calendarEvent.clientName ? (
                                <div className="text-secondary small">{calendarEvent.clientName}</div>
                            ) : null}
                        </div>
                        <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm"
                            onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                assignFromList(calendarEvent);
                            }}
                        >
                            Assign task
                        </button>
                    </div>
                );
            }

            return undefined;
        },
        [assignFromList, currentUserId]
    );

    const handleCreate = React.useCallback(
        async (values: CalendarEventPayload) => {
            if (!currentUserId) {
                throw new Error('You must be signed in to create events.');
            }
            const ownerId = currentUserId;
            const optimisticId = `temp-${Date.now()}`;
            const clientName = values.client_id
                ? clientOptions.find((client) => client.id === values.client_id)?.name ?? null
                : null;
            const optimisticEvent = mapPayloadToOptimisticEvent(
                { ...values, owner_user_id: ownerId },
                { id: optimisticId, ownerUserId: ownerId, clientName, assignees: [] }
            );

            await mutateEvents(
                async (current) => {
                    const created = await createCalendarEvent({ ...values, owner_user_id: ownerId });
                    return (current ?? []).map((event) => (event.id === optimisticId ? created : event)).concat(
                        current?.some((event) => event.id === optimisticId) ? [] : [created]
                    );
                },
                {
                    optimisticData: [...(events ?? []), optimisticEvent],
                    rollbackOnError: true,
                    populateCache: true,
                    revalidate: false
                }
            );
            setToast({ id: Date.now(), message: 'Event created.', variant: 'success' });
        },
        [clientOptions, currentUserId, events, mutateEvents]
    );

    const handleUpdate = React.useCallback(
        async (eventId: string, values: CalendarEventPayload) => {
            const existing = events?.find((event) => event.id === eventId);
            if (!existing) {
                throw new Error('Event not found.');
            }

            const optimisticEvent = mapPayloadToOptimisticEvent(values, {
                id: eventId,
                ownerUserId: existing.ownerUserId,
                clientName:
                    values.client_id && clientOptions.length > 0
                        ? clientOptions.find((client) => client.id === values.client_id)?.name ?? existing.clientName
                        : values.client_id === null
                            ? null
                            : existing.clientName,
                assignees: existing.assignees,
                createdAt: existing.createdAt,
                updatedAt: existing.updatedAt
            });

            await mutateEvents(
                async (current) => {
                    const updated = await updateCalendarEvent(eventId, values);
                    return (current ?? []).map((event) => (event.id === eventId ? updated : event));
                },
                {
                    optimisticData: (events ?? []).map((event) => (event.id === eventId ? optimisticEvent : event)),
                    rollbackOnError: true,
                    populateCache: true,
                    revalidate: false
                }
            );
            setToast({ id: Date.now(), message: 'Event updated.', variant: 'success' });
        },
        [clientOptions, events, mutateEvents]
    );

    const handleDelete = React.useCallback(
        async (eventId: string) => {
            await mutateEvents(
                async (current) => {
                    await deleteCalendarEvent(eventId);
                    return (current ?? []).filter((event) => event.id !== eventId);
                },
                {
                    optimisticData: (events ?? []).filter((event) => event.id !== eventId),
                    rollbackOnError: true,
                    populateCache: true,
                    revalidate: false
                }
            );
            setToast({ id: Date.now(), message: 'Event deleted.', variant: 'success' });
        },
        [events, mutateEvents]
    );

    const updateFromDrag = React.useCallback(
        async (eventApi: any, revert: () => void) => {
            const calendarEvent = eventApi.extendedProps.calendarEvent as CalendarEvent | undefined;
            if (!calendarEvent) {
                revert();
                return;
            }

            if (!canEditEvent(calendarEvent)) {
                setToast({ id: Date.now(), message: 'You do not have permission to edit this event.', variant: 'error' });
                revert();
                return;
            }

            const newStart = eventApi.start ?? new Date(calendarEvent.startAt);
            const newEnd = eventApi.end ?? new Date(calendarEvent.endAt);
            if (hasOverlap(events, calendarEvent.id, calendarEvent.ownerUserId, newStart, newEnd)) {
                setToast({ id: Date.now(), message: 'Event overlaps with another event.', variant: 'error' });
                revert();
                return;
            }

            try {
                await handleUpdate(calendarEvent.id, {
                    title: calendarEvent.title,
                    description: calendarEvent.description,
                    start_at: newStart.toISOString(),
                    end_at: newEnd.toISOString(),
                    all_day: eventApi.allDay,
                    owner_user_id: calendarEvent.ownerUserId,
                    client_id: calendarEvent.clientId,
                    location: calendarEvent.location
                });
            } catch (error) {
                console.error('Failed to update event position', error);
                revert();
                setToast({ id: Date.now(), message: 'Unable to move event.', variant: 'error' });
            }
        },
        [canEditEvent, events, handleUpdate]
    );

    const handleEventDrop = React.useCallback(
        async (arg: any) => {
            await updateFromDrag(arg.event, arg.revert);
        },
        [updateFromDrag]
    );

    const handleEventResize = React.useCallback(
        async (arg: any) => {
            await updateFromDrag(arg.event, arg.revert);
        },
        [updateFromDrag]
    );

    const eventAllow = React.useCallback(
        (_dropInfo: any, draggedEvent: any) => {
            const calendarEvent = draggedEvent.extendedProps?.calendarEvent as CalendarEvent | undefined;
            return canEditEvent(calendarEvent);
        },
        [canEditEvent]
    );

    const handleNewEventClick = React.useCallback(() => {
        if (!currentUserId) {
            setToast({ id: Date.now(), message: 'Sign in to create events.', variant: 'error' });
            return;
        }
        const calendar = calendarRef.current;
        const start = calendar?.getDate() ?? new Date();
        const end = new Date(start.getTime() + 60 * 60 * 1000);
        openCreateDialog({ start, end, allDay: false });
    }, [currentUserId, openCreateDialog]);

    const calendarApiRef = React.useCallback((instance: any) => {
        if (instance) {
            const api = instance.getApi();
            handleCalendarReady(api);
        }
    }, [handleCalendarReady]);

    const changeView = React.useCallback((view: typeof currentView) => {
        const calendar = calendarRef.current;
        if (!calendar) {
            return;
        }
        calendar.changeView(view);
    }, []);

    const goToToday = React.useCallback(() => {
        calendarRef.current?.today();
    }, []);

    const goToPrev = React.useCallback(() => {
        calendarRef.current?.prev();
    }, []);

    const goToNext = React.useCallback(() => {
        calendarRef.current?.next();
    }, []);

    const handleDialogSubmit = React.useCallback(
        async (values: CalendarEventPayload) => {
            if (eventDialogMode === 'create') {
                await handleCreate(values);
            } else if (activeEvent) {
                await handleUpdate(activeEvent.id, values);
            }
        },
        [activeEvent, eventDialogMode, handleCreate, handleUpdate]
    );

    const handleDialogDelete = React.useCallback(async () => {
        if (activeEvent) {
            await handleDelete(activeEvent.id);
        }
    }, [activeEvent, handleDelete]);

    const listAssignButtonVisible = Boolean(currentUserId);

    return (
        <>
            <CalendarPageSection
                actions={
                    <>
                        <Button variant="outline" onClick={goToToday}>
                            Today
                        </Button>
                        <div className="btn-group" role="group" aria-label="Navigate calendar">
                            <Button variant="outline" onClick={goToPrev}>
                                Prev
                            </Button>
                            <Button variant="outline" onClick={goToNext}>
                                Next
                            </Button>
                        </div>
                        <div className="btn-group" role="group" aria-label="Change calendar view">
                            <Button
                                variant={currentView === 'dayGridMonth' ? 'default' : 'outline'}
                                onClick={() => changeView('dayGridMonth')}
                            >
                                Month
                            </Button>
                            <Button
                                variant={currentView === 'timeGridWeek' ? 'default' : 'outline'}
                                onClick={() => changeView('timeGridWeek')}
                            >
                                Week
                            </Button>
                            <Button
                                variant={currentView === 'timeGridDay' ? 'default' : 'outline'}
                                onClick={() => changeView('timeGridDay')}
                            >
                                Day
                            </Button>
                            <Button
                                variant={currentView === 'listWeek' ? 'default' : 'outline'}
                                onClick={() => changeView('listWeek')}
                            >
                                List
                            </Button>
                        </div>
                        <Button onClick={handleNewEventClick}>New event</Button>
                    </>
                }
            >
                <div className="d-flex align-items-center justify-content-between mb-3">
                    <h2 className="h5 mb-0">{calendarTitle}</h2>
                    <span className="text-secondary small">Times shown in {DEFAULT_TIME_ZONE}</span>
                </div>

                {eventsError ? (
                    <div className="alert alert-danger" role="status">
                        Unable to load events. Refresh to try again.
                    </div>
                ) : null}

                <div className="position-relative rounded-3 border">
                    {isLoadingEvents ? (
                        <div className="position-absolute top-0 start-0 h-100 w-100 d-flex align-items-center justify-content-center bg-white bg-opacity-75" role="status">
                            <div className="spinner-border" aria-hidden="true" />
                            <span className="visually-hidden">Loading…</span>
                        </div>
                    ) : null}
                    <FullCalendar
                        ref={calendarApiRef as any}
                        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
                        timeZone={DEFAULT_TIME_ZONE}
                        initialView="dayGridMonth"
                        headerToolbar={false}
                        selectable
                        editable
                        selectMirror
                        dayMaxEvents
                        events={calendarEvents}
                        select={handleSelect}
                        eventClick={handleEventClick}
                        eventDrop={handleEventDrop}
                        eventResize={handleEventResize}
                        eventContent={renderEventContent}
                        datesSet={handleDatesSet}
                        eventAllow={eventAllow}
                        height="auto"
                    />
                </div>
            </CalendarPageSection>

            <EventDialog
                mode={eventDialogMode}
                open={eventDialogOpen}
                onOpenChange={(open) => {
                    setEventDialogOpen(open);
                    if (!open) {
                        setActiveEvent(null);
                    }
                }}
                event={eventDialogMode === 'edit' ? activeEvent : null}
                initialRange={eventDialogMode === 'create' ? selectedRange : null}
                clientOptions={clientOptions}
                timezone={DEFAULT_TIME_ZONE}
                canEdit={eventDialogMode === 'create' ? Boolean(currentUserId) : canEditEvent(activeEvent)}
                onSubmit={handleDialogSubmit}
                onDelete={eventDialogMode === 'edit' && activeEvent ? handleDialogDelete : undefined}
                onAssignTask={eventDialogMode === 'edit' && listAssignButtonVisible ? handleAssignTask : undefined}
                isLoadingClients={isLoadingClients}
            />

            <AssignTaskDialog
                eventId={activeEvent?.id ?? null}
                open={assignDialogOpen}
                onOpenChange={setAssignDialogOpen}
                currentUserId={currentUserId}
                onAssigned={() => {
                    setAssignDialogOpen(false);
                    void mutateEvents();
                    setToast({ id: Date.now(), message: 'Task assigned.', variant: 'success' });
                }}
            />

            <Toast toast={toast} />
        </>
    );
}

export function StudioCalendar() {
    const supabaseConfigured = isSupabaseBrowserConfigured();

    if (!supabaseConfigured) {
        return (
            <CalendarPageSection>
                <div className="alert alert-warning" role="status">
                    <h2 className="h5 mb-2">Connect Supabase to unlock the studio calendar</h2>
                    <p className="mb-2">
                        Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to your
                        environment so events, bookings, and assignments can sync in real time.
                    </p>
                    <p className="mb-0">
                        For server-triggered automations, also configure <code>SUPABASE_URL</code> and <code>SUPABASE_SERVICE_ROLE_KEY</code>,
                        then restart your dev server.
                    </p>
                </div>
            </CalendarPageSection>
        );
    }

    return <StudioCalendarContent />;
}
