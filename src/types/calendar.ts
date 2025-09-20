export type CalendarEventRecord = {
    id: string;
    ownerUserId: string;
    title: string;
    description: string | null;
    startAt: string;
    endAt: string;
    allDay: boolean;
    visibility: 'team' | 'private';
    createdAt: string | null;
    updatedAt: string | null;
};
