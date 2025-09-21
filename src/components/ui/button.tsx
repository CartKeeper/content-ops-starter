import * as React from 'react';

import { cn } from '../../lib/cn';

export type ButtonVariant = 'default' | 'outline' | 'ghost';
export type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

const variantClasses: Record<ButtonVariant, string> = {
    default: 'btn-primary',
    outline: 'btn-outline-secondary',
    ghost: 'btn-link text-secondary px-0'
};

const sizeClasses: Record<ButtonSize, string> = {
    default: '',
    sm: 'btn-sm',
    lg: 'btn-lg',
    icon: 'btn-icon'
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
                    'btn d-inline-flex align-items-center gap-2 fw-semibold disabled:opacity-75',
                    variantClasses[variant],
                    sizeClasses[size],
                    size === 'icon' && variant !== 'ghost' ? '' : undefined,
                    className
                )}
                disabled={isDisabled}
                {...props}
            >
                {isLoading ? (
                    <>
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                        <span className="visually-hidden">Loading</span>
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
