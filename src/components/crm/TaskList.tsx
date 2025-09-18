import * as React from 'react';
import dayjs from 'dayjs';

export type TaskRecord = {
    id: string;
    title: string;
    dueDate: string;
    assignee?: string;
    completed?: boolean;
};

const formatDate = (value: string) => dayjs(value).format('MMM D');

export function TaskList({ tasks }: { tasks: TaskRecord[] }) {
    return (
        <ul className="list-group list-group-flush">
            {tasks.map((task) => (
                <li key={task.id} className="list-group-item d-flex align-items-start gap-3">
                    <input
                        type="checkbox"
                        className="form-check-input mt-1"
                        checked={task.completed}
                        readOnly
                    />
                    <div className="flex-grow-1">
                        <div className="fw-semibold">{task.title}</div>
                        <div className="text-secondary small">
                            Due {formatDate(task.dueDate)}
                            {task.assignee ? ` · ${task.assignee}` : ''}
                        </div>
                    </div>
                    {!task.completed && (
                        <button className="btn btn-sm btn-outline-primary" type="button">
                            Open
                        </button>
                    )}
                </li>
            ))}
        </ul>
    );
}

export default TaskList;
