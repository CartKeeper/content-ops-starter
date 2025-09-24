import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import {
    createProjectRecord,
    loadProjects,
    resolveClientName,
    saveProjects
} from '../../../server/projects/store';
import {
    PROJECT_STATUSES,
    PROJECT_TASK_STATUSES,
    type ProjectInput,
    type ProjectListResponse,
    type ProjectRecord,
    type ProjectTaskInput
} from '../../../types/project';

const projectSchema = z.object({
    title: z.string().trim().min(1, 'Title is required'),
    clientId: z.string().trim().min(1, 'Client is required'),
    status: z.enum(PROJECT_STATUSES),
    startDate: z.string().trim().min(1).optional().nullable(),
    endDate: z.string().trim().min(1).optional().nullable(),
    description: z.string().trim().min(1).optional().nullable(),
    tags: z.array(z.string().trim()).optional(),
    createdBy: z.string().trim().min(1).optional().nullable()
});

const taskSchema = z.object({
    id: z.string().trim().optional(),
    name: z.string().trim().min(1, 'Task name is required'),
    date: z.string().trim().min(1).optional().nullable(),
    location: z.string().trim().min(1).optional().nullable(),
    status: z.enum(PROJECT_TASK_STATUSES).optional(),
    orderIndex: z.number().int().min(0).optional()
});

const createPayloadSchema = z.object({
    project: projectSchema,
    tasks: z.array(taskSchema).optional()
});

type ErrorResponse = { error: string; details?: unknown };

type ProjectsResponse = ProjectListResponse | { project: ProjectRecord } | ErrorResponse;

function parsePage(query: NextApiRequest['query']): { page: number; pageSize: number } {
    const pageValue = typeof query.page === 'string' ? Number.parseInt(query.page, 10) : NaN;
    const pageSizeValue = typeof query.pageSize === 'string' ? Number.parseInt(query.pageSize, 10) : NaN;

    const page = Number.isFinite(pageValue) && pageValue > 0 ? pageValue : 1;
    const pageSize = Number.isFinite(pageSizeValue) && pageSizeValue > 0 ? Math.min(pageSizeValue, 100) : 25;

    return { page, pageSize };
}

function applyFilters(projects: ProjectRecord[], query: NextApiRequest['query']): ProjectRecord[] {
    let filtered = [...projects];

    const searchQuery = typeof query.q === 'string' ? query.q.trim().toLowerCase() : '';
    if (searchQuery) {
        filtered = filtered.filter((project) => {
            const haystack = [
                project.title,
                project.description ?? '',
                project.clientName ?? ''
            ]
                .concat(project.tags ?? [])
                .map((value) => value.toLowerCase());

            return haystack.some((value) => value.includes(searchQuery));
        });
    }

    const tagFilter = typeof query.tag === 'string' ? query.tag.trim().toLowerCase() : '';
    if (tagFilter) {
        filtered = filtered.filter((project) =>
            (project.tags ?? []).some((tag) => tag.toLowerCase() === tagFilter)
        );
    }

    const statusFilter = typeof query.status === 'string' ? query.status.trim().toUpperCase() : '';
    if (statusFilter && statusFilter !== 'ALL') {
        filtered = filtered.filter((project) => project.status === statusFilter);
    }

    return filtered;
}

async function handleGet(request: NextApiRequest, response: NextApiResponse<ProjectsResponse>) {
    try {
        const projects = await loadProjects();
        const filtered = applyFilters(projects, request.query).sort((a, b) => {
            const aTime = new Date(a.updatedAt).getTime();
            const bTime = new Date(b.updatedAt).getTime();
            return bTime - aTime;
        });

        const { page, pageSize } = parsePage(request.query);
        const total = filtered.length;
        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const data = filtered.slice(startIndex, endIndex);

        response.status(200).json({ data, page, pageSize, total });
    } catch (error) {
        console.error('Failed to load projects', error);
        response.status(500).json({ error: 'Failed to load projects.' });
    }
}

async function handlePost(request: NextApiRequest, response: NextApiResponse<ProjectsResponse>) {
    const parsed = createPayloadSchema.safeParse(request.body);
    if (!parsed.success) {
        response.status(400).json({ error: 'Invalid request payload.', details: parsed.error.flatten() });
        return;
    }

    const { project, tasks = [] } = parsed.data;

    const projectInput: ProjectInput = {
        title: project.title,
        clientId: project.clientId,
        status: project.status,
        startDate: project.startDate ?? null,
        endDate: project.endDate ?? null,
        description: project.description ?? null,
        tags: project.tags ?? [],
        createdBy: project.createdBy ?? null
    };

    const taskInputs: ProjectTaskInput[] = tasks.map((task) => ({
        id: task.id,
        name: task.name,
        date: task.date ?? null,
        location: task.location ?? null,
        status: task.status ?? 'PENDING',
        orderIndex: task.orderIndex
    }));

    try {
        const projects = await loadProjects();
        const existingName = projects.find((entry) => entry.clientId === projectInput.clientId)?.clientName ?? null;
        const clientName = existingName ?? (await resolveClientName(projectInput.clientId));

        const newProject = createProjectRecord(projectInput, {
            clientName,
            tasks: taskInputs
        });

        const updatedProjects = await saveProjects([...projects, newProject]);
        const saved = updatedProjects.find((entry) => entry.id === newProject.id) ?? newProject;

        response.status(201).json({ project: saved });
    } catch (error) {
        console.error('Failed to create project', error);
        response.status(500).json({ error: 'Failed to create project.' });
    }
}

export default async function handler(
    request: NextApiRequest,
    response: NextApiResponse<ProjectsResponse>
) {
    if (request.method === 'GET') {
        await handleGet(request, response);
        return;
    }

    if (request.method === 'POST') {
        await handlePost(request, response);
        return;
    }

    response.setHeader('Allow', 'GET,POST');
    response.status(405).json({ error: 'Method not allowed.' });
}

