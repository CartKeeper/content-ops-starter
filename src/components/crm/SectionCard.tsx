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
                'rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md',
                className
            )}
        >
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
                    {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
                </div>
                {action && <div className="flex shrink-0 items-center gap-2 text-sm font-medium text-indigo-600">{action}</div>}
            </div>
            <div className="mt-5">{children}</div>
        </section>
    );
}

export default SectionCard;
