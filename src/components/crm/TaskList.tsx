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
        <ul className="space-y-3">
            {tasks.map((task) => (
                <li key={task.id} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <input
                        type="checkbox"
                        checked={task.completed}
                        readOnly
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900"
                    />
                    <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{task.title}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Due {formatDate(task.dueDate)}
                            {task.assignee ? ` · ${task.assignee}` : ''}
                        </p>
                    </div>
                    {!task.completed && (
                        <button className="text-xs font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300">Open</button>
                    )}
                </li>
            ))}
        </ul>
    );
}

export default TaskList;
