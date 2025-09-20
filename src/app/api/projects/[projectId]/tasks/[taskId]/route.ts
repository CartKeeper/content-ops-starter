import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { PROJECT_TASK_STATUSES, type UpdateTaskPayload } from '../../../../../../types/project';
import { deleteTask, getProjectById, updateTask } from '../../../../../../server/projects';

const updateTaskSchema = z.object({
    name: z.string().trim().min(1).optional(),
    date: z.union([z.string().trim(), z.null()]).optional(),
    location: z.union([z.string().trim(), z.null()]).optional(),
    status: z.enum(PROJECT_TASK_STATUSES).optional(),
    orderIndex: z.number().int().optional(),
    completedAt: z.union([z.string().trim(), z.null()]).optional()
});

function sanitizeUpdate(
    input: z.infer<typeof updateTaskSchema>,
    projectId: string
): UpdateTaskPayload {
    const payload: UpdateTaskPayload = { projectId };

    if (input.name !== undefined) {
        payload.name = input.name.trim();
    }
    if (input.date !== undefined) {
        payload.date =
            typeof input.date === 'string' && input.date.trim().length > 0 ? input.date.trim() : null;
    }
    if (input.location !== undefined) {
        payload.location =
            typeof input.location === 'string' && input.location.trim().length > 0
                ? input.location.trim()
                : null;
    }
    if (input.status !== undefined) {
        payload.status = input.status;
    }
    if (input.orderIndex !== undefined) {
        payload.orderIndex = input.orderIndex;
    }
    if (input.completedAt !== undefined) {
        payload.completedAt =
            typeof input.completedAt === 'string' && input.completedAt.trim().length > 0
                ? input.completedAt.trim()
                : null;
    }

    return payload;
}

export async function PATCH(
    request: NextRequest,
    context: { params: Promise<Record<string, string | string[] | undefined>> }
) {
    const params = await context.params;
    const projectIdParam = params?.projectId;
    const taskIdParam = params?.taskId;
    const projectId = Array.isArray(projectIdParam) ? projectIdParam[0] : projectIdParam;
    const taskId = Array.isArray(taskIdParam) ? taskIdParam[0] : taskIdParam;

    if (!projectId || !taskId) {
        return NextResponse.json({ error: 'Project and task IDs are required.' }, { status: 400 });
    }

    try {
        const payload = await request.json().catch(() => null);
        const parsed = updateTaskSchema.safeParse(payload ?? {});

        if (!parsed.success) {
            const issue = parsed.error.issues[0];
            const message = issue?.message ?? 'Invalid task update.';
            return NextResponse.json({ error: message }, { status: 400 });
        }

        const task = await updateTask(taskId, sanitizeUpdate(parsed.data, projectId));
        const project = await getProjectById(projectId);
        return NextResponse.json({ task, project });
    } catch (error) {
        console.error('Failed to update task', error);
        return NextResponse.json({ error: 'Unable to update task.' }, { status: 500 });
    }
}

export async function DELETE(
    _request: NextRequest,
    context: { params: Promise<Record<string, string | string[] | undefined>> }
) {
    const params = await context.params;
    const projectIdParam = params?.projectId;
    const taskIdParam = params?.taskId;
    const projectId = Array.isArray(projectIdParam) ? projectIdParam[0] : projectIdParam;
    const taskId = Array.isArray(taskIdParam) ? taskIdParam[0] : taskIdParam;

    if (!projectId || !taskId) {
        return NextResponse.json({ error: 'Project and task IDs are required.' }, { status: 400 });
    }

    try {
        await deleteTask(taskId);
        const project = await getProjectById(projectId);
        return NextResponse.json({ success: true, project }, { status: 200 });
    } catch (error) {
        console.error('Failed to delete task', error);
        return NextResponse.json({ error: 'Unable to delete task.' }, { status: 500 });
    }
}
