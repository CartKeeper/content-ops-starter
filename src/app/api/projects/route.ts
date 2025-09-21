import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
    PROJECT_STATUSES,
    PROJECT_TASK_STATUSES,
    type CreateProjectPayload,
    type ProjectInput,
    type ProjectListFilters,
    type ProjectTaskInput
} from '../../../types/project';
import { createProject, listProjects } from '../../../server/projects';
import { listFallbackProjects } from '../../../server/projects/fallback';
import { isSupabaseConfigured, SupabaseAdminUnavailableError } from '../../../lib/supabase-admin';

const createProjectSchema = z.object({
    project: z.object({
        title: z.string().trim().min(1, 'Title is required'),
        clientId: z.string().trim().min(1, 'Client is required'),
        status: z.enum(PROJECT_STATUSES).default('PLANNING'),
        startDate: z.union([z.string().trim(), z.null()]).optional(),
        endDate: z.union([z.string().trim(), z.null()]).optional(),
        description: z.union([z.string(), z.null()]).optional(),
        tags: z.array(z.string().trim()).optional(),
        createdBy: z.union([z.string().trim(), z.null()]).optional()
    }),
    tasks: z
        .array(
            z.object({
                name: z.string().trim().min(1, 'Task name is required'),
                date: z.union([z.string().trim(), z.null()]).optional(),
                location: z.union([z.string().trim(), z.null()]).optional(),
                status: z.enum(PROJECT_TASK_STATUSES).optional(),
                orderIndex: z.number().int().optional(),
                completedAt: z.union([z.string().trim(), z.null()]).optional()
            })
        )
        .optional()
});

function sanitizeProjectInput(input: ProjectInput): ProjectInput {
    return {
        title: input.title.trim(),
        clientId: input.clientId.trim(),
        status: input.status,
        startDate: input.startDate && input.startDate.length > 0 ? input.startDate : null,
        endDate: input.endDate && input.endDate.length > 0 ? input.endDate : null,
        description:
            input.description && input.description.trim().length > 0 ? input.description.trim() : null,
        tags: input.tags?.map((tag) => tag.trim()).filter((tag) => tag.length > 0) ?? [],
        createdBy:
            input.createdBy && input.createdBy.trim().length > 0 ? input.createdBy.trim() : null
    };
}

function sanitizeTasks(tasks: ProjectTaskInput[] | undefined): ProjectTaskInput[] {
    if (!tasks) {
        return [];
    }

    return tasks.map((task, index) => ({
        name: task.name.trim(),
        date: task.date && task.date.trim().length > 0 ? task.date.trim() : null,
        location: task.location && task.location.trim().length > 0 ? task.location.trim() : null,
        status: task.status ?? 'PENDING',
        orderIndex: typeof task.orderIndex === 'number' ? task.orderIndex : index,
        completedAt:
            task.completedAt && task.completedAt.trim().length > 0 ? task.completedAt.trim() : null
    }));
}

function parseFilters(request: NextRequest): ProjectListFilters {
    const url = new URL(request.url);
    const statusParam = url.searchParams.get('status');
    const qParam = url.searchParams.get('q');
    const tagParam = url.searchParams.get('tag');
    const pageParam = url.searchParams.get('page');
    const pageSizeParam = url.searchParams.get('pageSize');

    const normalizeStatus = (value: string | null) => {
        if (!value) {
            return undefined;
        }
        const candidate = value.toUpperCase();
        if (candidate === 'ALL') {
            return 'ALL';
        }
        return PROJECT_STATUSES.includes(candidate as (typeof PROJECT_STATUSES)[number])
            ? (candidate as (typeof PROJECT_STATUSES)[number])
            : undefined;
    };

    const safeParseInt = (value: string | null) => {
        if (!value) {
            return undefined;
        }
        const parsed = Number.parseInt(value, 10);
        return Number.isFinite(parsed) ? parsed : undefined;
    };

    return {
        status: normalizeStatus(statusParam),
        q: qParam?.trim() ? qParam.trim() : undefined,
        tag: tagParam?.trim() ? tagParam.trim() : undefined,
        page: safeParseInt(pageParam),
        pageSize: safeParseInt(pageSizeParam)
    };
}

export async function GET(request: NextRequest) {
    try {
        const filters = parseFilters(request);
        if (!isSupabaseConfigured) {
            const fallback = await listFallbackProjects(filters);
            return NextResponse.json(fallback);
        }

        const projects = await listProjects(filters);
        return NextResponse.json(projects);
    } catch (error) {
        console.error('Failed to load projects', error);
        const filters = parseFilters(request);
        const fallback = await listFallbackProjects(filters);
        return NextResponse.json(fallback, { headers: { 'x-data-source': 'fallback' } });
    }
}

export async function POST(request: NextRequest) {
    try {
        if (!isSupabaseConfigured) {
            return NextResponse.json(
                { error: 'Project storage is not configured. Add Supabase credentials to enable project creation.' },
                { status: 503 }
            );
        }

        const payload = await request.json().catch(() => null);
        const parsed = createProjectSchema.safeParse(payload ?? {});

        if (!parsed.success) {
            const issue = parsed.error.issues[0];
            const message = issue?.message ?? 'Invalid project payload.';
            return NextResponse.json({ error: message }, { status: 400 });
        }

        const sanitized: CreateProjectPayload = {
            project: sanitizeProjectInput(parsed.data.project),
            tasks: sanitizeTasks(parsed.data.tasks)
        };

        const project = await createProject(sanitized);
        return NextResponse.json({ project }, { status: 201 });
    } catch (error) {
        const status = error instanceof SupabaseAdminUnavailableError ? 503 : 500;
        console.error('Failed to create project', error);
        const message =
            status === 503
                ? 'Project storage is not configured. Add Supabase credentials to enable project creation.'
                : 'Unable to create project.';
        return NextResponse.json({ error: message }, { status });
    }
}
