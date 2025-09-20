import { supabaseAdmin } from '../../lib/supabase-admin';
import {
    CreateProjectPayload,
    CreateTaskPayload,
    ProjectInput,
    ProjectInvoiceSnippet,
    ProjectListFilters,
    ProjectListResponse,
    ProjectRecord,
    ProjectStatus,
    ProjectTaskInput,
    ProjectTaskRecord,
    ProjectTaskStatus,
    UpdateProjectPayload,
    UpdateTaskPayload
} from '../../types/project';

type ProjectRow = {
    id: string;
    created_at: string;
    updated_at: string;
    title: string;
    client_id: string;
    status: ProjectStatus;
    start_date: string | null;
    end_date: string | null;
    description: string | null;
    tags: string[] | null;
    created_by?: string | null;
    clients?: {
        name?: string | null;
    } | null;
};

type TaskRow = {
    id: string;
    project_id: string;
    name: string;
    date: string | null;
    location: string | null;
    status: ProjectTaskStatus;
    order_index: number | null;
    completed_at: string | null;
};

type InvoiceRow = {
    id: string;
    number: string | null;
    amount_cents: number | null;
    status: string | null;
    due_at: string | null;
    project_id: string | null;
    client_id: string | null;
};

function normalizeTags(tags: string[] | null | undefined): string[] {
    if (!Array.isArray(tags)) {
        return [];
    }
    return tags.filter((tag) => typeof tag === 'string' && tag.trim().length > 0);
}

function toTaskRecord(row: TaskRow): ProjectTaskRecord {
    return {
        id: row.id,
        projectId: row.project_id,
        name: row.name,
        date: row.date,
        location: row.location,
        status: row.status,
        orderIndex: typeof row.order_index === 'number' ? row.order_index : 0,
        completedAt: row.completed_at
    };
}

function compareTasks(a: ProjectTaskRecord, b: ProjectTaskRecord): number {
    const aDate = a.date ? Date.parse(a.date) : null;
    const bDate = b.date ? Date.parse(b.date) : null;

    if (aDate !== null && bDate !== null) {
        if (aDate < bDate) {
            return -1;
        }
        if (aDate > bDate) {
            return 1;
        }
    } else if (aDate !== null) {
        return -1;
    } else if (bDate !== null) {
        return 1;
    }

    return a.orderIndex - b.orderIndex;
}

function toInvoiceSnippet(row: InvoiceRow): ProjectInvoiceSnippet {
    const normalizedStatus = (row.status ?? 'DRAFT').toUpperCase();
    const status: ProjectInvoiceSnippet['status'] =
        normalizedStatus === 'PAID'
            ? 'PAID'
            : normalizedStatus === 'SENT'
              ? 'SENT'
              : normalizedStatus === 'OVERDUE'
                ? 'OVERDUE'
                : 'DRAFT';

    return {
        id: row.id,
        number: row.number,
        amountCents: row.amount_cents,
        status,
        dueAt: row.due_at
    };
}

function computeCompletion(tasks: ProjectTaskRecord[]): number {
    const total = tasks.length;
    if (total === 0) {
        return 0;
    }
    const completed = tasks.filter((task) => task.status === 'COMPLETE').length;
    return Math.round((completed / Math.max(1, total)) * 100);
}

function buildProjectRecord(
    row: ProjectRow,
    tasksMap: Record<string, ProjectTaskRecord[]>,
    invoicesMap: Record<string, ProjectInvoiceSnippet[]>
): ProjectRecord {
    const tasks = tasksMap[row.id] ?? [];
    const invoices = invoicesMap[row.id] ?? [];

    return {
        id: row.id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        title: row.title,
        clientId: row.client_id,
        clientName: row.clients?.name ?? null,
        status: row.status,
        startDate: row.start_date,
        endDate: row.end_date,
        description: row.description,
        tags: normalizeTags(row.tags),
        tasks,
        invoices,
        completionPercent: computeCompletion(tasks)
    };
}

async function fetchTasksByProjectIds(projectIds: string[]): Promise<Record<string, ProjectTaskRecord[]>> {
    if (projectIds.length === 0) {
        return {};
    }

    const { data, error } = await supabaseAdmin
        .from('project_tasks')
        .select('id, project_id, name, date, location, status, order_index, completed_at')
        .in('project_id', projectIds)
        .order('order_index', { ascending: true })
        .order('created_at', { ascending: true });

    if (error) {
        throw new Error(error.message);
    }

    const grouped: Record<string, ProjectTaskRecord[]> = {};
    const rows = (data as TaskRow[]) ?? [];

    for (const row of rows) {
        if (!row?.project_id) {
            continue;
        }
        const task = toTaskRecord(row);
        if (!grouped[row.project_id]) {
            grouped[row.project_id] = [];
        }
        grouped[row.project_id].push(task);
    }

    for (const projectId of Object.keys(grouped)) {
        grouped[projectId].sort(compareTasks);
    }

    return grouped;
}

async function fetchInvoicesForProjects(projectRows: ProjectRow[]): Promise<Record<string, ProjectInvoiceSnippet[]>> {
    if (projectRows.length === 0) {
        return {};
    }

    const projectIds = projectRows.map((row) => row.id);

    const { data: directData, error: directError } = await supabaseAdmin
        .from('invoices')
        .select('id, number, amount_cents, status, due_at, project_id, client_id')
        .in('project_id', projectIds)
        .order('due_at', { ascending: false })
        .order('created_at', { ascending: false });

    if (directError) {
        throw new Error(directError.message);
    }

    const directMap = new Map<string, InvoiceRow[]>();
    const directRows = (directData as InvoiceRow[]) ?? [];

    for (const row of directRows) {
        const projectId = row.project_id;
        if (!projectId) {
            continue;
        }
        const entries = directMap.get(projectId) ?? [];
        entries.push(row);
        directMap.set(projectId, entries);
    }

    const projectsNeedingFallback = projectRows.filter((row) => (directMap.get(row.id)?.length ?? 0) < 2);
    const fallbackClientIds = Array.from(new Set(projectsNeedingFallback.map((row) => row.client_id))).filter(Boolean);

    let fallbackRows: InvoiceRow[] = [];
    if (fallbackClientIds.length > 0) {
        const { data: fallbackData, error: fallbackError } = await supabaseAdmin
            .from('invoices')
            .select('id, number, amount_cents, status, due_at, project_id, client_id')
            .in('client_id', fallbackClientIds)
            .order('due_at', { ascending: false })
            .limit(fallbackClientIds.length * 6);

        if (fallbackError) {
            throw new Error(fallbackError.message);
        }

        fallbackRows = (fallbackData as InvoiceRow[]) ?? [];
    }

    const invoicesMap: Record<string, ProjectInvoiceSnippet[]> = {};

    for (const project of projectRows) {
        const directRows = [...(directMap.get(project.id) ?? [])];
        directRows.sort((a, b) => {
            const aTime = a.due_at ? Date.parse(a.due_at) : Number.NEGATIVE_INFINITY;
            const bTime = b.due_at ? Date.parse(b.due_at) : Number.NEGATIVE_INFINITY;
            return bTime - aTime;
        });

        const snippets: ProjectInvoiceSnippet[] = [];
        const seen = new Set<string>();

        for (const row of directRows) {
            if (!row.id || seen.has(row.id)) {
                continue;
            }
            snippets.push(toInvoiceSnippet(row));
            seen.add(row.id);
            if (snippets.length >= 2) {
                break;
            }
        }

        if (snippets.length < 2) {
            for (const row of fallbackRows) {
                if (!row.id || seen.has(row.id)) {
                    continue;
                }
                if (row.client_id !== project.client_id) {
                    continue;
                }
                snippets.push(toInvoiceSnippet(row));
                seen.add(row.id);
                if (snippets.length >= 2) {
                    break;
                }
            }
        }

        invoicesMap[project.id] = snippets;
    }

    return invoicesMap;
}

async function fetchProjectRowById(projectId: string): Promise<ProjectRow | null> {
    const { data, error } = await supabaseAdmin
        .from('projects')
        .select('id, created_at, updated_at, title, client_id, status, start_date, end_date, description, tags, clients(name)')
        .eq('id', projectId)
        .maybeSingle();

    if (error) {
        throw new Error(error.message);
    }

    return (data as ProjectRow | null) ?? null;
}

export async function listProjects(filters: ProjectListFilters): Promise<ProjectListResponse> {
    const pageSize = Math.max(1, Math.min(filters.pageSize ?? 12, 100));
    const page = Math.max(1, filters.page ?? 1);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabaseAdmin
        .from('projects')
        .select('id, created_at, updated_at, title, client_id, status, start_date, end_date, description, tags, clients(name)', {
            count: 'exact'
        })
        .order('created_at', { ascending: false });

    if (filters.status && filters.status !== 'ALL') {
        query = query.eq('status', filters.status);
    }

    if (filters.tag) {
        query = query.contains('tags', [filters.tag]);
    }

    if (filters.q) {
        const term = filters.q.trim();
        if (term.length > 0) {
            query = query.or(`title.ilike.%${term}%,description.ilike.%${term}%`);
        }
    }

    const { data, error, count } = await query.range(from, to);

    if (error) {
        throw new Error(error.message);
    }

    const rows = (data as ProjectRow[]) ?? [];
    const tasksMap = await fetchTasksByProjectIds(rows.map((row) => row.id));
    const invoicesMap = await fetchInvoicesForProjects(rows);

    const projects = rows.map((row) => buildProjectRecord(row, tasksMap, invoicesMap));

    return {
        data: projects,
        page,
        pageSize,
        total: count ?? projects.length
    };
}

function mapProjectInputToRow(input: ProjectInput): Record<string, unknown> {
    const payload: Record<string, unknown> = {
        title: input.title,
        client_id: input.clientId,
        status: input.status,
        description: input.description ?? null,
        start_date: input.startDate ?? null,
        end_date: input.endDate ?? null,
        tags: input.tags ?? []
    };

    if (input.createdBy) {
        payload.created_by = input.createdBy;
    }

    return payload;
}

function normalizeTaskInput(task: ProjectTaskInput, index: number): Record<string, unknown> {
    const status: ProjectTaskStatus = task.status ?? 'PENDING';
    const payload: Record<string, unknown> = {
        name: task.name,
        date: task.date ?? null,
        location: task.location ?? null,
        status,
        order_index: typeof task.orderIndex === 'number' ? task.orderIndex : index
    };

    if (status === 'COMPLETE') {
        payload.completed_at = task.completedAt ?? new Date().toISOString();
    } else if (task.completedAt !== undefined) {
        payload.completed_at = task.completedAt;
    }

    return payload;
}

export async function createProject(payload: CreateProjectPayload): Promise<ProjectRecord> {
    const { project, tasks = [] } = payload;

    const { data, error } = await supabaseAdmin
        .from('projects')
        .insert(mapProjectInputToRow(project))
        .select('id, created_at, updated_at, title, client_id, status, start_date, end_date, description, tags, clients(name)')
        .single();

    if (error) {
        throw new Error(error.message);
    }

    const projectRow = data as ProjectRow;

    if (tasks.length > 0) {
        const taskPayload = tasks.map((task, index) => ({
            ...normalizeTaskInput(task, index),
            project_id: projectRow.id
        }));

        const { error: taskError } = await supabaseAdmin.from('project_tasks').insert(taskPayload);
        if (taskError) {
            throw new Error(taskError.message);
        }
    }

    const tasksMap = await fetchTasksByProjectIds([projectRow.id]);
    const invoicesMap = await fetchInvoicesForProjects([projectRow]);

    return buildProjectRecord(projectRow, tasksMap, invoicesMap);
}

export async function updateProject(projectId: string, payload: UpdateProjectPayload): Promise<ProjectRecord> {
    const updateBody: Record<string, unknown> = {};

    if (payload.title !== undefined) {
        updateBody.title = payload.title;
    }
    if (payload.clientId !== undefined) {
        updateBody.client_id = payload.clientId;
    }
    if (payload.status !== undefined) {
        updateBody.status = payload.status;
    }
    if (payload.startDate !== undefined) {
        updateBody.start_date = payload.startDate ?? null;
    }
    if (payload.endDate !== undefined) {
        updateBody.end_date = payload.endDate ?? null;
    }
    if (payload.description !== undefined) {
        updateBody.description = payload.description ?? null;
    }
    if (payload.tags !== undefined) {
        updateBody.tags = payload.tags ?? [];
    }
    if (payload.createdBy !== undefined) {
        updateBody.created_by = payload.createdBy;
    }

    if (Object.keys(updateBody).length === 0) {
        const existing = await fetchProjectRowById(projectId);
        if (!existing) {
            throw new Error('Project not found');
        }
        const tasksMap = await fetchTasksByProjectIds([projectId]);
        const invoicesMap = await fetchInvoicesForProjects([existing]);
        return buildProjectRecord(existing, tasksMap, invoicesMap);
    }

    const { data, error } = await supabaseAdmin
        .from('projects')
        .update(updateBody)
        .eq('id', projectId)
        .select('id, created_at, updated_at, title, client_id, status, start_date, end_date, description, tags, clients(name)')
        .single();

    if (error) {
        throw new Error(error.message);
    }

    const projectRow = data as ProjectRow;
    const tasksMap = await fetchTasksByProjectIds([projectId]);
    const invoicesMap = await fetchInvoicesForProjects([projectRow]);

    return buildProjectRecord(projectRow, tasksMap, invoicesMap);
}

export async function deleteProject(projectId: string): Promise<void> {
    const { error } = await supabaseAdmin.from('projects').delete().eq('id', projectId);
    if (error) {
        throw new Error(error.message);
    }
}

export async function createTask(payload: CreateTaskPayload): Promise<ProjectTaskRecord> {
    const { projectId, ...rest } = payload;

    const insertPayload = {
        ...normalizeTaskInput(rest, rest.orderIndex ?? 0),
        project_id: projectId
    };

    const { data, error } = await supabaseAdmin
        .from('project_tasks')
        .insert(insertPayload)
        .select('id, project_id, name, date, location, status, order_index, completed_at')
        .single();

    if (error) {
        throw new Error(error.message);
    }

    return toTaskRecord(data as TaskRow);
}

export async function updateTask(taskId: string, payload: UpdateTaskPayload): Promise<ProjectTaskRecord> {
    const updates: Record<string, unknown> = {};

    if (payload.name !== undefined) {
        updates.name = payload.name;
    }
    if (payload.date !== undefined) {
        updates.date = payload.date ?? null;
    }
    if (payload.location !== undefined) {
        updates.location = payload.location ?? null;
    }
    if (payload.status !== undefined) {
        updates.status = payload.status;
        if (payload.status === 'COMPLETE') {
            updates.completed_at = payload.completedAt ?? new Date().toISOString();
        } else if (payload.completedAt === undefined) {
            updates.completed_at = null;
        }
    }
    if (payload.orderIndex !== undefined) {
        updates.order_index = payload.orderIndex;
    }
    if (payload.completedAt !== undefined) {
        updates.completed_at = payload.completedAt;
    }

    const { data, error } = await supabaseAdmin
        .from('project_tasks')
        .update(updates)
        .eq('id', taskId)
        .select('id, project_id, name, date, location, status, order_index, completed_at')
        .single();

    if (error) {
        throw new Error(error.message);
    }

    return toTaskRecord(data as TaskRow);
}

export async function deleteTask(taskId: string): Promise<void> {
    const { error } = await supabaseAdmin.from('project_tasks').delete().eq('id', taskId);
    if (error) {
        throw new Error(error.message);
    }
}

export async function getProjectById(projectId: string): Promise<ProjectRecord | null> {
    const row = await fetchProjectRowById(projectId);
    if (!row) {
        return null;
    }

    const tasksMap = await fetchTasksByProjectIds([projectId]);
    const invoicesMap = await fetchInvoicesForProjects([row]);

    return buildProjectRecord(row, tasksMap, invoicesMap);
}
