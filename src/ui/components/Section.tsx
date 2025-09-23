import type { ReactNode } from 'react';
import clsx from 'classnames';

export type SectionProps = {
    title: ReactNode;
    description?: ReactNode;
    actions?: ReactNode | ReactNode[];
    className?: string;
    children?: ReactNode;
};

export function Section({ title, description, actions, className, children }: SectionProps) {
    const actionItems = Array.isArray(actions) ? actions : actions ? [actions] : [];

    return (
        <section className={clsx('space-y-4', className)}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex flex-col gap-1">
                    <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
                    {description ? <p className="text-sm text-text-subtle">{description}</p> : null}
                </div>
                {actionItems.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-2">
                        {actionItems.map((item, index) => (
                            <div key={index}>{item}</div>
                        ))}
                    </div>
                ) : null}
            </div>
            {children}
            <div className="h-px w-full bg-border-subtle" aria-hidden />
        </section>
    );
}
