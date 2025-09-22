import * as React from 'react';

import cn from '../../lib/cn';

export type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement>;

export function Label({ className, ...props }: LabelProps) {
    return (
        <label
            className={cn(
                'block text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-300',
                className
            )}
            {...props}
        />
    );
}

export type HelpTextProps = React.HTMLAttributes<HTMLParagraphElement>;

export function HelpText({ className, ...props }: HelpTextProps) {
    return <p className={cn('text-xs text-slate-500 dark:text-slate-400', className)} {...props} />;
}

export type ErrorTextProps = React.HTMLAttributes<HTMLParagraphElement>;

export function ErrorText({ className, ...props }: ErrorTextProps) {
    return <p className={cn('text-xs font-medium text-rose-600 dark:text-rose-300', className)} {...props} />;
}
