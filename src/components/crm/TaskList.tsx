import * as React from 'react';
import dayjs from 'dayjs';

import { CRM_BRAND_ACCENT_GLOW, CRM_BRAND_ACCENT_GLOW_SOFT } from './theme';

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
                <li
                    key={task.id}
                    className="relative flex items-start gap-3 overflow-hidden rounded-xl border border-white/30 bg-white/75 p-4 shadow-sm backdrop-blur-lg transition dark:border-white/10 dark:bg-[#0d1c33]/70"
                >
                    <span
                        aria-hidden="true"
                        className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full blur-3xl"
                        style={{ background: `radial-gradient(circle at center, ${CRM_BRAND_ACCENT_GLOW}, transparent 70%)` }}
                    />
                    <span
                        aria-hidden="true"
                        className="pointer-events-none absolute -bottom-16 left-10 h-36 w-36 rounded-full blur-3xl"
                        style={{ background: `radial-gradient(circle at center, ${CRM_BRAND_ACCENT_GLOW_SOFT}, transparent 75%)` }}
                    />
                    <input
                        type="checkbox"
                        checked={task.completed}
                        readOnly
                        className="relative z-10 mt-1 h-4 w-4 rounded border-white/40 text-[#0F766E] focus:ring-[rgba(45,212,191,0.35)] dark:border-white/20 dark:bg-[#0d1c33]"
                    />
                    <div className="relative z-10 flex-1">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-50">{task.title}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Due {formatDate(task.dueDate)}
                            {task.assignee ? ` · ${task.assignee}` : ''}
                        </p>
                    </div>
                    {!task.completed && (
                        <button className="relative z-10 text-xs font-semibold text-[#0F766E] transition hover:text-[#0d8a80] dark:text-[#5EEAD4] dark:hover:text-[#7df7e0]">
                            Open
                        </button>
                    )}
                </li>
            ))}
        </ul>
    );
}

export default TaskList;
