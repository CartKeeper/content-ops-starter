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
                'group relative overflow-hidden rounded-3xl border border-slate-200/70 bg-transparent p-6 shadow-lg shadow-slate-900/5 transition duration-300 hover:-translate-y-0.5 hover:shadow-2xl dark:border-white/10 dark:shadow-[0_45px_110px_-50px_rgba(2,8,20,0.85)]',
                className
            )}
        >
            <div
                className="pointer-events-none absolute inset-0 rounded-3xl bg-white/85 backdrop-blur-sm transition duration-500 group-hover:bg-white/95 dark:hidden"
                aria-hidden="true"
            />
            <div
                className="pointer-events-none absolute inset-0 hidden rounded-3xl opacity-95 transition duration-500 dark:block"
                aria-hidden="true"
                style={{ background: 'radial-gradient(circle at top, rgba(63, 76, 204, 0.24), rgba(7, 11, 23, 0.92))' }}
            />
            <div
                className="pointer-events-none absolute inset-0 hidden rounded-3xl opacity-35 transition duration-500 group-hover:opacity-60 dark:block"
                aria-hidden="true"
                style={{ background: 'linear-gradient(135deg, rgba(148, 163, 184, 0.12) 0%, rgba(148, 163, 184, 0) 55%)' }}
            />
            <div className="relative z-10">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h2>
                        {description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{description}</p>}
                    </div>
                    {action && (
                        <div className="flex shrink-0 items-center gap-2 text-sm font-medium text-[#4534FF] transition-colors dark:text-[#9DAAFF]">
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
