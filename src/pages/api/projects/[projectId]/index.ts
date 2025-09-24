import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import {
    findProjectIndex,
    loadProjects,
    resolveClientName,
    saveProjects,
    updateProjectRecord
} from '../../../../server/projects/store';
import { PROJECT_STATUSES, type ProjectRecord } from '../../../../types/project';

type ErrorResponse = { error: string; details?: unknown };

type ProjectResponse = { project: ProjectRecord } | ErrorResponse;

const updateSchema = z
    .object({
        title: z.string().trim().min(1).optional(),
        clientId: z.string().trim().min(1).optional(),
        status: z.enum(PROJECT_STATUSES).optional(),
        startDate: z.string().trim().min(1).optional().nullable(),
        endDate: z.string().trim().min(1).optional().nullable(),
        description: z.string().trim().min(1).optional().nullable(),
        tags: z.array(z.string().trim()).optional()
    })
    .strict();

function parseProjectId(query: NextApiRequest['query']): string | null {
    const { projectId } = query;
    if (typeof projectId !== 'string') {
        return null;
    }
    return projectId;
}

async function handleGet(request: NextApiRequest, response: NextApiResponse<ProjectResponse>) {
    const projectId = parseProjectId(request.query);
    if (!projectId) {
        response.status(400).json({ error: 'Invalid project id.' });
        return;
    }

    try {
        const projects = await loadProjects();
        const project = projects.find((entry) => entry.id === projectId);
        if (!project) {
            response.status(404).json({ error: 'Project not found.' });
            return;
        }

        response.status(200).json({ project });
    } catch (error) {
        console.error('Failed to load project', error);
        response.status(500).json({ error: 'Failed to load project.' });
    }
}

async function handlePatch(request: NextApiRequest, response: NextApiResponse<ProjectResponse>) {
    const projectId = parseProjectId(request.query);
    if (!projectId) {
        response.status(400).json({ error: 'Invalid project id.' });
        return;
    }

    const parsed = updateSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
        response.status(400).json({ error: 'Invalid request payload.', details: parsed.error.flatten() });
        return;
    }

    const updates = parsed.data;
    if (Object.keys(updates).length === 0) {
        response.status(400).json({ error: 'No fields provided for update.' });
        return;
    }

    try {
        const projects = await loadProjects();
        const index = findProjectIndex(projects, projectId);
        if (index === -1) {
            response.status(404).json({ error: 'Project not found.' });
            return;
        }

        const existing = projects[index];
        const originalClientId = existing.clientId;
        let next = updateProjectRecord(existing, updates);

        if (updates.clientId && updates.clientId !== originalClientId) {
            const existingName = projects
                .filter((_, position) => position !== index)
                .find((entry) => entry.clientId === updates.clientId)?.clientName;
            const clientName = existingName ?? (await resolveClientName(updates.clientId));
            next = { ...next, clientName: clientName ?? null };
        }

        next = { ...next, updatedAt: new Date().toISOString() };
        const updatedProjects = [...projects];
        updatedProjects[index] = next;

        const savedProjects = await saveProjects(updatedProjects);
        const savedProject = savedProjects[index];

        response.status(200).json({ project: savedProject });
    } catch (error) {
        console.error('Failed to update project', error);
        response.status(500).json({ error: 'Failed to update project.' });
    }
}

export default async function handler(
    request: NextApiRequest,
    response: NextApiResponse<ProjectResponse>
) {
    if (request.method === 'GET') {
        await handleGet(request, response);
        return;
    }

    if (request.method === 'PATCH') {
        await handlePatch(request, response);
        return;
    }

    response.setHeader('Allow', 'GET,PATCH');
    response.status(405).json({ error: 'Method not allowed.' });
}

