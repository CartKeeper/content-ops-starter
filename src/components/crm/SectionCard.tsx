import * as React from 'react';
import classNames from 'classnames';

type SectionCardProps = {
    title: string;
    description?: string;
    action?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
};

export function SectionCard({ title, description, action, children, className }: SectionCardProps) {
    return (
        <section
            className={classNames(
                'rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900',
                className
            )}
        >
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h2>
                    {description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{description}</p>}
                </div>
                {action && <div className="flex shrink-0 items-center gap-2 text-sm font-medium text-indigo-600 dark:text-indigo-400">{action}</div>}
            </div>
            <div className="mt-5">{children}</div>
        </section>
    );
}

export default SectionCard;
