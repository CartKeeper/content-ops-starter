import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import {
    addTaskToProject,
    findProjectIndex,
    loadProjects,
    saveProjects
} from '../../../../../server/projects/store';
import {
    PROJECT_TASK_STATUSES,
    type ProjectRecord,
    type ProjectTaskInput
} from '../../../../../types/project';

type ErrorResponse = { error: string; details?: unknown };

type TaskResponse = { project: ProjectRecord } | ErrorResponse;

const taskSchema = z.object({
    name: z.string().trim().min(1, 'Task name is required'),
    date: z.string().trim().min(1).optional().nullable(),
    location: z.string().trim().min(1).optional().nullable(),
    status: z.enum(PROJECT_TASK_STATUSES).optional(),
    orderIndex: z.number().int().min(0).optional()
});

function parseProjectId(query: NextApiRequest['query']): string | null {
    const { projectId } = query;
    if (typeof projectId !== 'string') {
        return null;
    }
    return projectId;
}

async function handlePost(request: NextApiRequest, response: NextApiResponse<TaskResponse>) {
    const projectId = parseProjectId(request.query);
    if (!projectId) {
        response.status(400).json({ error: 'Invalid project id.' });
        return;
    }

    const parsed = taskSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
        response.status(400).json({ error: 'Invalid request payload.', details: parsed.error.flatten() });
        return;
    }

    const taskInput: ProjectTaskInput = {
        name: parsed.data.name,
        date: parsed.data.date ?? null,
        location: parsed.data.location ?? null,
        status: parsed.data.status ?? 'PENDING',
        orderIndex: parsed.data.orderIndex
    };

    try {
        const projects = await loadProjects();
        const index = findProjectIndex(projects, projectId);
        if (index === -1) {
            response.status(404).json({ error: 'Project not found.' });
            return;
        }

        const project = projects[index];
        const updatedProject = addTaskToProject(project, taskInput);
        const updatedProjects = [...projects];
        updatedProjects[index] = updatedProject;

        const savedProjects = await saveProjects(updatedProjects);
        const savedProject = savedProjects[index];

        response.status(201).json({ project: savedProject });
    } catch (error) {
        console.error('Failed to create task', error);
        response.status(500).json({ error: 'Failed to create task.' });
    }
}

export default async function handler(
    request: NextApiRequest,
    response: NextApiResponse<TaskResponse>
) {
    if (request.method === 'POST') {
        await handlePost(request, response);
        return;
    }

    response.setHeader('Allow', 'POST');
    response.status(405).json({ error: 'Method not allowed.' });
}

