import { getSupabaseBrowserClient } from '../supabase-browser';

export const DEFAULT_TIME_ZONE = 'America/Kentucky/Louisville';

export type EventAssignee = {
    userId: string;
    role: string;
};

export type CalendarEvent = {
    id: string;
    title: string;
    description: string | null;
    startAt: string;
    endAt: string;
    allDay: boolean;
    ownerUserId: string;
    clientId: string | null;
    clientName: string | null;
    location: string | null;
    createdAt: string | null;
    updatedAt: string | null;
    assignees: EventAssignee[];
};

export type CalendarEventPayload = {
    title: string;
    description?: string | null;
    start_at: string;
    end_at: string;
    all_day: boolean;
    owner_user_id?: string;
    client_id?: string | null;
    location?: string | null;
};

type CalendarEventRow = {
    id: string;
    title: string;
    description: string | null;
    start_at: string;
    end_at: string;
    all_day: boolean;
    owner_user_id: string;
    client_id: string | null;
    location: string | null;
    created_at: string | null;
    updated_at: string | null;
    client?: { id: string; name: string | null } | Array<{ id: string; name: string | null }> | null;
    event_assignees?: Array<{ user_id: string; role: string | null } | null> | null;
};

function mapEvent(row: CalendarEventRow): CalendarEvent {
    const clientValue = Array.isArray(row.client) ? row.client[0] ?? null : row.client ?? null;
    return {
        id: row.id,
        title: row.title,
        description: row.description,
        startAt: row.start_at,
        endAt: row.end_at,
        allDay: Boolean(row.all_day),
        ownerUserId: row.owner_user_id,
        clientId: row.client_id,
        clientName: clientValue?.name ?? null,
        location: row.location,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        assignees:
            row.event_assignees?.filter((item): item is { user_id: string; role: string | null } => Boolean(item)).map((item) => ({
                userId: item.user_id,
                role: item.role ?? 'assistant'
            })) ?? []
    };
}

export async function fetchCalendarEvents(range: { start: string; end: string }): Promise<CalendarEvent[]> {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
        .from('calendar_events')
        .select(
            `id, title, description, start_at, end_at, all_day, owner_user_id, client_id, location, created_at, updated_at,
            client:clients(id, name),
            event_assignees(user_id, role)`
        )
        .lt('start_at', range.end)
        .gt('end_at', range.start)
        .order('start_at', { ascending: true });

    if (error) {
        throw error;
    }

    return (data ?? []).map(mapEvent);
}

export async function createCalendarEvent(input: CalendarEventPayload): Promise<CalendarEvent> {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
        .from('calendar_events')
        .insert({
            title: input.title.trim(),
            description: input.description?.trim() ?? null,
            start_at: input.start_at,
            end_at: input.end_at,
            all_day: input.all_day,
            owner_user_id: input.owner_user_id,
            client_id: input.client_id ?? null,
            location: input.location?.trim() ?? null
        })
        .select(
            `id, title, description, start_at, end_at, all_day, owner_user_id, client_id, location, created_at, updated_at,
            client:clients(id, name),
            event_assignees(user_id, role)`
        )
        .single();

    if (error || !data) {
        throw error ?? new Error('Unable to create calendar event');
    }

    return mapEvent(data as CalendarEventRow);
}

export async function updateCalendarEvent(
    id: string,
    updates: Partial<Omit<CalendarEventPayload, 'start_at' | 'end_at'>> & { start_at?: string; end_at?: string }
): Promise<CalendarEvent> {
    const supabase = getSupabaseBrowserClient();
    const payload: Record<string, unknown> = {};

    if (updates.title !== undefined) {
        payload.title = updates.title.trim();
    }
    if (updates.description !== undefined) {
        payload.description = updates.description ? updates.description.trim() : null;
    }
    if (updates.start_at !== undefined) {
        payload.start_at = updates.start_at;
    }
    if (updates.end_at !== undefined) {
        payload.end_at = updates.end_at;
    }
    if (updates.all_day !== undefined) {
        payload.all_day = updates.all_day;
    }
    if (updates.owner_user_id !== undefined) {
        payload.owner_user_id = updates.owner_user_id;
    }
    if (updates.client_id !== undefined) {
        payload.client_id = updates.client_id;
    }
    if (updates.location !== undefined) {
        payload.location = updates.location ? updates.location.trim() : null;
    }

    const { data, error } = await supabase
        .from('calendar_events')
        .update(payload)
        .eq('id', id)
        .select(
            `id, title, description, start_at, end_at, all_day, owner_user_id, client_id, location, created_at, updated_at,
            client:clients(id, name),
            event_assignees(user_id, role)`
        )
        .single();

    if (error || !data) {
        throw error ?? new Error('Unable to update calendar event');
    }

    return mapEvent(data as CalendarEventRow);
}

export async function deleteCalendarEvent(id: string): Promise<void> {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.from('calendar_events').delete().eq('id', id);
    if (error) {
        throw error;
    }
}

export async function fetchCalendarEvent(id: string): Promise<CalendarEvent | null> {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
        .from('calendar_events')
        .select(
            `id, title, description, start_at, end_at, all_day, owner_user_id, client_id, location, created_at, updated_at,
            client:clients(id, name),
            event_assignees(user_id, role)`
        )
        .eq('id', id)
        .single();

    if (error) {
        if (error.code === 'PGRST116') {
            return null;
        }
        throw error;
    }

    if (!data) {
        return null;
    }

    return mapEvent(data as CalendarEventRow);
}
