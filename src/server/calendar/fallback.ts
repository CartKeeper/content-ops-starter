import type { SessionPayload } from '../../lib/jwt';
import { readCmsCollection } from '../../utils/read-cms-collection';

const EVENTS_FILE = 'crm-calendar-events.json';
const USERS_FILE = 'crm-users.json';

type CmsCalendarEvent = {
    id?: string;
    owner_user_id?: string;
    title?: string;
    description?: string | null;
    start_at?: string;
    end_at?: string;
    all_day?: boolean;
    visibility?: string;
    created_at?: string | null;
    updated_at?: string | null;
};

type CmsUser = {
    id?: string;
    name?: string;
    email?: string;
};

type CalendarEventResponse = {
    id: string;
    owner_user_id: string;
    title: string;
    description: string | null;
    start_at: string;
    end_at: string;
    all_day: boolean;
    visibility: 'team' | 'private';
    created_at: string | null;
    updated_at: string | null;
};

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

function normalizeIsoTimestamp(value: unknown, fallback: string): string {
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

function normalizeVisibility(value: unknown): 'team' | 'private' {
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (normalized === 'private') {
            return 'private';
        }
    }
    return 'team';
}

function ensureEndAfterStart(startAt: string, endAt: string, allDay: boolean): string {
    const startMs = Date.parse(startAt);
    const endMs = Date.parse(endAt);

    if (Number.isNaN(startMs)) {
        return endAt;
    }

    if (Number.isNaN(endMs) || endMs <= startMs) {
        const adjustment = allDay ? 86_400_000 - 1 : 3_600_000;
        return new Date(startMs + adjustment).toISOString();
    }

    return endAt;
}

function normalizeEvent(record: CmsCalendarEvent, index: number): CalendarEventResponse {
    const fallbackStart = new Date(Date.now() + index * 3_600_000);
    const startAt = normalizeIsoTimestamp(record?.start_at, fallbackStart.toISOString());
    const fallbackEnd = new Date(fallbackStart.getTime() + 3_600_000);
    const provisionalEnd = normalizeIsoTimestamp(record?.end_at, fallbackEnd.toISOString());
    const allDay = Boolean(record?.all_day);
    const endAt = ensureEndAfterStart(startAt, provisionalEnd, allDay);
    const visibility = normalizeVisibility(record?.visibility);
    const id = normalizeString(record?.id, `cal-event-${index + 1}`);
    const owner = normalizeString(record?.owner_user_id, 'studio-user');
    const title = normalizeString(record?.title, 'Calendar event');
    const description = normalizeOptionalString(record?.description);
    const createdAt = normalizeOptionalString(record?.created_at);
    const updatedAt = normalizeOptionalString(record?.updated_at) ?? createdAt;

    return {
        id,
        owner_user_id: owner,
        title,
        description,
        start_at: startAt,
        end_at: endAt,
        all_day: allDay,
        visibility,
        created_at: createdAt,
        updated_at: updatedAt
    } satisfies CalendarEventResponse;
}

function parseTime(value: string | null | undefined): number | null {
    if (!value) {
        return null;
    }
    const ms = Date.parse(value);
    return Number.isNaN(ms) ? null : ms;
}

function filterByWindow(events: CalendarEventResponse[], from?: string | null, to?: string | null): CalendarEventResponse[] {
    const fromMs = parseTime(from ?? undefined);
    const toMs = parseTime(to ?? undefined);

    return events.filter((event) => {
        const startMs = parseTime(event.start_at);
        const endMs = parseTime(event.end_at);

        if (startMs === null || endMs === null) {
            return false;
        }

        if (typeof toMs === 'number' && !(startMs < toMs)) {
            return false;
        }

        if (typeof fromMs === 'number' && !(endMs > fromMs)) {
            return false;
        }

        return true;
    });
}

function filterByUserIds(events: CalendarEventResponse[], userIds: string[] | undefined): CalendarEventResponse[] {
    if (!userIds || userIds.length === 0) {
        return events;
    }

    const normalized = userIds
        .map((value) => (typeof value === 'string' ? value.trim() : ''))
        .filter((value) => value.length > 0);

    if (normalized.length === 0) {
        return events;
    }

    const ids = new Set(normalized);
    return events.filter((event) => ids.has(event.owner_user_id));
}

function filterByPermissions(events: CalendarEventResponse[], session: SessionPayload): CalendarEventResponse[] {
    const isAdmin = session.roles.includes('admin');
    if (isAdmin) {
        return events;
    }

    return events.filter((event) => {
        if (event.owner_user_id === session.userId) {
            return true;
        }
        return event.visibility !== 'private';
    });
}

export async function getFallbackCalendarEvents(
    session: SessionPayload,
    options: { from?: string | null; to?: string | null; userIds?: string[] | undefined }
): Promise<CalendarEventResponse[]> {
    const rawEvents = await readCmsCollection<CmsCalendarEvent>(EVENTS_FILE);
    const normalized = rawEvents.map((record, index) => normalizeEvent(record ?? {}, index));

    normalized.sort((a, b) => (a.start_at < b.start_at ? -1 : a.start_at > b.start_at ? 1 : 0));

    const windowFiltered = filterByWindow(normalized, options.from, options.to);
    const userFiltered = filterByUserIds(windowFiltered, options.userIds);
    return filterByPermissions(userFiltered, session);
}

export async function getFallbackCalendarUsers(): Promise<Array<{ id: string; name: string }>> {
    const rawUsers = await readCmsCollection<CmsUser>(USERS_FILE);

    return rawUsers.map((record, index) => {
        const id = normalizeString(record?.id, `user-${index + 1}`);
        const name =
            normalizeOptionalString(record?.name) ??
            normalizeOptionalString(record?.email) ??
            `Team member ${index + 1}`;

        return { id, name };
    });
}
