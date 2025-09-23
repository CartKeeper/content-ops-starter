import type { HTMLAttributes, ReactNode } from 'react';
import clsx from 'classnames';

export type CardVariant = 'default' | 'stats' | 'table' | 'form' | 'chart';

const VARIANT_PADDING: Record<CardVariant, string> = {
    default: 'p-6',
    stats: 'px-6 py-5',
    table: 'p-0',
    form: 'p-0 md:px-6 md:py-5',
    chart: 'p-6'
};

type ElementTag = 'div' | 'section' | 'article';

type CardProps = HTMLAttributes<HTMLElement> & {
    as?: ElementTag;
    variant?: CardVariant;
};

export function Card({ as: Component = 'section', variant = 'default', className, children, ...props }: CardProps) {
    return (
        <Component
            className={clsx(
                'crm-card rounded-card border border-border-subtle bg-surface shadow-card transition-shadow duration-150 hover:shadow-lg',
                VARIANT_PADDING[variant],
                className
            )}
            {...props}
        >
            {children}
        </Component>
    );
}

type CardHeaderProps = {
    title?: ReactNode;
    description?: ReactNode;
    actions?: ReactNode | ReactNode[];
    className?: string;
};

export function CardHeader({ title, description, actions, className }: CardHeaderProps) {
    const actionItems = Array.isArray(actions) ? actions : actions ? [actions] : [];

    if (!title && !description && actionItems.length === 0) {
        return null;
    }

    return (
        <div className={clsx('flex items-start justify-between gap-4 border-b border-border-subtle px-6 py-4', className)}>
            <div className="flex flex-col gap-1">
                {title ? <h3 className="text-base font-semibold text-text-primary">{title}</h3> : null}
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
    );
}

type CardBodyProps = HTMLAttributes<HTMLDivElement> & {
    padding?: boolean;
};

export function CardBody({ className, padding = true, ...props }: CardBodyProps) {
    return <div className={clsx(padding ? 'px-6 py-5' : undefined, className)} {...props} />;
}

type CardFooterProps = HTMLAttributes<HTMLDivElement> & {
    padding?: boolean;
};

export function CardFooter({ className, padding = true, ...props }: CardFooterProps) {
    return (
        <div
            className={clsx('border-t border-border-subtle', padding ? 'px-6 py-4' : undefined, className)}
            {...props}
        />
    );
}
