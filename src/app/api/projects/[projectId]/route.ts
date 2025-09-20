import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { PROJECT_STATUSES, type UpdateProjectPayload } from '../../../../types/project';
import { deleteProject, updateProject } from '../../../../server/projects';

const updateProjectSchema = z.object({
    title: z.string().trim().min(1).optional(),
    clientId: z.string().trim().min(1).optional(),
    status: z.enum(PROJECT_STATUSES).optional(),
    startDate: z.union([z.string().trim(), z.null()]).optional(),
    endDate: z.union([z.string().trim(), z.null()]).optional(),
    description: z.union([z.string(), z.null()]).optional(),
    tags: z.array(z.string().trim()).optional(),
    createdBy: z.union([z.string().trim(), z.null()]).optional()
});

function sanitizeUpdateInput(input: z.infer<typeof updateProjectSchema>): UpdateProjectPayload {
    const payload: UpdateProjectPayload = {};

    if (input.title !== undefined) {
        payload.title = input.title.trim();
    }
    if (input.clientId !== undefined) {
        payload.clientId = input.clientId.trim();
    }
    if (input.status !== undefined) {
        payload.status = input.status;
    }
    if (input.startDate !== undefined) {
        payload.startDate = input.startDate && input.startDate.length > 0 ? input.startDate : null;
    }
    if (input.endDate !== undefined) {
        payload.endDate = input.endDate && input.endDate.length > 0 ? input.endDate : null;
    }
    if (input.description !== undefined) {
        payload.description = input.description && input.description.trim().length > 0 ? input.description.trim() : null;
    }
    if (input.tags !== undefined) {
        payload.tags = input.tags.map((tag) => tag.trim()).filter((tag) => tag.length > 0);
    }
    if (input.createdBy !== undefined) {
        payload.createdBy = input.createdBy && input.createdBy.trim().length > 0 ? input.createdBy.trim() : null;
    }

    return payload;
}

export async function PATCH(
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
        const parsed = updateProjectSchema.safeParse(payload ?? {});

        if (!parsed.success) {
            const issue = parsed.error.issues[0];
            const message = issue?.message ?? 'Invalid project update.';
            return NextResponse.json({ error: message }, { status: 400 });
        }

        const project = await updateProject(projectId, sanitizeUpdateInput(parsed.data));
        return NextResponse.json({ project });
    } catch (error) {
        console.error('Failed to update project', error);
        return NextResponse.json({ error: 'Unable to update project.' }, { status: 500 });
    }
}

export async function DELETE(
    _request: NextRequest,
    context: { params: Promise<Record<string, string | string[] | undefined>> }
) {
    const params = await context.params;
    const projectIdParam = params?.projectId;
    const projectId = Array.isArray(projectIdParam) ? projectIdParam[0] : projectIdParam;
    if (!projectId) {
        return NextResponse.json({ error: 'Project ID is required.' }, { status: 400 });
    }

    try {
        await deleteProject(projectId);
        return NextResponse.json({ success: true }, { status: 204 });
    } catch (error) {
        console.error('Failed to delete project', error);
        return NextResponse.json({ error: 'Unable to delete project.' }, { status: 500 });
    }
}
