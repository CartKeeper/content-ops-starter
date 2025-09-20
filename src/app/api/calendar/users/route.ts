import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { authenticateRequest } from '../../../../server/auth/session';
import { getSupabaseClient } from '../../../../utils/supabase-client';

export async function GET(request: NextRequest) {
    const session = await authenticateRequest(request);
    if (!session) {
        return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    try {
        const supabase = getSupabaseClient();
        const query = supabase.from('users').select('id, name, email, roles').order('name', { ascending: true });

        const isAdmin = session.roles.includes('admin');

        const { data, error } = await query;
        if (error) {
            console.error('Failed to load calendar users', error);
            return NextResponse.json({ error: 'Unable to load users.' }, { status: 500 });
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
        return NextResponse.json({ error: 'Unable to load users.' }, { status: 500 });
    }
}
