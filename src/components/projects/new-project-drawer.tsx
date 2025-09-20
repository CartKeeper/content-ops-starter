import { zodResolver } from '@hookform/resolvers/zod';
import {
    DndContext,
    MouseSensor,
    TouchSensor,
    closestCenter,
    type DragEndEvent,
    useSensor,
    useSensors
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import * as React from 'react';
import { Controller, type FieldErrors, useFieldArray, useForm } from 'react-hook-form';
import { HiOutlineBars3, HiOutlinePlus, HiOutlineTrash } from 'react-icons/hi2';
import useSWR from 'swr';
import { z } from 'zod';

import { Button } from '../ui/button';
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle
} from '../ui/drawer';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { PROJECT_STATUSES, PROJECT_TASK_STATUSES, type ProjectRecord } from '../../types/project';

const fetcher = async <T,>(url: string): Promise<T> => {
    const response = await fetch(url);
    if (!response.ok) {
        const message = await response.text();
        throw new Error(message || 'Request failed');
    }
    return (await response.json()) as T;
};

type ClientOption = {
    id: string;
    name: string;
};

const dateField = z
    .union([z.string(), z.undefined(), z.null()])
    .transform((value) => (value ?? '').trim())
    .refine((value) => value.length === 0 || !Number.isNaN(Date.parse(value)), {
        message: 'Enter a valid date'
    });

const taskSchema = z.object({
    id: z.string().optional(),
    name: z.string().trim().min(1, 'Task name is required'),
    date: dateField,
    location: z.string().optional().transform((value) => (value ?? '').trim()),
    status: z.enum(PROJECT_TASK_STATUSES).default('PENDING')
});

const formSchema = z.object({
    title: z.string().trim().min(1, 'Title is required'),
    clientId: z.string().trim().min(1, 'Client is required'),
    status: z.enum(PROJECT_STATUSES).default('PLANNING'),
    startDate: dateField,
    endDate: dateField,
    description: z.string().optional(),
    tags: z.array(z.string().min(1)).default([]),
    tasks: z.array(taskSchema).default([])
});

type FormValues = z.infer<typeof formSchema>;

type NewProjectDrawerProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onProjectCreated: (project: ProjectRecord) => void;
};

type TagsInputProps = {
    value: string[];
    onChange: (tags: string[]) => void;
};

function TagsInput({ value, onChange }: TagsInputProps) {
    const [inputValue, setInputValue] = React.useState('');

    const addTag = React.useCallback(
        (tag: string) => {
            const trimmed = tag.trim();
            if (!trimmed) {
                return;
            }
            if (value.includes(trimmed)) {
                setInputValue('');
                return;
            }
            onChange([...value, trimmed]);
            setInputValue('');
        },
        [onChange, value]
    );

    const handleKeyDown = React.useCallback(
        (event: React.KeyboardEvent<HTMLInputElement>) => {
            if (event.key === 'Enter' || event.key === ',') {
                event.preventDefault();
                addTag(inputValue);
            }
        },
        [addTag, inputValue]
    );

    const handleBlur = React.useCallback(() => {
        if (inputValue.trim()) {
            addTag(inputValue);
        }
    }, [addTag, inputValue]);

    const removeTag = React.useCallback(
        (tag: string) => {
            onChange(value.filter((existing) => existing !== tag));
        },
        [onChange, value]
    );

    return (
        <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
                {value.map((tag) => (
                    <Badge
                        key={tag}
                        variant="neutral"
                        className="border-slate-700/80 bg-slate-900/80 text-xs uppercase tracking-wide text-slate-300"
                    >
                        <span>{tag}</span>
                        <button
                            type="button"
                            className="ml-2 text-slate-400 transition hover:text-slate-200"
                            onClick={() => removeTag(tag)}
                        >
                            ×
                        </button>
                    </Badge>
                ))}
                <Input
                    value={inputValue}
                    onChange={(event) => setInputValue(event.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={handleBlur}
                    placeholder={value.length === 0 ? 'Add tags (press Enter)' : 'Add another tag'}
                    className="h-9 w-auto min-w-[140px] flex-1 border-dashed border-slate-700/60 bg-slate-900/50 px-3 text-xs"
                />
            </div>
        </div>
    );
}

type SortableTaskItemProps = {
    fieldId: string;
    index: number;
    register: ReturnType<typeof useForm<FormValues>>['register'];
    control: ReturnType<typeof useForm<FormValues>>['control'];
    remove: (index: number) => void;
    error?: FieldErrors<FormValues['tasks'][number]>;
};

function FieldError({ message }: { message?: string }) {
    if (!message) {
        return null;
    }
    return <p className="text-xs text-rose-300">{message}</p>;
}

function SortableTaskItem({ fieldId, index, register, control, remove, error }: SortableTaskItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: fieldId });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition
    };

    const taskError = error ?? {};

    return (
        <li
            ref={setNodeRef}
            style={style}
            className={`rounded-2xl border border-slate-800/70 bg-slate-900/60 p-4 shadow-inner shadow-slate-950/30 transition ${
                isDragging ? 'ring-2 ring-indigo-400' : ''
            }`}
        >
            <div className="flex items-start gap-3">
                <button
                    type="button"
                    className="mt-1 text-slate-500 transition hover:text-slate-200"
                    {...listeners}
                    {...attributes}
                    aria-label="Reorder task"
                >
                    <HiOutlineBars3 className="h-5 w-5" />
                </button>
                <div className="flex-1 space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor={`task-name-${fieldId}`}>Task name</Label>
                            <Input id={`task-name-${fieldId}`} {...register(`tasks.${index}.name` as const)} />
                            <FieldError message={taskError?.name?.message} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor={`task-date-${fieldId}`}>Date</Label>
                            <Input id={`task-date-${fieldId}`} type="date" {...register(`tasks.${index}.date` as const)} />
                            <FieldError message={taskError?.date?.message} />
                        </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor={`task-location-${fieldId}`}>Location</Label>
                            <Input id={`task-location-${fieldId}`} {...register(`tasks.${index}.location` as const)} />
                            <FieldError message={taskError?.location?.message} />
                        </div>
                        <Controller
                            control={control}
                            name={`tasks.${index}.status` as const}
                            render={({ field }) => (
                                <div className="space-y-2">
                                    <Label htmlFor={`task-status-${fieldId}`}>Status</Label>
                                    <Select
                                        id={`task-status-${fieldId}`}
                                        value={field.value}
                                        onChange={(event) => field.onChange(event.target.value)}
                                    >
                                        {PROJECT_TASK_STATUSES.map((status) => (
                                            <option key={status} value={status}>
                                                {status.replace(/_/g, ' ')}
                                            </option>
                                        ))}
                                    </Select>
                                </div>
                            )}
                        />
                    </div>
                </div>
                <button
                    type="button"
                    className="ml-2 mt-1 text-slate-500 transition hover:text-rose-300"
                    onClick={() => remove(index)}
                    aria-label="Remove task"
                >
                    <HiOutlineTrash className="h-5 w-5" />
                </button>
            </div>
        </li>
    );
}

export function NewProjectDrawer({ open, onOpenChange, onProjectCreated }: NewProjectDrawerProps) {
    const {
        register,
        control,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting }
    } = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: '',
            clientId: '',
            status: 'PLANNING',
            startDate: '',
            endDate: '',
            description: '',
            tags: [],
            tasks: []
        }
    });

    const {
        fields: taskFields,
        append: appendTask,
        remove: removeTask,
        move: moveTask
    } = useFieldArray({ control, name: 'tasks' });

    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
    );

    const [submitError, setSubmitError] = React.useState<string | null>(null);

    const { data: clientsData } = useSWR<{ clients: ClientOption[] }>(
        open ? '/api/projects/clients' : null,
        fetcher
    );

    const clients = clientsData?.clients ?? [];

    const onDragEnd = React.useCallback(
        (event: DragEndEvent) => {
            const { active, over } = event;
            if (!over || active.id === over.id) {
                return;
            }
            const oldIndex = taskFields.findIndex((field) => field.id === active.id);
            const newIndex = taskFields.findIndex((field) => field.id === over.id);
            if (oldIndex === -1 || newIndex === -1) {
                return;
            }
            moveTask(oldIndex, newIndex);
        },
        [moveTask, taskFields]
    );

    const onSubmit = React.useCallback(
        async (values: FormValues) => {
            setSubmitError(null);
            try {
                const payload = {
                    project: {
                        title: values.title.trim(),
                        clientId: values.clientId.trim(),
                        status: values.status,
                        startDate: values.startDate.length > 0 ? values.startDate : null,
                        endDate: values.endDate.length > 0 ? values.endDate : null,
                        description:
                            values.description && values.description.trim().length > 0
                                ? values.description.trim()
                                : null,
                        tags: values.tags
                    },
                    tasks: values.tasks.map((task, index) => ({
                        name: task.name.trim(),
                        date: task.date.length > 0 ? task.date : null,
                        location: task.location && task.location.length > 0 ? task.location : null,
                        status: task.status,
                        orderIndex: index
                    }))
                };

                const response = await fetch('/api/projects', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    const data = (await response.json().catch(() => null)) as { error?: string } | null;
                    throw new Error(data?.error ?? 'Failed to create project.');
                }

                const body = (await response.json()) as { project: ProjectRecord };
                onProjectCreated(body.project);
                reset();
                onOpenChange(false);
            } catch (error) {
                console.error('Create project failed', error);
                setSubmitError(error instanceof Error ? error.message : 'Failed to create project.');
            }
        },
        [onOpenChange, onProjectCreated, reset]
    );

    React.useEffect(() => {
        if (!open) {
            setSubmitError(null);
            reset();
        }
    }, [open, reset]);

    return (
        <Drawer open={open} onOpenChange={onOpenChange}>
            <DrawerContent>
                <DrawerHeader>
                    <DrawerTitle>New project</DrawerTitle>
                    <DrawerDescription>Create a project and track its timeline, tasks, and billing.</DrawerDescription>
                </DrawerHeader>
                <form className="flex flex-1 flex-col gap-6" onSubmit={handleSubmit(onSubmit)}>
                    <div className="grid gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="project-title">Title</Label>
                            <Input id="project-title" placeholder="Project title" {...register('title')} />
                            <FieldError message={errors.title?.message} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="project-client">Client</Label>
                            <Select id="project-client" {...register('clientId')} disabled={clients.length === 0}>
                                <option value="" disabled>
                                    {clients.length === 0 ? 'Loading clients…' : 'Select a client'}
                                </option>
                                {clients.map((client) => (
                                    <option key={client.id} value={client.id}>
                                        {client.name}
                                    </option>
                                ))}
                            </Select>
                            <FieldError message={errors.clientId?.message} />
                        </div>
                        <div className="grid gap-4 sm:grid-cols-3">
                            <div className="space-y-2">
                                <Label htmlFor="project-status">Status</Label>
                                <Select id="project-status" {...register('status')}>
                                    {PROJECT_STATUSES.map((status) => (
                                        <option key={status} value={status}>
                                            {status.replace(/_/g, ' ')}
                                        </option>
                                    ))}
                                </Select>
                                <FieldError message={errors.status?.message} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="project-start">Start date</Label>
                                <Input id="project-start" type="date" {...register('startDate')} />
                                <FieldError message={errors.startDate?.message} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="project-end">End date</Label>
                                <Input id="project-end" type="date" {...register('endDate')} />
                                <FieldError message={errors.endDate?.message} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="project-description">Description</Label>
                            <Textarea
                                id="project-description"
                                rows={4}
                                placeholder="Describe the project scope, deliverables, and notes."
                                {...register('description')}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Tags</Label>
                            <Controller
                                control={control}
                                name="tags"
                                render={({ field }) => <TagsInput value={field.value} onChange={field.onChange} />}
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-white">Tasks</h3>
                            <Button
                                type="button"
                                variant="ghost"
                                className="h-9 border border-slate-700/70 bg-slate-900/60 px-3 text-xs text-slate-200 hover:bg-slate-800/70"
                                onClick={() => appendTask({ name: '', date: '', location: '', status: 'PENDING' })}
                            >
                                <HiOutlinePlus className="mr-1.5 h-4 w-4" /> Add task
                            </Button>
                        </div>
                        {taskFields.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-700/70 bg-slate-900/50 p-6 text-sm text-slate-400">
                                Start building the project plan by adding tasks.
                            </div>
                        ) : (
                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                                <SortableContext items={taskFields.map((field) => field.id)} strategy={verticalListSortingStrategy}>
                                    <ul className="space-y-3">
                                        {taskFields.map((field, index) => (
                                            <SortableTaskItem
                                                key={field.id}
                                                fieldId={field.id}
                                                index={index}
                                                register={register}
                                                control={control}
                                                remove={removeTask}
                                                error={
                                                    Array.isArray(errors.tasks)
                                                        ? (errors.tasks[index] as FieldErrors<FormValues['tasks'][number]> | undefined)
                                                        : undefined
                                                }
                                            />
                                        ))}
                                    </ul>
                                </SortableContext>
                            </DndContext>
                        )}
                    </div>

                    {submitError ? (
                        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                            {submitError}
                        </div>
                    ) : null}

                    <DrawerFooter>
                        <DrawerClose asChild>
                            <Button type="button" variant="ghost" className="border border-slate-700/70 bg-slate-900/60 text-slate-200">
                                Cancel
                            </Button>
                        </DrawerClose>
                        <Button type="submit" disabled={isSubmitting} isLoading={isSubmitting}>
                            Create project
                        </Button>
                    </DrawerFooter>
                </form>
            </DrawerContent>
        </Drawer>
    );
}

export default NewProjectDrawer;
