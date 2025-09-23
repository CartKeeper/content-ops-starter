import type { ReactNode } from 'react';
import clsx from 'classnames';

import { Icon, type IconKey } from '../icons';

export type EmptyStateProps = {
    icon?: IconKey;
    title: ReactNode;
    description?: ReactNode;
    primaryAction?: ReactNode;
    secondaryAction?: ReactNode;
    className?: string;
};

export function EmptyState({ icon, title, description, primaryAction, secondaryAction, className }: EmptyStateProps) {
    return (
        <div
            className={clsx(
                'flex flex-col items-center justify-center gap-4 rounded-card border border-border-subtle bg-surface px-10 py-12 text-center shadow-card',
                className
            )}
        >
            {icon ? (
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-muted text-accent-indigo">
                    <Icon name={icon} className="h-6 w-6" />
                </span>
            ) : null}
            <div className="flex flex-col gap-2">
                <h3 className="text-xl font-semibold text-text-primary">{title}</h3>
                {description ? <p className="max-w-md text-sm text-text-subtle">{description}</p> : null}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
                {primaryAction ? <div className="inline-flex justify-center">{primaryAction}</div> : null}
                {secondaryAction ? <div className="inline-flex justify-center text-sm text-text-subtle">{secondaryAction}</div> : null}
            </div>
        </div>
    );
}
