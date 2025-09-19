import type { NextApiRequest, NextApiResponse } from 'next';

import type { CalendarEventRecord } from '../../../types/calendar';
import { authenticateRequest } from '../../../utils/api-auth';
import { getSupabaseClient } from '../../../utils/supabase-client';

function mapEvent(record: Record<string, any>): CalendarEventRecord {
    return {
        id: record.id,
        userId: record.user_id,
        title: record.title,
        description: record.description ?? null,
        startTime: record.start_time,
        endTime: record.end_time,
        createdAt: record.created_at
    };
}

export default async function handler(request: NextApiRequest, response: NextApiResponse) {
    const auth = await authenticateRequest(request);
    if (!auth) {
        return response.status(401).json({ error: 'Authentication required.' });
    }

    const supabase = getSupabaseClient();

    if (request.method === 'GET') {
        try {
            const query = await supabase
                .from('calendar_events')
                .select('*')
                .eq('user_id', auth.userId)
                .order('start_time', { ascending: true });

            if (query.error) {
                console.error('Failed to load events', query.error);
                return response.status(500).json({ error: 'Unable to load events.' });
            }

            const events = (query.data ?? []).map(mapEvent);
            return response.status(200).json({ events });
        } catch (error) {
            console.error('Unexpected calendar fetch error', error);
            return response.status(500).json({ error: 'Unable to load events.' });
        }
    }

    if (request.method === 'POST') {
        const { title, start, end, description } = request.body ?? {};

        if (typeof title !== 'string' || typeof start !== 'string' || typeof end !== 'string') {
            return response.status(400).json({ error: 'Title, start, and end are required.' });
        }

        try {
            const insert = await supabase
                .from('calendar_events')
                .insert({
                    title: title.trim(),
                    start_time: new Date(start).toISOString(),
                    end_time: new Date(end).toISOString(),
                    description: typeof description === 'string' ? description.trim() : null,
                    user_id: auth.userId
                })
                .select('*')
                .single();

            if (insert.error || !insert.data) {
                console.error('Failed to create event', insert.error);
                return response.status(500).json({ error: 'Unable to create event.' });
            }

            const event = mapEvent(insert.data);
            return response.status(201).json({ event });
        } catch (error) {
            console.error('Unexpected calendar creation error', error);
            return response.status(500).json({ error: 'Unable to create event.' });
        }
    }

    response.setHeader('Allow', 'GET, POST');
    return response.status(405).json({ error: 'Method not allowed' });
}
