import { getSupabaseBrowserClient } from '../supabase-browser';

export type TaskPriority = 'low' | 'normal' | 'high';
export type TaskStatus = 'open' | 'in_progress' | 'done' | 'blocked';

export type TaskRecord = {
    id: string;
    title: string;
    details: string | null;
    status: TaskStatus;
    priority: TaskPriority;
    dueAt: string | null;
    createdBy: string;
    assignedTo: string;
    eventId: string | null;
    createdAt: string | null;
    updatedAt: string | null;
};

export type CreateTaskInput = {
    title: string;
    details?: string | null;
    due_at?: string | null;
    priority?: TaskPriority;
    assigned_to: string;
    event_id?: string | null;
    created_by: string;
};

export type UserSummary = {
    id: string;
    name: string | null;
    email: string | null;
};

type TaskRow = {
    id: string;
    title: string;
    details: string | null;
    status: string;
    priority: string | null;
    due_at: string | null;
    created_by: string;
    assigned_to: string;
    event_id: string | null;
    created_at: string | null;
    updated_at: string | null;
};

function mapTask(row: TaskRow): TaskRecord {
    return {
        id: row.id,
        title: row.title,
        details: row.details,
        status: (row.status as TaskStatus) ?? 'open',
        priority: (row.priority as TaskPriority) ?? 'normal',
        dueAt: row.due_at,
        createdBy: row.created_by,
        assignedTo: row.assigned_to,
        eventId: row.event_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

export async function fetchAssignableUsers(): Promise<UserSummary[]> {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
        .from('users')
        .select('id, name, email')
        .order('name', { ascending: true });

    if (error) {
        throw error;
    }

    return (data ?? []).map((row) => ({
        id: row.id,
        name: typeof row.name === 'string' && row.name.trim().length > 0 ? row.name : null,
        email: typeof row.email === 'string' ? row.email : null
    }));
}

export async function createTaskForEvent(input: CreateTaskInput): Promise<TaskRecord> {
    const supabase = getSupabaseBrowserClient();
    const insertPayload: Record<string, unknown> = {
        title: input.title.trim(),
        details: input.details?.trim() ?? null,
        priority: input.priority ?? 'normal',
        due_at: input.due_at ?? null,
        created_by: input.created_by,
        assigned_to: input.assigned_to,
        event_id: input.event_id ?? null
    };

    const { data, error } = await supabase
        .from('tasks')
        .insert(insertPayload)
        .select('id, title, details, status, priority, due_at, created_by, assigned_to, event_id, created_at, updated_at')
        .single();

    if (error || !data) {
        throw error ?? new Error('Unable to create task');
    }

    if (input.event_id) {
        const { error: assigneeError } = await supabase
            .from('event_assignees')
            .upsert({ event_id: input.event_id, user_id: input.assigned_to, role: 'assistant' }, { onConflict: 'event_id,user_id' });

        if (assigneeError) {
            throw assigneeError;
        }
    }

    return mapTask(data as TaskRow);
}
