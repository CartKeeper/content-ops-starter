export function parseDate(value?: string | null): Date | null {
    if (!value) {
        return null;
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

export function startOfDay(date: Date): Date {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
}

export function endOfDay(date: Date): Date {
    const result = startOfDay(date);
    result.setDate(result.getDate() + 1);
    return result;
}

export function toIsoString(date: Date): string {
    return date.toISOString();
}

export function mapEvent(record: Record<string, any>) {
    return {
        id: record.id,
        owner_user_id: record.owner_user_id,
        title: record.title,
        description: record.description ?? null,
        start_at: record.start_at,
        end_at: record.end_at,
        all_day: Boolean(record.all_day),
        visibility: record.visibility ?? 'team',
        created_at: record.created_at ?? null,
        updated_at: record.updated_at ?? null
    };
}

export function buildPermissionFilter(userId: string) {
    return `owner_user_id.eq.${userId},and(owner_user_id.neq.${userId},visibility.eq.team)`;
}
