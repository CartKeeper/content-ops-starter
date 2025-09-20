import * as React from 'react';

import { cn } from '../../lib/cn';

export type ButtonVariant = 'default' | 'outline' | 'ghost';
export type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

const variantClasses: Record<ButtonVariant, string> = {
    default:
        'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-400 focus-visible:outline-indigo-400 dark:bg-indigo-500 dark:hover:bg-indigo-400',
    outline:
        'border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100 focus-visible:outline-indigo-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800',
    ghost:
        'bg-transparent text-slate-500 transition hover:bg-slate-100 focus-visible:outline-indigo-400 dark:text-slate-300 dark:hover:bg-slate-800'
};

const sizeClasses: Record<ButtonSize, string> = {
    default: 'h-11 px-4 py-2 text-sm',
    sm: 'h-9 px-3 text-xs',
    lg: 'h-12 px-5 text-base',
    icon: 'h-10 w-10 p-0'
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'default', size = 'default', isLoading = false, disabled, children, ...props }, ref) => {
        const isDisabled = disabled || isLoading;
        return (
            <button
                ref={ref}
                className={cn(
                    'inline-flex items-center justify-center gap-2 rounded-2xl font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
                    variantClasses[variant],
                    sizeClasses[size],
                    className
                )}
                disabled={isDisabled}
                {...props}
            >
                {isLoading ? (
                    <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
                        <span className="sr-only">Loading</span>
                        <span>{children}</span>
                    </>
                ) : (
                    children
                )}
            </button>
        );
    }
);

Button.displayName = 'Button';
