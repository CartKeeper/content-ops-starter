'use client';

import * as React from 'react';
import useSWR from 'swr';

import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select } from '../ui/select';
import { Textarea } from '../ui/textarea';
import {
    createTaskForEvent,
    fetchAssignableUsers,
    type CreateTaskInput,
    type TaskPriority,
    type TaskRecord,
    type UserSummary
} from '../../lib/supabase/tasks';
import { isSupabaseBrowserConfigured } from '../../lib/supabase-browser';

const PRIORITY_OPTIONS: TaskPriority[] = ['low', 'normal', 'high'];

type AssignTaskDialogProps = {
    eventId: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentUserId: string | null;
    onAssigned?: (task: TaskRecord) => void;
};

type FormState = {
    title: string;
    details: string;
    dueAt: string;
    priority: TaskPriority;
    assigneeId: string;
};

const defaultFormState: FormState = {
    title: '',
    details: '',
    dueAt: '',
    priority: 'normal',
    assigneeId: ''
};

export function AssignTaskDialog({ eventId, open, onOpenChange, currentUserId, onAssigned }: AssignTaskDialogProps) {
    const supabaseConfigured = React.useMemo(() => isSupabaseBrowserConfigured(), []);
    const { data: userOptions, error: usersError } = useSWR<UserSummary[]>(
        open && supabaseConfigured ? 'calendar-assignable-users' : null,
        () => fetchAssignableUsers()
    );

    const [formState, setFormState] = React.useState<FormState>(defaultFormState);
    const [isSubmitting, setSubmitting] = React.useState(false);
    const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (!open) {
            setFormState(defaultFormState);
            setErrorMessage(null);
        }
    }, [open]);

    const handleChange = <Key extends keyof FormState>(key: Key, value: FormState[Key]) => {
        setFormState((prev) => ({ ...prev, [key]: value }));
    };

    const handleAssignToMe = () => {
        if (currentUserId) {
            handleChange('assigneeId', currentUserId);
        }
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!eventId) {
            setErrorMessage('Save the event before assigning tasks.');
            return;
        }

        if (!supabaseConfigured) {
            setErrorMessage('Supabase is not configured. Contact an administrator.');
            return;
        }

        if (!currentUserId) {
            setErrorMessage('You must be signed in to assign tasks.');
            return;
        }

        if (formState.title.trim().length === 0) {
            setErrorMessage('Task title is required.');
            return;
        }

        if (!formState.assigneeId) {
            setErrorMessage('Select an assignee.');
            return;
        }

        setSubmitting(true);
        setErrorMessage(null);

        const payload: CreateTaskInput = {
            title: formState.title,
            details: formState.details.length > 0 ? formState.details : null,
            due_at: formState.dueAt ? new Date(formState.dueAt).toISOString() : null,
            priority: formState.priority,
            assigned_to: formState.assigneeId,
            event_id: eventId,
            created_by: currentUserId
        };

        try {
            const task = await createTaskForEvent(payload);
            setFormState(defaultFormState);
            onOpenChange(false);
            onAssigned?.(task);
        } catch (error) {
            console.error('Failed to assign task', error);
            setErrorMessage(error instanceof Error ? error.message : 'Unable to assign task.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Assign Task</DialogTitle>
                </DialogHeader>
                <form id="assign-task-form" onSubmit={handleSubmit} className="modal-body">
                    <div className="mb-3">
                        <Label htmlFor="task-title">Task title</Label>
                        <Input
                            id="task-title"
                            value={formState.title}
                            onChange={(event) => handleChange('title', event.target.value)}
                            placeholder="Describe the task"
                            required
                        />
                    </div>
                    <div className="mb-3">
                        <Label htmlFor="task-details">Details</Label>
                        <Textarea
                            id="task-details"
                            value={formState.details}
                            onChange={(event) => handleChange('details', event.target.value)}
                            rows={3}
                            placeholder="Add context or instructions"
                        />
                    </div>
                    <div className="row g-3">
                        <div className="col-md-6">
                            <Label htmlFor="task-due">Due date</Label>
                            <Input
                                id="task-due"
                                type="datetime-local"
                                value={formState.dueAt}
                                onChange={(event) => handleChange('dueAt', event.target.value)}
                            />
                        </div>
                        <div className="col-md-6">
                            <Label htmlFor="task-priority">Priority</Label>
                            <Select
                                id="task-priority"
                                value={formState.priority}
                                onChange={(event) => handleChange('priority', event.target.value as TaskPriority)}
                            >
                                {PRIORITY_OPTIONS.map((option) => (
                                    <option key={option} value={option}>
                                        {option.charAt(0).toUpperCase() + option.slice(1)}
                                    </option>
                                ))}
                            </Select>
                        </div>
                    </div>
                    <div className="mt-3">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <Label htmlFor="task-assignee" className="mb-0">
                                Assign to
                            </Label>
                            <Button type="button" variant="ghost" size="sm" onClick={handleAssignToMe} disabled={!currentUserId}>
                                Assign to me
                            </Button>
                        </div>
                        <Select
                            id="task-assignee"
                            value={formState.assigneeId}
                            onChange={(event) => handleChange('assigneeId', event.target.value)}
                            required
                        >
                            <option value="" disabled>
                                Select teammate
                            </option>
                            {(userOptions ?? []).map((user) => (
                                <option key={user.id} value={user.id}>
                                    {user.name ?? user.email ?? 'Unknown user'}
                                </option>
                            ))}
                        </Select>
                        {usersError ? (
                            <p className="mt-2 text-danger small">Unable to load users. Refresh and try again.</p>
                        ) : null}
                    </div>
                    {errorMessage ? <p className="mt-3 text-danger small">{errorMessage}</p> : null}
                </form>
                <DialogFooter>
                    <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        form="assign-task-form"
                        disabled={isSubmitting}
                        isLoading={isSubmitting}
                    >
                        Save task
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
