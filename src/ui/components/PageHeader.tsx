import type { ReactNode } from 'react';
import clsx from 'classnames';

export type PageMetaItem = {
    label: ReactNode;
    value: ReactNode;
};

export type PageHeaderProps = {
    pretitle?: ReactNode;
    title: ReactNode;
    description?: ReactNode;
    actions?: ReactNode | ReactNode[];
    meta?: PageMetaItem[];
    alignment?: 'start' | 'center';
    className?: string;
};

export function PageHeader({
    pretitle,
    title,
    description,
    actions,
    meta,
    alignment = 'start',
    className
}: PageHeaderProps) {
    const actionItems = Array.isArray(actions) ? actions : actions ? [actions] : [];

    return (
        <header
            className={clsx(
                'mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pb-6',
                alignment === 'center' && 'items-center text-center',
                className
            )}
        >
            <div className="flex w-full flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className={clsx('flex flex-1 flex-col gap-2', alignment === 'center' && 'items-center')}>
                    {pretitle ? (
                        <span className="text-xs font-semibold uppercase tracking-wide text-text-subtle">{pretitle}</span>
                    ) : null}
                    <h1 className="text-3xl font-semibold text-text-primary">{title}</h1>
                    {description ? <p className="max-w-2xl text-base text-text-subtle">{description}</p> : null}
                </div>
                {actionItems.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-2 md:justify-end">
                        {actionItems.map((action, index) => (
                            <div key={index} className="inline-flex">{action}</div>
                        ))}
                    </div>
                ) : null}
            </div>
            {meta && meta.length > 0 ? (
                <dl className="grid gap-4 rounded-card border border-border-subtle bg-surface px-4 py-3 text-sm text-text-subtle sm:grid-cols-2 md:grid-cols-4">
                    {meta.map((item, index) => (
                        <div key={index} className="flex flex-col gap-1">
                            <dt className="text-xs font-semibold uppercase tracking-wide text-text-subtle">{item.label}</dt>
                            <dd className="text-base text-text-primary">{item.value}</dd>
                        </div>
                    ))}
                </dl>
            ) : null}
        </header>
    );
}
