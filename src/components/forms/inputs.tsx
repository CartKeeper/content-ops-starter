import * as React from 'react';
import { useFormContext, type RegisterOptions } from 'react-hook-form';

import cn from '../../lib/cn';

type BaseControlProps = {
    name: string;
    describedBy?: string;
    invalid?: boolean;
    className?: string;
};

type TextInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'name'> &
    BaseControlProps & {
        registerOptions?: RegisterOptions;
    };

function baseInputClasses(invalid?: boolean) {
    return cn(
        'w-full rounded-2xl border px-3 py-2 text-sm text-white transition focus-visible:outline-none',
        invalid
            ? 'border-red-500/70 bg-red-950/30 focus-visible:border-red-400 focus-visible:ring-2 focus-visible:ring-red-500/40'
            : 'border-slate-800/80 bg-slate-950/80 focus-visible:border-[#4DE5FF] focus-visible:ring-2 focus-visible:ring-[#4DE5FF]/50',
        'placeholder:text-slate-500'
    );
}

export function TextInput({
    name,
    describedBy,
    invalid,
    className,
    type = 'text',
    registerOptions,
    onChange,
    onBlur,
    ...props
}: TextInputProps) {
    const { register } = useFormContext();
    const registration = register(name, {
        ...registerOptions,
        onChange: (event) => {
            registerOptions?.onChange?.(event);
            onChange?.(event as React.ChangeEvent<HTMLInputElement>);
        },
        onBlur: (event) => {
            registerOptions?.onBlur?.(event);
            onBlur?.(event as React.FocusEvent<HTMLInputElement>);
        }
    });

    return (
        <input
            id={props.id ?? name}
            type={type}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            className={cn(baseInputClasses(invalid), className)}
            {...props}
            {...registration}
        />
    );
}

type TextareaProps = Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'name'> &
    BaseControlProps & {
        registerOptions?: RegisterOptions;
    };

export function Textarea({
    name,
    describedBy,
    invalid,
    className,
    registerOptions,
    rows = 4,
    onChange,
    onBlur,
    ...props
}: TextareaProps) {
    const { register } = useFormContext();
    const registration = register(name, {
        ...registerOptions,
        onChange: (event) => {
            registerOptions?.onChange?.(event);
            onChange?.(event as React.ChangeEvent<HTMLTextAreaElement>);
        },
        onBlur: (event) => {
            registerOptions?.onBlur?.(event);
            onBlur?.(event as React.FocusEvent<HTMLTextAreaElement>);
        }
    });

    return (
        <textarea
            id={props.id ?? name}
            rows={rows}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            className={cn(baseInputClasses(invalid), 'resize-none', className)}
            {...props}
            {...registration}
        />
    );
}

type SelectOption = { label: string; value: string };

type SelectProps = Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'name'> &
    BaseControlProps & {
        options: SelectOption[];
        registerOptions?: RegisterOptions;
    };

export function Select({
    name,
    describedBy,
    invalid,
    className,
    options,
    registerOptions,
    onChange,
    onBlur,
    ...props
}: SelectProps) {
    const { register } = useFormContext();
    const registration = register(name, {
        ...registerOptions,
        onChange: (event) => {
            registerOptions?.onChange?.(event);
            onChange?.(event as React.ChangeEvent<HTMLSelectElement>);
        },
        onBlur: (event) => {
            registerOptions?.onBlur?.(event);
            onBlur?.(event as React.FocusEvent<HTMLSelectElement>);
        }
    });

    return (
        <select
            id={props.id ?? name}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            className={cn(baseInputClasses(invalid), 'appearance-none pr-9', className)}
            {...props}
            {...registration}
        >
            {options.map((option) => (
                <option key={option.value} value={option.value}>
                    {option.label}
                </option>
            ))}
        </select>
    );
}
