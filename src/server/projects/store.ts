import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';

import {
    PROJECT_TASK_STATUSES,
    type ProjectInput,
    type ProjectInvoiceSnippet,
    type ProjectRecord,
    type ProjectTaskInput,
    type ProjectTaskRecord,
    type ProjectTaskStatus
} from '../../types/project';
import { readCmsCollection } from '../../utils/read-cms-collection';

const DATA_DIRECTORY = path.join(process.cwd(), 'content', 'data');
const PROJECTS_FILE = path.join(DATA_DIRECTORY, 'crm-projects.json');
const PROJECTS_FILE_TYPE = 'CrmProjects';

const TASK_STATUS_SET = new Set(PROJECT_TASK_STATUSES);

const TASK_STATUS_WEIGHTS: Record<ProjectTaskStatus, number> = {
    PENDING: 0,
    CONFIRMED: 0.5,
    EDITING: 0.75,
    COMPLETE: 1
};

type ProjectsFilePayload = { type?: string; items?: ProjectRecord[] } | ProjectRecord[];

type ClientSummary = { id?: string; name?: string | null };

let cachedClientSummaries: ClientSummary[] | null = null;

function sanitizeTags(tags: string[] | undefined): string[] {
    if (!Array.isArray(tags)) {
        return [];
    }

    const unique = new Set<string>();
    tags.forEach((tag) => {
        if (typeof tag !== 'string') {
            return;
        }
        const trimmed = tag.trim();
        if (trimmed.length > 0) {
            unique.add(trimmed);
        }
    });

    return Array.from(unique);
}

function normaliseTaskStatus(status: ProjectTaskStatus | undefined): ProjectTaskStatus {
    if (!status) {
        return 'PENDING';
    }
    return TASK_STATUS_SET.has(status) ? status : 'PENDING';
}

function normaliseTaskRecord(
    projectId: string,
    task: ProjectTaskRecord,
    fallbackIndex: number
): ProjectTaskRecord {
    const orderIndex = Number.isFinite(task.orderIndex) ? task.orderIndex : fallbackIndex;
    const status = normaliseTaskStatus(task.status);

    let completedAt = task.completedAt ?? null;
    if (status === 'COMPLETE' && !completedAt) {
        completedAt = new Date().toISOString();
    }
    if (status !== 'COMPLETE') {
        completedAt = null;
    }

    return {
        id: task.id ?? randomUUID(),
        projectId,
        name: task.name,
        date: task.date ?? null,
        location: task.location ?? null,
        status,
        orderIndex,
        completedAt
    };
}

function buildTaskRecord(
    projectId: string,
    input: ProjectTaskInput,
    fallbackIndex: number,
    existing?: ProjectTaskRecord
): ProjectTaskRecord {
    const name = typeof input.name === 'string' ? input.name.trim() : existing?.name ?? '';
    if (!name) {
        throw new Error('Task name is required.');
    }

    const status = normaliseTaskStatus(input.status ?? existing?.status);
    const orderIndex = Number.isFinite(input.orderIndex) ? (input.orderIndex as number) : existing?.orderIndex ?? fallbackIndex;
    const providedId = typeof input.id === 'string' ? input.id.trim() : '';

    let completedAt = existing?.completedAt ?? null;
    if (status === 'COMPLETE' && !completedAt) {
        completedAt = new Date().toISOString();
    }
    if (status !== 'COMPLETE') {
        completedAt = null;
    }

    return {
        id: existing?.id ?? (providedId || randomUUID()),
        projectId,
        name,
        date: input.date ?? existing?.date ?? null,
        location: input.location ?? existing?.location ?? null,
        status,
        orderIndex,
        completedAt
    };
}

function normaliseInvoice(invoice: ProjectInvoiceSnippet): ProjectInvoiceSnippet {
    return {
        id: invoice.id,
        number: invoice.number ?? null,
        amountCents:
            typeof invoice.amountCents === 'number' && Number.isFinite(invoice.amountCents)
                ? Math.round(invoice.amountCents)
                : null,
        status: invoice.status,
        dueAt: invoice.dueAt ?? null
    };
}

function clampCompletion(value: number): number {
    if (!Number.isFinite(value)) {
        return 0;
    }
    if (value < 0) {
        return 0;
    }
    if (value > 100) {
        return 100;
    }
    return Math.round(value);
}

function normaliseProjectRecord(
    project: ProjectRecord,
    options: { preserveCompletionPercent?: boolean } = {}
): ProjectRecord {
    const createdAt = project.createdAt ?? new Date().toISOString();
    const updatedAt = project.updatedAt ?? createdAt;

    const tasks = Array.isArray(project.tasks) ? project.tasks : [];
    const normalisedTasks = tasks
        .map((task, index) => normaliseTaskRecord(project.id, task, index))
        .sort((a, b) => {
            if (a.orderIndex !== b.orderIndex) {
                return a.orderIndex - b.orderIndex;
            }
            return a.name.localeCompare(b.name);
        })
        .map((task, index) => ({ ...task, orderIndex: index }));

    const completionPercent = options.preserveCompletionPercent
        ? clampCompletion(project.completionPercent ?? computeCompletionPercent(normalisedTasks))
        : computeCompletionPercent(normalisedTasks);

    return {
        ...project,
        createdAt,
        updatedAt,
        startDate: project.startDate ?? null,
        endDate: project.endDate ?? null,
        description: project.description ?? null,
        clientName: project.clientName ?? null,
        tags: sanitizeTags(project.tags),
        tasks: normalisedTasks,
        invoices: Array.isArray(project.invoices) ? project.invoices.map(normaliseInvoice) : [],
        completionPercent
    };
}

async function readProjectsFromFile(): Promise<ProjectRecord[]> {
    try {
        const raw = await fs.readFile(PROJECTS_FILE, 'utf-8');
        const parsed = JSON.parse(raw) as ProjectsFilePayload;

        if (Array.isArray(parsed)) {
            return parsed.map((project) => normaliseProjectRecord(project, { preserveCompletionPercent: true }));
        }

        if (parsed && Array.isArray(parsed.items)) {
            return parsed.items.map((project) => normaliseProjectRecord(project, { preserveCompletionPercent: true }));
        }
    } catch (error) {
        // If the file doesn't exist yet we'll treat it as having no projects.
    }

    return [];
}

function createFilePayload(projects: ProjectRecord[]): string {
    const payload = {
        type: PROJECTS_FILE_TYPE,
        items: projects.map((project) => normaliseProjectRecord(project))
    };
    return `${JSON.stringify(payload, null, 4)}\n`;
}

async function ensureDataDirectory(): Promise<void> {
    await fs.mkdir(DATA_DIRECTORY, { recursive: true });
}

async function loadClientSummaries(): Promise<ClientSummary[]> {
    if (cachedClientSummaries) {
        return cachedClientSummaries;
    }

    const clients = await readCmsCollection<ClientSummary>('crm-clients.json');
    cachedClientSummaries = clients;
    return clients;
}

function findClientName(clients: ClientSummary[], clientId: string): string | null {
    const summary = clients.find((client) => typeof client?.id === 'string' && client.id === clientId);
    if (!summary) {
        return null;
    }

    const name = typeof summary.name === 'string' ? summary.name.trim() : '';
    return name.length > 0 ? name : null;
}

export function computeCompletionPercent(tasks: ProjectTaskRecord[]): number {
    if (!tasks.length) {
        return 0;
    }

    const total = tasks.reduce((accumulator, task) => {
        return accumulator + (TASK_STATUS_WEIGHTS[task.status] ?? 0);
    }, 0);

    const percent = (total / tasks.length) * 100;
    return clampCompletion(percent);
}

export async function loadProjects(): Promise<ProjectRecord[]> {
    return readProjectsFromFile();
}

export async function saveProjects(projects: ProjectRecord[]): Promise<ProjectRecord[]> {
    const normalised = projects.map((project) => normaliseProjectRecord(project));
    await ensureDataDirectory();
    await fs.writeFile(PROJECTS_FILE, createFilePayload(normalised), 'utf-8');
    return normalised;
}

export function findProjectIndex(projects: ProjectRecord[], projectId: string): number {
    return projects.findIndex((project) => project.id === projectId);
}

export function updateProjectRecord(
    project: ProjectRecord,
    updates: Partial<Omit<ProjectInput, 'clientId'>> & { clientId?: string }
): ProjectRecord {
    const tags = updates.tags ? sanitizeTags(updates.tags) : project.tags;

    const next: ProjectRecord = {
        ...project,
        title: updates.title ?? project.title,
        status: updates.status ?? project.status,
        startDate: updates.startDate ?? project.startDate ?? null,
        endDate: updates.endDate ?? project.endDate ?? null,
        description: updates.description ?? project.description ?? null,
        tags,
        clientId: updates.clientId ?? project.clientId
    };

    return next;
}

export async function resolveClientName(clientId: string): Promise<string | null> {
    if (!clientId) {
        return null;
    }

    const clients = await loadClientSummaries();
    return findClientName(clients, clientId);
}

export async function listProjectClients(): Promise<Array<{ id: string; name: string }>> {
    const clients = await loadClientSummaries();
    return clients
        .map((client) => {
            if (typeof client?.id !== 'string') {
                return null;
            }
            const name = typeof client.name === 'string' ? client.name.trim() : '';
            if (!name) {
                return null;
            }
            return { id: client.id, name };
        })
        .filter((entry): entry is { id: string; name: string } => Boolean(entry))
        .sort((a, b) => a.name.localeCompare(b.name));
}

export function createProjectRecord(
    input: ProjectInput,
    options: { clientName?: string | null; tasks?: ProjectTaskInput[] }
): ProjectRecord {
    const now = new Date().toISOString();
    const projectId = randomUUID();
    const tags = sanitizeTags(input.tags);

    const tasksInput = Array.isArray(options.tasks) ? options.tasks : [];
    const taskRecords = tasksInput.map((task, index) => buildTaskRecord(projectId, task, index));

    return normaliseProjectRecord(
        {
            id: projectId,
            createdAt: now,
            updatedAt: now,
            title: input.title,
            clientId: input.clientId,
            clientName: options.clientName ?? null,
            status: input.status,
            startDate: input.startDate ?? null,
            endDate: input.endDate ?? null,
            description: input.description ?? null,
            tags,
            tasks: taskRecords,
            invoices: [],
            completionPercent: computeCompletionPercent(taskRecords)
        },
        { preserveCompletionPercent: false }
    );
}

export function addTaskToProject(
    project: ProjectRecord,
    input: ProjectTaskInput
): ProjectRecord {
    const tasks = Array.isArray(project.tasks) ? [...project.tasks] : [];
    const fallbackIndex = tasks.length;
    const task = buildTaskRecord(project.id, input, fallbackIndex);
    tasks.push(task);

    const updated = {
        ...project,
        tasks,
        updatedAt: new Date().toISOString()
    };

    return normaliseProjectRecord(updated, { preserveCompletionPercent: false });
}

export function updateTaskInProject(
    project: ProjectRecord,
    taskId: string,
    input: ProjectTaskInput
): ProjectRecord {
    const tasks = Array.isArray(project.tasks) ? [...project.tasks] : [];
    const index = tasks.findIndex((task) => task.id === taskId);
    if (index === -1) {
        throw new Error('Task not found');
    }

    const existing = tasks[index];
    const updatedTask = buildTaskRecord(project.id, input, index, existing);
    tasks[index] = { ...existing, ...updatedTask, id: existing.id };

    const updated = {
        ...project,
        tasks,
        updatedAt: new Date().toISOString()
    };

    return normaliseProjectRecord(updated, { preserveCompletionPercent: false });
}

export function removeTaskFromProject(project: ProjectRecord, taskId: string): ProjectRecord {
    const tasks = Array.isArray(project.tasks) ? project.tasks.filter((task) => task.id !== taskId) : [];

    const updated = {
        ...project,
        tasks,
        updatedAt: new Date().toISOString()
    };

    return normaliseProjectRecord(updated, { preserveCompletionPercent: false });
}

export function touchProject(project: ProjectRecord): ProjectRecord {
    return {
        ...project,
        updatedAt: new Date().toISOString()
    };
}

