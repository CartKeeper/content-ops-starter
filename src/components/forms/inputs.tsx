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
        'w-full rounded-2xl border px-3 py-2 text-sm text-white transition focus-visible:outline-none',
        invalid
            ? 'border-red-500/70 bg-red-950/30 focus-visible:border-red-400 focus-visible:ring-2 focus-visible:ring-red-500/40'
            : 'border-slate-800/80 bg-slate-950/80 focus-visible:border-[#4DE5FF] focus-visible:ring-2 focus-visible:ring-[#4DE5FF]/50',
        'placeholder:text-slate-500'
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
