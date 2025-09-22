"use client";

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

type TextareaProps = Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'name'> &
    BaseControlProps & {
        registerOptions?: RegisterOptions;
    };

type SelectOption = { label: string; value: string };

type SelectProps = Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'name'> &
    BaseControlProps & {
        options: SelectOption[];
        registerOptions?: RegisterOptions;
    };

function baseInputClasses(invalid?: boolean) {
    return cn(
        'w-full rounded-2xl border px-3 py-2 text-sm transition focus-visible:outline-none',
        invalid
            ? 'border-rose-300 bg-rose-50 text-rose-900 placeholder:text-rose-400 focus-visible:border-rose-400 focus-visible:ring-2 focus-visible:ring-rose-200 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-100 dark:placeholder:text-rose-300 dark:focus-visible:border-rose-400 dark:focus-visible:ring-rose-500/30'
            : 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-200 dark:border-slate-800/80 dark:bg-slate-950/80 dark:text-white dark:placeholder:text-slate-500 dark:focus-visible:border-[#4DE5FF] dark:focus-visible:ring-[#4DE5FF]/50'
    );
}

function assignRef<T>(ref: React.Ref<T> | undefined, value: T) {
    if (typeof ref === 'function') {
        ref(value);
    } else if (ref != null) {
        // eslint-disable-next-line no-param-reassign
        (ref as React.MutableRefObject<T>).current = value;
    }
}

function useComposedRefs<T>(...refs: (React.Ref<T> | undefined)[]) {
    return React.useCallback(
        (value: T) => {
            for (const ref of refs) {
                assignRef(ref, value);
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        refs
    );
}

function mergeDescribedBy(...values: Array<string | undefined>) {
    return values.filter(Boolean).join(' ') || undefined;
}

export const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
    {
        name,
        describedBy,
        invalid,
        className,
        type = 'text',
        registerOptions,
        onChange,
        onBlur,
        'aria-describedby': ariaDescribedByProp,
        ...props
    },
    forwardedRef
) {
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

    const { ref: registerRef, onChange: registerOnChange, onBlur: registerOnBlur, ...registrationProps } = registration;

    const combinedRef = useComposedRefs<HTMLInputElement>(registerRef, forwardedRef);

    const handleChange = React.useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            registerOnChange(event);
            onChange?.(event);
        },
        [onChange, registerOnChange]
    );

    const handleBlur = React.useCallback(
        (event: React.FocusEvent<HTMLInputElement>) => {
            registerOnBlur(event);
            onBlur?.(event);
        },
        [onBlur, registerOnBlur]
    );

    const ariaDescribedBy = mergeDescribedBy(describedBy, ariaDescribedByProp);

    return (
        <input
            id={props.id ?? name}
            type={type}
            aria-invalid={invalid || undefined}
            aria-describedby={ariaDescribedBy}
            className={cn(baseInputClasses(invalid), className)}
            onChange={handleChange}
            onBlur={handleBlur}
            ref={combinedRef}
            {...registrationProps}
            {...props}
        />
    );
});

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
    {
        name,
        describedBy,
        invalid,
        className,
        registerOptions,
        rows = 4,
        onChange,
        onBlur,
        'aria-describedby': ariaDescribedByProp,
        ...props
    },
    forwardedRef
) {
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

    const { ref: registerRef, onChange: registerOnChange, onBlur: registerOnBlur, ...registrationProps } = registration;

    const combinedRef = useComposedRefs<HTMLTextAreaElement>(registerRef, forwardedRef);

    const handleChange = React.useCallback(
        (event: React.ChangeEvent<HTMLTextAreaElement>) => {
            registerOnChange(event);
            onChange?.(event);
        },
        [onChange, registerOnChange]
    );

    const handleBlur = React.useCallback(
        (event: React.FocusEvent<HTMLTextAreaElement>) => {
            registerOnBlur(event);
            onBlur?.(event);
        },
        [onBlur, registerOnBlur]
    );

    const ariaDescribedBy = mergeDescribedBy(describedBy, ariaDescribedByProp);

    return (
        <textarea
            id={props.id ?? name}
            rows={rows}
            aria-invalid={invalid || undefined}
            aria-describedby={ariaDescribedBy}
            className={cn(baseInputClasses(invalid), 'resize-none', className)}
            onChange={handleChange}
            onBlur={handleBlur}
            ref={combinedRef}
            {...registrationProps}
            {...props}
        />
    );
});

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(function Select(
    {
        name,
        describedBy,
        invalid,
        className,
        options,
        registerOptions,
        onChange,
        onBlur,
        'aria-describedby': ariaDescribedByProp,
        ...props
    },
    forwardedRef
) {
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

    const { ref: registerRef, onChange: registerOnChange, onBlur: registerOnBlur, ...registrationProps } = registration;

    const combinedRef = useComposedRefs<HTMLSelectElement>(registerRef, forwardedRef);

    const handleChange = React.useCallback(
        (event: React.ChangeEvent<HTMLSelectElement>) => {
            registerOnChange(event);
            onChange?.(event);
        },
        [onChange, registerOnChange]
    );

    const handleBlur = React.useCallback(
        (event: React.FocusEvent<HTMLSelectElement>) => {
            registerOnBlur(event);
            onBlur?.(event);
        },
        [onBlur, registerOnBlur]
    );

    const ariaDescribedBy = mergeDescribedBy(describedBy, ariaDescribedByProp);

    return (
        <select
            id={props.id ?? name}
            aria-invalid={invalid || undefined}
            aria-describedby={ariaDescribedBy}
            className={cn(baseInputClasses(invalid), 'appearance-none pr-9', className)}
            onChange={handleChange}
            onBlur={handleBlur}
            ref={combinedRef}
            {...registrationProps}
            {...props}
        >
            {options.map((option) => (
                <option key={option.value} value={option.value}>
                    {option.label}
                </option>
            ))}
        </select>
    );
});
