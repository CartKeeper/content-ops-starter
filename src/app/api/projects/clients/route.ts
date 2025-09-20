import { NextResponse } from 'next/server';

import { supabaseAdmin } from '../../../../lib/supabase-admin';

type ClientRow = {
    id: string;
    name: string | null;
};

export async function GET() {
    try {
        const { data, error } = await supabaseAdmin
            .from('clients')
            .select('id, name')
            .order('name', { ascending: true });

        if (error) {
            throw new Error(error.message);
        }

        const clients = (data ?? []).map((row) => ({
            id: row.id,
            name: row.name ?? 'Unnamed client'
        }));

        return NextResponse.json({ clients });
    } catch (error) {
        console.error('Failed to load clients for project form', error);
        return NextResponse.json({ error: 'Unable to load clients.' }, { status: 500 });
    }
}
