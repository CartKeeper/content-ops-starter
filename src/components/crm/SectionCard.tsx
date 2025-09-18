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
                'relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900',
                className
            )}
        >
            <div
                className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-sky-500 to-cyan-400 opacity-60"
                aria-hidden="true"
            />
            <div className="relative z-10">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h2>
                        {description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{description}</p>}
                    </div>
                    {action && (
                        <div className="flex shrink-0 items-center gap-2 text-sm font-semibold text-indigo-600 transition-colors hover:text-indigo-500 dark:text-indigo-300 dark:hover:text-indigo-200">
                            {action}
                        </div>
                    )}
                </div>
                <div className="mt-5">{children}</div>
            </div>
        </section>
    );
}

export default SectionCard;
