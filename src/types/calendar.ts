export type CalendarEventRecord = {
    id: string;
    userId: string;
    title: string;
    description: string | null;
    startTime: string;
    endTime: string;
    createdAt: string;
};
