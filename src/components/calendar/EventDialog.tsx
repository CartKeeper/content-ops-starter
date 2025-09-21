'use client';

import * as React from 'react';
import { addDays, addMinutes, differenceInMinutes, format, isBefore, startOfDay, setHours, setMinutes } from 'date-fns';

import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select } from '../ui/select';
import { Textarea } from '../ui/textarea';
import type { CalendarEvent } from '../../lib/supabase/calendar';

export type ClientOption = {
    id: string;
    name: string;
};

export type EventDialogMode = 'create' | 'edit';

type EventDialogSubmit = (input: {
    title: string;
    description: string | null;
    start_at: string;
    end_at: string;
    all_day: boolean;
    client_id: string | null;
    location: string | null;
}) => Promise<void>;

type EventDialogProps = {
    mode: EventDialogMode;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    event: CalendarEvent | null;
    initialRange?: { start: Date; end: Date; allDay: boolean } | null;
    clientOptions: ClientOption[];
    timezone: string;
    canEdit: boolean;
    onSubmit: EventDialogSubmit;
    onDelete?: () => Promise<void>;
    onAssignTask?: () => void;
    isLoadingClients?: boolean;
};

function formatDateTimeInput(date: Date): string {
    return format(date, "yyyy-MM-dd'T'HH:mm");
}

function formatDateInput(date: Date): string {
    return format(date, 'yyyy-MM-dd');
}

function clampEndDate(startDate: Date, proposedEnd: Date): Date {
    if (isBefore(proposedEnd, addMinutes(startDate, 5))) {
        return addMinutes(startDate, 60);
    }

    return proposedEnd;
}

export function EventDialog({
    mode,
    open,
    onOpenChange,
    event,
    initialRange,
    clientOptions,
    timezone,
    canEdit,
    onSubmit,
    onDelete,
    onAssignTask,
    isLoadingClients
}: EventDialogProps) {
    const [title, setTitle] = React.useState('');
    const [description, setDescription] = React.useState('');
    const [location, setLocation] = React.useState('');
    const [clientId, setClientId] = React.useState('');
    const [allDay, setAllDay] = React.useState(false);
    const [startDate, setStartDate] = React.useState<Date>(() => new Date());
    const [endDate, setEndDate] = React.useState<Date>(() => addMinutes(new Date(), 60));
    const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
    const [isSaving, setSaving] = React.useState(false);
    const [isDeleting, setDeleting] = React.useState(false);

    const resetState = React.useCallback(() => {
        setTitle('');
        setDescription('');
        setLocation('');
        setClientId('');
        setAllDay(false);
        const now = new Date();
        const roundedStart = setMinutes(setHours(now, now.getHours()), Math.floor(now.getMinutes() / 15) * 15);
        setStartDate(roundedStart);
        setEndDate(addMinutes(roundedStart, 60));
        setErrorMessage(null);
        setSaving(false);
        setDeleting(false);
    }, []);

    React.useEffect(() => {
        if (!open) {
            return;
        }

        if (mode === 'edit' && event) {
            setTitle(event.title);
            setDescription(event.description ?? '');
            setLocation(event.location ?? '');
            setClientId(event.clientId ?? '');
            setAllDay(event.allDay);
            const start = new Date(event.startAt);
            const end = new Date(event.endAt);
            setStartDate(event.allDay ? startOfDay(start) : start);
            setEndDate(event.allDay ? startOfDay(end) : end);
            setErrorMessage(null);
            setSaving(false);
            setDeleting(false);
            return;
        }

        const range = initialRange ?? null;
        const now = new Date();
        const start = range?.start ?? now;
        const end = range?.end ?? addMinutes(start, 60);
        const initialAllDay = Boolean(range?.allDay);
        setTitle('');
        setDescription('');
        setLocation('');
        setClientId('');
        setAllDay(initialAllDay);
        setStartDate(initialAllDay ? startOfDay(start) : start);
        setEndDate(initialAllDay ? startOfDay(end) : clampEndDate(initialAllDay ? startOfDay(start) : start, end));
        setErrorMessage(null);
        setSaving(false);
        setDeleting(false);
    }, [event, initialRange, mode, open]);

    React.useEffect(() => {
        if (!open) {
            resetState();
        }
    }, [open, resetState]);

    const handleAllDayChange = (checked: boolean) => {
        setAllDay(checked);
        setErrorMessage(null);

        if (checked) {
            setStartDate((prev) => {
                const normalizedStart = startOfDay(prev);
                setEndDate((prevEnd) => {
                    const normalizedEnd = startOfDay(prevEnd);
                    const minEnd = addDays(normalizedStart, 1);
                    return isBefore(normalizedEnd, minEnd) ? minEnd : normalizedEnd;
                });
                return normalizedStart;
            });
        } else {
            setStartDate((prev) => {
                const base = startOfDay(prev);
                const nextStart = setMinutes(setHours(base, 9), 0);
                setEndDate((prevEnd) => {
                    const minutes = Math.max(60, differenceInMinutes(prevEnd, prev));
                    return addMinutes(nextStart, minutes);
                });
                return nextStart;
            });
        }
    };

    const handleStartChange = (value: string) => {
        if (allDay) {
            const parsed = new Date(`${value}T00:00:00`);
            if (Number.isNaN(parsed.getTime())) {
                return;
            }
            setStartDate(parsed);
            setEndDate((prevEnd) => {
                const minEnd = addDays(parsed, 1);
                return isBefore(prevEnd, minEnd) ? minEnd : prevEnd;
            });
            return;
        }

        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) {
            return;
        }
        setStartDate(parsed);
        setEndDate((prevEnd) => clampEndDate(parsed, prevEnd));
    };

    const handleEndChange = (value: string) => {
        if (allDay) {
            const parsed = new Date(`${value}T00:00:00`);
            if (Number.isNaN(parsed.getTime())) {
                return;
            }
            const exclusiveEnd = addDays(parsed, 1);
            setEndDate(() => {
                const minEnd = addDays(startDate, 1);
                return isBefore(exclusiveEnd, minEnd) ? minEnd : exclusiveEnd;
            });
            return;
        }

        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) {
            return;
        }
        setEndDate(clampEndDate(startDate, parsed));
    };

    const handleSubmit = async (submitEvent: React.FormEvent<HTMLFormElement>) => {
        submitEvent.preventDefault();

        if (!canEdit) {
            onOpenChange(false);
            return;
        }

        if (title.trim().length === 0) {
            setErrorMessage('Title is required.');
            return;
        }

        if (!allDay && !isBefore(startDate, endDate)) {
            setErrorMessage('End time must be after the start time.');
            return;
        }

        if (allDay && !isBefore(startDate, endDate)) {
            setErrorMessage('End date must be after the start date.');
            return;
        }

        setSaving(true);
        setErrorMessage(null);

        const payload = {
            title: title.trim(),
            description: description.trim().length > 0 ? description.trim() : null,
            start_at: allDay ? startOfDay(startDate).toISOString() : startDate.toISOString(),
            end_at: endDate.toISOString(),
            all_day: allDay,
            client_id: clientId.length > 0 ? clientId : null,
            location: location.trim().length > 0 ? location.trim() : null
        };

        try {
            await onSubmit(payload);
            onOpenChange(false);
        } catch (error) {
            console.error('Failed to save event', error);
            setErrorMessage(error instanceof Error ? error.message : 'Unable to save event.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!onDelete || !event) {
            return;
        }

        const confirmed = window.confirm('Delete this event? This action cannot be undone.');
        if (!confirmed) {
            return;
        }

        setDeleting(true);
        setErrorMessage(null);

        try {
            await onDelete();
            onOpenChange(false);
        } catch (error) {
            console.error('Failed to delete event', error);
            setErrorMessage(error instanceof Error ? error.message : 'Unable to delete event.');
        } finally {
            setDeleting(false);
        }
    };

    const startInputValue = allDay ? formatDateInput(startDate) : formatDateTimeInput(startDate);
    const endInputValue = allDay ? formatDateInput(addDays(endDate, -1)) : formatDateTimeInput(endDate);
    const timezoneLabel = `Times shown in ${timezone}`;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{mode === 'edit' ? 'Edit event' : 'New event'}</DialogTitle>
                </DialogHeader>
                <form id="event-dialog-form" onSubmit={handleSubmit} className="modal-body">
                    <div className="mb-3">
                        <Label htmlFor="event-title">Title</Label>
                        <Input
                            id="event-title"
                            value={title}
                            onChange={(event) => setTitle(event.target.value)}
                            disabled={!canEdit}
                            required
                        />
                    </div>
                    <div className="mb-3">
                        <Label htmlFor="event-description">Description</Label>
                        <Textarea
                            id="event-description"
                            value={description}
                            onChange={(event) => setDescription(event.target.value)}
                            rows={4}
                            disabled={!canEdit}
                        />
                    </div>
                    <div className="row g-3">
                        <div className="col-md-6">
                            <Label htmlFor="event-start">Start</Label>
                            <Input
                                id="event-start"
                                type={allDay ? 'date' : 'datetime-local'}
                                value={startInputValue}
                                onChange={(event) => handleStartChange(event.target.value)}
                                disabled={!canEdit}
                                required
                            />
                        </div>
                        <div className="col-md-6">
                            <Label htmlFor="event-end">End</Label>
                            <Input
                                id="event-end"
                                type={allDay ? 'date' : 'datetime-local'}
                                value={endInputValue}
                                onChange={(event) => handleEndChange(event.target.value)}
                                disabled={!canEdit}
                                required
                            />
                        </div>
                    </div>
                    <div className="form-check form-switch mt-3">
                        <input
                            className="form-check-input"
                            type="checkbox"
                            role="switch"
                            id="event-all-day"
                            checked={allDay}
                            onChange={(event) => handleAllDayChange(event.target.checked)}
                            disabled={!canEdit}
                        />
                        <label className="form-check-label" htmlFor="event-all-day">
                            All-day event
                        </label>
                    </div>
                    <p className="mt-2 text-secondary small">{timezoneLabel}</p>
                    <div className="row g-3 mt-1">
                        <div className="col-md-6">
                            <Label htmlFor="event-client">Client</Label>
                            <Select
                                id="event-client"
                                value={clientId}
                                onChange={(event) => setClientId(event.target.value)}
                                disabled={!canEdit || isLoadingClients}
                            >
                                <option value="">No client</option>
                                {clientOptions.map((client) => (
                                    <option key={client.id} value={client.id}>
                                        {client.name}
                                    </option>
                                ))}
                            </Select>
                            {isLoadingClients ? (
                                <p className="mt-2 text-secondary small">Loading clients…</p>
                            ) : null}
                        </div>
                        <div className="col-md-6">
                            <Label htmlFor="event-location">Location</Label>
                            <Input
                                id="event-location"
                                value={location}
                                onChange={(event) => setLocation(event.target.value)}
                                disabled={!canEdit}
                                placeholder="Studio, address, or meeting link"
                            />
                        </div>
                    </div>
                    {errorMessage ? <p className="mt-3 text-danger small">{errorMessage}</p> : null}
                </form>
                <DialogFooter className="d-flex flex-wrap gap-2 justify-content-between">
                    <div className="d-flex gap-2">
                        {mode === 'edit' && onAssignTask ? (
                            <Button type="button" variant="outline" onClick={onAssignTask} disabled={!event}>
                                Assign task
                            </Button>
                        ) : null}
                        {mode === 'edit' && onDelete ? (
                            <Button type="button" variant="ghost" onClick={handleDelete} disabled={isDeleting}>
                                {isDeleting ? 'Deleting…' : 'Delete'}
                            </Button>
                        ) : null}
                    </div>
                    <div className="d-flex gap-2 ms-auto">
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSaving}>
                            Cancel
                        </Button>
                        <Button type="submit" form="event-dialog-form" disabled={!canEdit || isSaving} isLoading={isSaving}>
                            Save event
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
