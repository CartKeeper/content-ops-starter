export const PROJECT_STATUSES = [
    'PLANNING',
    'IN_PROGRESS',
    'ON_HOLD',
    'COMPLETE',
    'CANCELLED'
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_TASK_STATUSES = ['PENDING', 'CONFIRMED', 'EDITING', 'COMPLETE'] as const;

export type ProjectTaskStatus = (typeof PROJECT_TASK_STATUSES)[number];

export type ProjectTaskRecord = {
    id: string;
    projectId: string;
    name: string;
    date: string | null;
    location: string | null;
    status: ProjectTaskStatus;
    orderIndex: number;
    completedAt: string | null;
};

export type ProjectInvoiceSnippet = {
    id: string;
    number: string | null;
    amountCents: number | null;
    status: 'PAID' | 'SENT' | 'OVERDUE' | 'DRAFT';
    dueAt: string | null;
};

export type ProjectRecord = {
    id: string;
    createdAt: string;
    updatedAt: string;
    title: string;
    clientId: string;
    clientName: string | null;
    status: ProjectStatus;
    startDate: string | null;
    endDate: string | null;
    description: string | null;
    tags: string[];
    tasks: ProjectTaskRecord[];
    invoices: ProjectInvoiceSnippet[];
    completionPercent: number;
};

export type ProjectListResponse = {
    data: ProjectRecord[];
    page: number;
    pageSize: number;
    total: number;
};

export type ProjectListFilters = {
    status?: ProjectStatus | 'ALL';
    q?: string;
    tag?: string;
    page?: number;
    pageSize?: number;
};

export type ProjectInput = {
    title: string;
    clientId: string;
    status: ProjectStatus;
    startDate?: string | null;
    endDate?: string | null;
    description?: string | null;
    tags?: string[];
    createdBy?: string | null;
};

export type ProjectTaskInput = {
    id?: string;
    name: string;
    date?: string | null;
    location?: string | null;
    status?: ProjectTaskStatus;
    orderIndex?: number;
    completedAt?: string | null;
};

export type CreateProjectPayload = {
    project: ProjectInput;
    tasks?: ProjectTaskInput[];
};

export type UpdateProjectPayload = Partial<Omit<ProjectInput, 'clientId'>> & {
    clientId?: string;
};

export type CreateTaskPayload = ProjectTaskInput & {
    projectId: string;
};

export type UpdateTaskPayload = Partial<ProjectTaskInput> & {
    projectId: string;
};
