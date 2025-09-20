import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { PROJECT_TASK_STATUSES, type CreateTaskPayload } from '../../../../../types/project';
import { createTask, getProjectById } from '../../../../../server/projects';

const createTaskSchema = z.object({
    name: z.string().trim().min(1, 'Task name is required'),
    date: z.union([z.string().trim(), z.null()]).optional(),
    location: z.union([z.string().trim(), z.null()]).optional(),
    status: z.enum(PROJECT_TASK_STATUSES).optional(),
    orderIndex: z.number().int().optional(),
    completedAt: z.union([z.string().trim(), z.null()]).optional()
});

function sanitizeTask(input: z.infer<typeof createTaskSchema>, projectId: string): CreateTaskPayload {
    return {
        projectId,
        name: input.name.trim(),
        date:
            typeof input.date === 'string' && input.date.trim().length > 0 ? input.date.trim() : null,
        location:
            typeof input.location === 'string' && input.location.trim().length > 0
                ? input.location.trim()
                : null,
        status: input.status ?? 'PENDING',
        orderIndex: typeof input.orderIndex === 'number' ? input.orderIndex : 0,
        completedAt:
            typeof input.completedAt === 'string' && input.completedAt.trim().length > 0
                ? input.completedAt.trim()
                : null
    };
}

export async function POST(
    request: NextRequest,
    context: { params: Promise<Record<string, string | string[] | undefined>> }
) {
    const params = await context.params;
    const projectIdParam = params?.projectId;
    const projectId = Array.isArray(projectIdParam) ? projectIdParam[0] : projectIdParam;
    if (!projectId) {
        return NextResponse.json({ error: 'Project ID is required.' }, { status: 400 });
    }

    try {
        const payload = await request.json().catch(() => null);
        const parsed = createTaskSchema.safeParse(payload ?? {});

        if (!parsed.success) {
            const issue = parsed.error.issues[0];
            const message = issue?.message ?? 'Invalid task payload.';
            return NextResponse.json({ error: message }, { status: 400 });
        }

        const task = await createTask(sanitizeTask(parsed.data, projectId));
        const project = await getProjectById(projectId);
        return NextResponse.json({ task, project });
    } catch (error) {
        console.error('Failed to create task', error);
        return NextResponse.json({ error: 'Unable to create task.' }, { status: 500 });
    }
}
