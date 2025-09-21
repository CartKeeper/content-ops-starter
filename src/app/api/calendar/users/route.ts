import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { authenticateRequest } from '../../../../server/auth/session';
import { getSupabaseClient, isSupabaseConfigured } from '../../../../utils/supabase-client';
import { getFallbackCalendarUsers } from '../../../../server/calendar/fallback';

export async function GET(request: NextRequest) {
    const session = await authenticateRequest(request);
    if (!session) {
        return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const isAdmin = session.roles.includes('admin');

    try {
        if (!isSupabaseConfigured()) {
            const users = await getFallbackCalendarUsers();
            return NextResponse.json({ users, isAdmin });
        }

        const supabase = getSupabaseClient();
        const query = supabase.from('users').select('id, name, email, roles').order('name', { ascending: true });

        const { data, error } = await query;
        if (error) {
            console.error('Failed to load calendar users', error);
            const users = await getFallbackCalendarUsers();
            return NextResponse.json({ users, isAdmin }, { headers: { 'x-data-source': 'fallback' } });
        }

        const users = (data ?? []).map((user: any) => ({
            id: user.id,
            name: typeof user.name === 'string' && user.name.trim() !== '' ? user.name : user.email ?? 'Unknown user'
        }));

        return NextResponse.json({
            users,
            isAdmin
        });
    } catch (error) {
        console.error('Unexpected error loading calendar users', error);
        const users = await getFallbackCalendarUsers();
        return NextResponse.json({ users, isAdmin }, { headers: { 'x-data-source': 'fallback' } });
    }
}
