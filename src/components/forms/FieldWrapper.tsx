import * as React from 'react';
import { useFormContext, type FieldError } from 'react-hook-form';

import cn from '../../lib/cn';

import { ErrorText, HelpText, Label } from './primitives';
import { sizeCols, type FieldSize } from './tokens';

function resolveError(errors: unknown, name: string): FieldError | undefined {
    if (!errors || typeof errors !== 'object') {
        return undefined;
    }

    const segments = name.split('.');
    let current: unknown = errors;

    for (const segment of segments) {
        if (!current || typeof current !== 'object') {
            return undefined;
        }

        current = (current as Record<string, unknown>)[segment];
    }

    return (current as FieldError) ?? undefined;
}

export type FieldWrapperProps = {
    name: string;
    label: string;
    size?: FieldSize;
    helpText?: React.ReactNode;
    description?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
};

export function FieldWrapper({
    name,
    label,
    size = 'md',
    helpText,
    description,
    children,
    className
}: FieldWrapperProps) {
    const {
        formState: { errors }
    } = useFormContext();

    const error = resolveError(errors, name);
    const helpId = helpText ? `${name}-help` : undefined;
    const errorId = error ? `${name}-error` : undefined;
    const describedBy = [helpId, errorId].filter(Boolean).join(' ') || undefined;
    const invalid = Boolean(error);

    let control: React.ReactNode = children;

    if (typeof children === 'function') {
        control = (children as (context: { describedBy?: string; invalid: boolean }) => React.ReactNode)({
            describedBy,
            invalid
        });
    } else if (React.isValidElement(children)) {
        control = React.cloneElement(children as React.ReactElement<any>, {
            describedBy,
            invalid,
            name
        });
    }

    return (
        <div className={cn('space-y-2', sizeCols[size], className)}>
            <div className="space-y-1">
                <Label htmlFor={name}>{label}</Label>
                {description ? <p className="text-sm text-slate-400">{description}</p> : null}
                {control}
            </div>
            {helpText ? (
                <HelpText id={helpId} aria-live="polite">
                    {helpText}
                </HelpText>
            ) : null}
            {error ? (
                <ErrorText id={errorId} role="alert">
                    {error.message}
                </ErrorText>
            ) : null}
        </div>
    );
}
