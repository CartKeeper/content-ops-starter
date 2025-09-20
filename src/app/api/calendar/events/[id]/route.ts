import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { calendarEventUpdateSchema } from '../../../../../lib/calendar-schemas';
import { authenticateRequest } from '../../../../../server/auth/session';
import { getSupabaseClient } from '../../../../../utils/supabase-client';
import { mapEvent, parseDate, startOfDay, toIsoString } from '../helpers';

function normalizeTrimmed(value: unknown) {
    if (typeof value !== 'string') {
        return undefined;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}

export async function PATCH(request: NextRequest, context: unknown) {
    const session = await authenticateRequest(request);
    if (!session) {
        return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const params = (context as { params?: { id?: string } })?.params ?? {};
    const eventId = params.id;
    if (!eventId) {
        return NextResponse.json({ error: 'Event ID is required.' }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const parsed = calendarEventUpdateSchema.safeParse(body ?? {});
    if (!parsed.success) {
        const message = parsed.error.issues[0]?.message ?? 'Invalid event payload.';
        return NextResponse.json({ error: message }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    const existingQuery = await supabase.from('calendar_events').select('*').eq('id', eventId).single();
    if (existingQuery.error || !existingQuery.data) {
        if (existingQuery.error?.code === 'PGRST116' || !existingQuery.data) {
            return NextResponse.json({ error: 'Event not found.' }, { status: 404 });
        }

        console.error('Failed to load calendar event for update', existingQuery.error);
        return NextResponse.json({ error: 'Unable to load event.' }, { status: 500 });
    }

    const existing = existingQuery.data as Record<string, any>;
    const isAdmin = session.roles.includes('admin');
    const isOwner = existing.owner_user_id === session.userId;

    if (!isAdmin && !isOwner) {
        return NextResponse.json({ error: 'You do not have permission to update this event.' }, { status: 403 });
    }

    const input = parsed.data;
    const updates: Record<string, any> = {};

    if (input.title !== undefined) {
        const title = normalizeTrimmed(input.title);
        if (!title) {
            return NextResponse.json({ error: 'Title is required.' }, { status: 400 });
        }

        updates.title = title;
    }

    if (input.description !== undefined) {
        const description = normalizeTrimmed(input.description) ?? null;
        updates.description = description;
    }

    let ownerUserId = existing.owner_user_id;
    if (input.owner_user_id) {
        if (!isAdmin && input.owner_user_id !== session.userId) {
            return NextResponse.json({ error: 'You do not have permission to reassign this event.' }, { status: 403 });
        }

        ownerUserId = input.owner_user_id;
    }

    updates.owner_user_id = ownerUserId;

    let visibility = existing.visibility ?? 'team';
    if (input.visibility) {
        visibility = input.visibility;
    }

    updates.visibility = visibility;

    const allDay = input.all_day !== undefined ? Boolean(input.all_day) : Boolean(existing.all_day);
    updates.all_day = allDay;

    const startSource = input.start_at ?? existing.start_at;
    const endSource = input.end_at ?? existing.end_at;
    const endProvided = input.end_at !== undefined;

    const startDate = parseDate(startSource);
    const endDate = parseDate(endSource);

    if (!startDate || !endDate) {
        return NextResponse.json({ error: 'Provide valid start and end times.' }, { status: 400 });
    }

    const normalizedStart = allDay ? startOfDay(startDate) : startDate;
    let normalizedEnd: Date;

    if (allDay) {
        if (endProvided) {
            const inclusiveEnd = startOfDay(endDate);
            inclusiveEnd.setDate(inclusiveEnd.getDate() + 1);
            normalizedEnd = inclusiveEnd;
        } else {
            normalizedEnd = startOfDay(endDate);
        }
    } else {
        normalizedEnd = endDate;
    }

    if (normalizedEnd <= normalizedStart) {
        return NextResponse.json({ error: 'End time must be after the start time.' }, { status: 400 });
    }

    updates.start_at = toIsoString(normalizedStart);
    updates.end_at = toIsoString(normalizedEnd);

    try {
        const { data, error } = await supabase
            .from('calendar_events')
            .update(updates)
            .eq('id', eventId)
            .select('*')
            .single();

        if (error || !data) {
            console.error('Failed to update calendar event', error);
            return NextResponse.json({ error: 'Unable to update event.' }, { status: 500 });
        }

        return NextResponse.json({ event: mapEvent(data) });
    } catch (error) {
        console.error('Unexpected error updating calendar event', error);
        return NextResponse.json({ error: 'Unable to update event.' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, context: unknown) {
    const session = await authenticateRequest(request);
    if (!session) {
        return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const params = (context as { params?: { id?: string } })?.params ?? {};
    const eventId = params.id;
    if (!eventId) {
        return NextResponse.json({ error: 'Event ID is required.' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    const existingQuery = await supabase.from('calendar_events').select('id, owner_user_id, visibility').eq('id', eventId).single();
    if (existingQuery.error || !existingQuery.data) {
        if (existingQuery.error?.code === 'PGRST116' || !existingQuery.data) {
            return NextResponse.json({ error: 'Event not found.' }, { status: 404 });
        }

        console.error('Failed to load calendar event for deletion', existingQuery.error);
        return NextResponse.json({ error: 'Unable to load event.' }, { status: 500 });
    }

    const existing = existingQuery.data as Record<string, any>;
    const isAdmin = session.roles.includes('admin');
    const isOwner = existing.owner_user_id === session.userId;

    if (!isAdmin && !isOwner) {
        return NextResponse.json({ error: 'You do not have permission to delete this event.' }, { status: 403 });
    }

    try {
        const { error } = await supabase.from('calendar_events').delete().eq('id', eventId);
        if (error) {
            console.error('Failed to delete calendar event', error);
            return NextResponse.json({ error: 'Unable to delete event.' }, { status: 500 });
        }

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error('Unexpected error deleting calendar event', error);
        return NextResponse.json({ error: 'Unable to delete event.' }, { status: 500 });
    }
}
