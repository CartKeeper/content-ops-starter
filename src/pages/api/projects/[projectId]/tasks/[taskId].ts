import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import {
    findProjectIndex,
    loadProjects,
    removeTaskFromProject,
    saveProjects,
    updateTaskInProject
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

function parseIds(query: NextApiRequest['query']): { projectId: string; taskId: string } | null {
    const { projectId, taskId } = query;
    if (typeof projectId !== 'string' || typeof taskId !== 'string') {
        return null;
    }
    return { projectId, taskId };
}

async function handlePatch(request: NextApiRequest, response: NextApiResponse<TaskResponse>) {
    const ids = parseIds(request.query);
    if (!ids) {
        response.status(400).json({ error: 'Invalid project or task id.' });
        return;
    }

    const parsed = taskSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
        response.status(400).json({ error: 'Invalid request payload.', details: parsed.error.flatten() });
        return;
    }

    const taskInput: ProjectTaskInput = {
        id: ids.taskId,
        name: parsed.data.name,
        date: parsed.data.date ?? null,
        location: parsed.data.location ?? null,
        status: parsed.data.status,
        orderIndex: parsed.data.orderIndex
    };

    try {
        const projects = await loadProjects();
        const index = findProjectIndex(projects, ids.projectId);
        if (index === -1) {
            response.status(404).json({ error: 'Project not found.' });
            return;
        }

        const project = projects[index];
        const updatedProject = updateTaskInProject(project, ids.taskId, taskInput);
        const updatedProjects = [...projects];
        updatedProjects[index] = updatedProject;

        const savedProjects = await saveProjects(updatedProjects);
        const savedProject = savedProjects[index];

        response.status(200).json({ project: savedProject });
    } catch (error) {
        console.error('Failed to update task', error);
        response.status(500).json({ error: 'Failed to update task.' });
    }
}

async function handleDelete(request: NextApiRequest, response: NextApiResponse<TaskResponse>) {
    const ids = parseIds(request.query);
    if (!ids) {
        response.status(400).json({ error: 'Invalid project or task id.' });
        return;
    }

    try {
        const projects = await loadProjects();
        const index = findProjectIndex(projects, ids.projectId);
        if (index === -1) {
            response.status(404).json({ error: 'Project not found.' });
            return;
        }

        const project = projects[index];
        const updatedProject = removeTaskFromProject(project, ids.taskId);
        const updatedProjects = [...projects];
        updatedProjects[index] = updatedProject;

        const savedProjects = await saveProjects(updatedProjects);
        const savedProject = savedProjects[index];

        response.status(200).json({ project: savedProject });
    } catch (error) {
        console.error('Failed to delete task', error);
        response.status(500).json({ error: 'Failed to delete task.' });
    }
}

export default async function handler(
    request: NextApiRequest,
    response: NextApiResponse<TaskResponse>
) {
    if (request.method === 'PATCH') {
        await handlePatch(request, response);
        return;
    }

    if (request.method === 'DELETE') {
        await handleDelete(request, response);
        return;
    }

    response.setHeader('Allow', 'PATCH,DELETE');
    response.status(405).json({ error: 'Method not allowed.' });
}

