import { z } from 'zod';

export const calendarVisibilitySchema = z.enum(['team', 'private']);

export const calendarEventBaseSchema = z.object({
    title: z.string().min(1, 'Title is required.'),
    description: z.string().optional(),
    start_at: z.string().min(1, 'Start time is required.'),
    end_at: z.string().min(1, 'End time is required.'),
    all_day: z.boolean().optional(),
    owner_user_id: z.string().uuid({ message: 'Select a valid owner.' }).optional(),
    visibility: calendarVisibilitySchema.optional()
});

export const calendarEventCreateSchema = calendarEventBaseSchema;

export const calendarEventUpdateSchema = calendarEventBaseSchema.partial();

export type CalendarEventCreateInput = z.infer<typeof calendarEventCreateSchema>;
export type CalendarEventUpdateInput = z.infer<typeof calendarEventUpdateSchema>;
