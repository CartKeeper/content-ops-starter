import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { calendarEventCreateSchema } from '../../../../lib/calendar-schemas';
import { authenticateRequest } from '../../../../server/auth/session';
import { getSupabaseClient } from '../../../../utils/supabase-client';
import { buildPermissionFilter, mapEvent, parseDate, startOfDay, endOfDay, toIsoString } from './helpers';

export async function GET(request: NextRequest) {
    const session = await authenticateRequest(request);
    if (!session) {
        return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const url = new URL(request.url);
    const fromParam = url.searchParams.get('from');
    const toParam = url.searchParams.get('to');
    const userIdsParam = url.searchParams.get('userIds');

    const userIds = userIdsParam
        ? userIdsParam
              .split(',')
              .map((value) => value.trim())
              .filter((value) => value.length > 0)
        : [];

    const supabase = getSupabaseClient();

    try {
        let query = supabase.from('calendar_events').select('*').order('start_at', { ascending: true });

        if (toParam) {
            query = query.lt('start_at', toParam);
        }

        if (fromParam) {
            query = query.gt('end_at', fromParam);
        }

        if (userIds.length > 0) {
            query = query.in('owner_user_id', userIds);
        }

        const isAdmin = session.roles.includes('admin');
        if (!isAdmin) {
            query = query.or(buildPermissionFilter(session.userId));
        }

        const { data, error } = await query;
        if (error) {
            console.error('Failed to load calendar events', error);
            return NextResponse.json({ error: 'Unable to load events.' }, { status: 500 });
        }

        const events = (data ?? []).map(mapEvent);
        return NextResponse.json({ events });
    } catch (error) {
        console.error('Unexpected error loading calendar events', error);
        return NextResponse.json({ error: 'Unable to load events.' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const session = await authenticateRequest(request);
    if (!session) {
        return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const json = await request.json().catch(() => null);
    const parsed = calendarEventCreateSchema.safeParse(json ?? {});

    if (!parsed.success) {
        const message = parsed.error.issues[0]?.message ?? 'Invalid event payload.';
        return NextResponse.json({ error: message }, { status: 400 });
    }

    const input = parsed.data;
    const isAdmin = session.roles.includes('admin');
    const ownerUserId = input.owner_user_id ?? session.userId;

    if (!isAdmin && ownerUserId !== session.userId) {
        return NextResponse.json({ error: 'You do not have permission to assign events to other users.' }, { status: 403 });
    }

    const rawStart = parseDate(input.start_at);
    const rawEnd = parseDate(input.end_at);

    if (!rawStart || !rawEnd) {
        return NextResponse.json({ error: 'Provide valid start and end times.' }, { status: 400 });
    }

    const allDay = Boolean(input.all_day);
    const startDate = allDay ? startOfDay(rawStart) : rawStart;
    const endDate = allDay ? endOfDay(rawEnd) : rawEnd;

    if (endDate <= startDate) {
        return NextResponse.json({ error: 'End time must be after the start time.' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    try {
        const { data, error } = await supabase
            .from('calendar_events')
            .insert({
                title: input.title.trim(),
                description: input.description ? input.description.trim() : null,
                start_at: toIsoString(startDate),
                end_at: toIsoString(endDate),
                all_day: allDay,
                visibility: input.visibility ?? 'team',
                owner_user_id: ownerUserId
            })
            .select('*')
            .single();

        if (error || !data) {
            console.error('Failed to create calendar event', error);
            return NextResponse.json({ error: 'Unable to create event.' }, { status: 500 });
        }

        return NextResponse.json({ event: mapEvent(data) }, { status: 201 });
    } catch (error) {
        console.error('Unexpected error creating calendar event', error);
        return NextResponse.json({ error: 'Unable to create event.' }, { status: 500 });
    }
}
