import { PROJECT_STATUSES, PROJECT_TASK_STATUSES, type ProjectListFilters, type ProjectListResponse, type ProjectRecord, type ProjectStatus, type ProjectTaskRecord, type ProjectTaskStatus, type ProjectInvoiceSnippet } from '../../types/project';
import { readCmsCollection } from '../../utils/read-cms-collection';

const PROJECT_STATUS_SET = new Set(PROJECT_STATUSES);
const TASK_STATUS_SET = new Set(PROJECT_TASK_STATUSES);
const INVOICE_STATUS_SET: Set<ProjectInvoiceSnippet['status']> = new Set(['PAID', 'SENT', 'OVERDUE', 'DRAFT']);

const FALLBACK_FILE_NAME = 'crm-projects.json';

function normalizeString(value: unknown, fallback: string): string {
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed.length > 0) {
            return trimmed;
        }
    }
    return fallback;
}

function normalizeOptionalString(value: unknown): string | null {
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed.length > 0) {
            return trimmed;
        }
    }
    return null;
}

function normalizeDate(value: unknown): string | null {
    if (typeof value !== 'string') {
        return null;
    }
    const trimmed = value.trim();
    if (!trimmed) {
        return null;
    }
    return trimmed;
}

function normalizeIsoDate(value: unknown, fallback: string): string {
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed) {
            const parsed = new Date(trimmed);
            if (!Number.isNaN(parsed.getTime())) {
                return parsed.toISOString();
            }
        }
    }
    return fallback;
}

function normalizeProjectStatus(value: unknown): ProjectStatus {
    if (typeof value === 'string') {
        const candidate = value.trim().toUpperCase();
        if (PROJECT_STATUS_SET.has(candidate as ProjectStatus)) {
            return candidate as ProjectStatus;
        }
    }
    return 'PLANNING';
}

function normalizeTaskStatus(value: unknown): ProjectTaskStatus {
    if (typeof value === 'string') {
        const candidate = value.trim().toUpperCase();
        if (TASK_STATUS_SET.has(candidate as ProjectTaskStatus)) {
            return candidate as ProjectTaskStatus;
        }
    }
    return 'PENDING';
}

function normalizeInvoiceStatus(value: unknown): ProjectInvoiceSnippet['status'] {
    if (typeof value === 'string') {
        const candidate = value.trim().toUpperCase() as ProjectInvoiceSnippet['status'];
        if (INVOICE_STATUS_SET.has(candidate)) {
            return candidate;
        }
    }
    return 'DRAFT';
}

type CmsTaskRecord = Partial<ProjectTaskRecord>;

type CmsInvoiceRecord = Partial<ProjectInvoiceSnippet>;

type CmsProjectRecord = Partial<ProjectRecord> & {
    tasks?: CmsTaskRecord[];
    invoices?: CmsInvoiceRecord[];
};

function normalizeTasks(projectId: string, records: CmsTaskRecord[] | undefined): ProjectTaskRecord[] {
    if (!Array.isArray(records)) {
        return [];
    }

    return records
        .map((record, index) => {
            const id = normalizeString(record?.id, `${projectId}-task-${index + 1}`);
            const name = normalizeString(record?.name, `Task ${index + 1}`);
            const status = normalizeTaskStatus(record?.status);
            const date = normalizeDate(record?.date);
            const location = normalizeOptionalString(record?.location);
            const orderIndex = Number.isFinite(record?.orderIndex)
                ? Number(record?.orderIndex)
                : index;
            const completedAt = normalizeOptionalString(record?.completedAt);

            return {
                id,
                projectId,
                name,
                date,
                location,
                status,
                orderIndex,
                completedAt
            } satisfies ProjectTaskRecord;
        })
        .sort((a, b) => {
            const aTime = a.date ? Date.parse(a.date) : Number.MAX_SAFE_INTEGER;
            const bTime = b.date ? Date.parse(b.date) : Number.MAX_SAFE_INTEGER;
            if (aTime !== bTime) {
                return aTime - bTime;
            }
            return a.orderIndex - b.orderIndex;
        });
}

function normalizeInvoices(records: CmsInvoiceRecord[] | undefined): ProjectInvoiceSnippet[] {
    if (!Array.isArray(records)) {
        return [];
    }

    return records.map((record, index) => {
        const id = normalizeString(record?.id, `invoice-${index + 1}`);
        const number = normalizeOptionalString(record?.number);
        const amount = typeof record?.amountCents === 'number' && Number.isFinite(record.amountCents)
            ? record.amountCents
            : null;
        const status = normalizeInvoiceStatus(record?.status);
        const dueAt = normalizeDate(record?.dueAt);

        return {
            id,
            number,
            amountCents: amount,
            status,
            dueAt
        } satisfies ProjectInvoiceSnippet;
    });
}

function normalizeCompletionPercent(raw: unknown, tasks: ProjectTaskRecord[]): number {
    if (typeof raw === 'number' && Number.isFinite(raw)) {
        return Math.min(100, Math.max(0, Math.round(raw)));
    }

    if (tasks.length === 0) {
        return 0;
    }

    const completed = tasks.filter((task) => task.status === 'COMPLETE').length;
    return Math.round((completed / tasks.length) * 100);
}

function normalizeTags(value: unknown): string[] {
    if (!Array.isArray(value)) {
        return [];
    }

    const seen = new Set<string>();
    for (const entry of value) {
        if (typeof entry !== 'string') {
            continue;
        }
        const trimmed = entry.trim();
        if (trimmed.length > 0) {
            seen.add(trimmed);
        }
    }
    return Array.from(seen);
}

function normalizeProject(record: CmsProjectRecord, index: number): ProjectRecord {
    const fallbackId = `proj-fallback-${index + 1}`;
    const id = normalizeString(record?.id, fallbackId);
    const createdAt = normalizeIsoDate(record?.createdAt, new Date(Date.now() - index * 86_400_000).toISOString());
    const updatedAt = normalizeIsoDate(record?.updatedAt, createdAt);
    const title = normalizeString(record?.title, 'Untitled project');
    const clientId = normalizeString(record?.clientId, `${id}-client`);
    const clientName = normalizeOptionalString(record?.clientName);
    const status = normalizeProjectStatus(record?.status);
    const startDate = normalizeDate(record?.startDate);
    const endDate = normalizeDate(record?.endDate);
    const description = normalizeOptionalString(record?.description);
    const tasks = normalizeTasks(id, record?.tasks);
    const invoices = normalizeInvoices(record?.invoices);
    const tags = normalizeTags(record?.tags);
    const completionPercent = normalizeCompletionPercent(record?.completionPercent, tasks);

    return {
        id,
        createdAt,
        updatedAt,
        title,
        clientId,
        clientName,
        status,
        startDate,
        endDate,
        description,
        tags,
        tasks,
        invoices,
        completionPercent
    } satisfies ProjectRecord;
}

function matchesFilters(project: ProjectRecord, filters: ProjectListFilters): boolean {
    if (filters.status && filters.status !== 'ALL' && project.status !== filters.status) {
        return false;
    }

    if (filters.tag) {
        const tag = filters.tag.trim().toLowerCase();
        if (!project.tags.some((entry) => entry.toLowerCase() === tag)) {
            return false;
        }
    }

    if (filters.q) {
        const term = filters.q.trim().toLowerCase();
        if (term.length > 0) {
            const haystacks = [project.title, project.description ?? '', project.clientName ?? ''];
            const hasMatch = haystacks.some((value) => value.toLowerCase().includes(term));
            if (!hasMatch) {
                return false;
            }
        }
    }

    return true;
}

export async function listFallbackProjects(filters: ProjectListFilters): Promise<ProjectListResponse> {
    const rawRecords = await readCmsCollection<CmsProjectRecord>(FALLBACK_FILE_NAME);
    const normalized = rawRecords.map((record, index) => normalizeProject(record ?? {}, index));

    normalized.sort((a, b) => (a.createdAt > b.createdAt ? -1 : a.createdAt < b.createdAt ? 1 : 0));

    const filtered = normalized.filter((project) => matchesFilters(project, filters));

    const pageSize = Math.max(1, Math.min(filters.pageSize ?? 12, 100));
    const page = Math.max(1, filters.page ?? 1);
    const start = (page - 1) * pageSize;
    const end = start + pageSize;

    return {
        data: filtered.slice(start, end),
        page,
        pageSize,
        total: filtered.length
    } satisfies ProjectListResponse;
}
