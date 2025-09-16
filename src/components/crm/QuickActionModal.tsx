import * as React from 'react';

import {
    QuickActionDynamicField,
    QuickActionModalType,
    useQuickActionSettings
} from './quick-action-settings';

type BaseFieldType =
    | 'text'
    | 'textarea'
    | 'select'
    | 'date'
    | 'time'
    | 'number'
    | 'url'
    | 'checkbox';

export type QuickActionFormField = {
    id: string;
    label: string;
    inputType: BaseFieldType;
    placeholder?: string;
    defaultValue?: string | number | boolean;
    helperText?: string;
    required?: boolean;
    options?: { value: string; label: string }[];
    step?: number;
};

type InternalField = QuickActionFormField & {
    fieldKey: string;
    dynamic: boolean;
    originalDynamicField?: QuickActionDynamicField;
};

export type QuickActionModalSubmitValues = {
    customFields: Record<string, string | boolean>;
    [key: string]: string | number | boolean | undefined | Record<string, string | boolean>;
};

type QuickActionModalProps = {
    type: QuickActionModalType;
    title: string;
    subtitle: string;
    submitLabel: string;
    onClose: () => void;
    onSubmit: (values: QuickActionModalSubmitValues) => Promise<void>;
    baseFields: QuickActionFormField[];
};

const inputBaseStyles =
    'w-full rounded-xl border border-white/50 bg-white/60 px-3 py-2 text-sm text-slate-800 shadow-sm backdrop-blur focus:border-[#5D3BFF] focus:outline-none focus:ring-2 focus:ring-[#4DE5FF] dark:border-slate-700/80 dark:bg-slate-900/60 dark:text-slate-100 dark:focus:border-[#7ADFFF] dark:focus:ring-[#4DE5FF]';

export function QuickActionModal({
    type,
    title,
    subtitle,
    submitLabel,
    onClose,
    onSubmit,
    baseFields
}: QuickActionModalProps) {
    const overlayRef = React.useRef<HTMLDivElement | null>(null);
    const formRef = React.useRef<HTMLFormElement | null>(null);
    const { getActiveFieldsForModal } = useQuickActionSettings();
    const dynamicFields = getActiveFieldsForModal(type);

    const fields = React.useMemo<InternalField[]>(() => {
        const mappedBase = baseFields.map<InternalField>((field) => ({
            ...field,
            fieldKey: field.id,
            dynamic: false
        }));

        const mappedDynamic = dynamicFields.map<InternalField>((field) => ({
            id: `custom:${field.id}`,
            fieldKey: `custom:${field.id}`,
            label: field.label,
            inputType: field.inputType === 'url' ? 'url' : field.inputType,
            placeholder: field.placeholder,
            helperText: field.description,
            defaultValue: field.defaultValue,
            required: false,
            dynamic: true,
            originalDynamicField: field
        }));

        return [...mappedBase, ...mappedDynamic];
    }, [baseFields, dynamicFields]);

    const [formValues, setFormValues] = React.useState<Record<string, string | number | boolean>>(() =>
        initializeValues(fields)
    );
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        setFormValues((previous) => synchronizeValues(previous, fields));
    }, [fields]);

    React.useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    React.useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const { body } = window.document;
        const originalOverflow = body.style.overflow;
        body.style.overflow = 'hidden';
        return () => {
            body.style.overflow = originalOverflow;
        };
    }, []);

    React.useEffect(() => {
        if (!formRef.current) {
            return;
        }

        const focusable = formRef.current.querySelector<HTMLElement>('input, select, textarea, button');
        focusable?.focus();
    }, []);

    const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
        if (event.target === overlayRef.current) {
            onClose();
        }
    };

    const handleChange = (field: InternalField, value: string | number | boolean) => {
        setFormValues((previous) => ({ ...previous, [field.fieldKey]: value }));
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            const submitValues: QuickActionModalSubmitValues = { customFields: {} };

            fields.forEach((field) => {
                const currentValue = formValues[field.fieldKey];

                if (field.dynamic) {
                    if (field.originalDynamicField) {
                        const dynamicId = field.originalDynamicField.id;
                        if (
                            typeof currentValue === 'boolean' ||
                            (currentValue !== '' && currentValue !== undefined && currentValue !== null)
                        ) {
                            submitValues.customFields[dynamicId] = currentValue as string | boolean;
                        }
                    }
                } else {
                    submitValues[field.id] = currentValue;
                }
            });

            await onSubmit(submitValues);
        } catch (submissionError) {
            const message =
                submissionError instanceof Error ? submissionError.message : 'Unable to save. Please try again.';
            setError(message);
            setIsSubmitting(false);
            return;
        }

        setIsSubmitting(false);
        onClose();
    };

    return (
        <div
            ref={overlayRef}
            onClick={handleOverlayClick}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
        >
            <div
                role="dialog"
                aria-modal="true"
                className="relative w-full max-w-2xl rounded-3xl border border-white/20 bg-white/80 p-8 shadow-2xl backdrop-blur-xl transition dark:border-slate-700/60 dark:bg-slate-950/70"
                onClick={(event) => event.stopPropagation()}
            >
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/70 text-slate-500 shadow-sm transition hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4DE5FF] dark:bg-slate-900/60 dark:text-slate-300"
                    aria-label="Close modal"
                >
                    ×
                </button>
                <div className="mb-6 space-y-2">
                    <span className="inline-flex items-center rounded-full border border-[#C5C0FF] bg-[#E9E7FF] px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[#4534FF] dark:border-[#4E46C8] dark:bg-[#2A1F67] dark:text-[#AEB1FF]">
                        {type === 'booking' && 'Schedule shoot'}
                        {type === 'invoice' && 'Create invoice'}
                        {type === 'gallery' && 'Upload gallery'}
                    </span>
                    <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">{title}</h2>
                    <p className="text-sm text-slate-600 dark:text-slate-300">{subtitle}</p>
                </div>
                <form ref={formRef} className="space-y-4" onSubmit={handleSubmit}>
                    <div className="grid gap-4 md:grid-cols-2">
                        {fields.map((field) => (
                            <FieldInput
                                key={field.fieldKey}
                                field={field}
                                value={formValues[field.fieldKey]}
                                onChange={(value) => handleChange(field, value)}
                            />
                        ))}
                    </div>
                    {error ? <p className="text-sm text-[#D61B7B]">{error}</p> : null}
                    <div className="flex flex-wrap justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#4DE5FF] dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#5D3BFF] via-[#3D7CFF] to-[#4DE5FF] px-5 py-2 text-sm font-semibold text-white shadow-lg transition hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[#4DE5FF] focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                            {isSubmitting ? 'Saving…' : submitLabel}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

type FieldInputProps = {
    field: InternalField;
    value: string | number | boolean;
    onChange: (value: string | number | boolean) => void;
};

function FieldInput({ field, value, onChange }: FieldInputProps) {
    const inputId = `field-${field.fieldKey}`;
    const helperId = `${inputId}-helper`;

    const commonProps = {
        id: inputId,
        className: inputBaseStyles,
        placeholder: field.placeholder,
        'aria-describedby': field.helperText ? helperId : undefined,
        required: field.required
    } as const;

    let control: React.ReactNode = null;

    switch (field.inputType) {
        case 'textarea':
            control = (
                <textarea
                    {...commonProps}
                    rows={3}
                    value={typeof value === 'string' ? value : ''}
                    onChange={(event) => onChange(event.target.value)}
                />
            );
            break;
        case 'select':
            control = (
                <select
                    {...commonProps}
                    value={typeof value === 'string' ? value : ''}
                    onChange={(event) => onChange(event.target.value)}
                    className={`${inputBaseStyles} pr-10`}
                >
                    {(field.options || []).map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            );
            break;
        case 'date':
        case 'time':
        case 'url':
        case 'text':
            control = (
                <input
                    {...commonProps}
                    type={field.inputType === 'url' ? 'url' : field.inputType}
                    value={typeof value === 'string' ? value : ''}
                    onChange={(event) => onChange(event.target.value)}
                />
            );
            break;
        case 'number':
            control = (
                <input
                    {...commonProps}
                    type="number"
                    value={typeof value === 'number' || typeof value === 'string' ? value : ''}
                    onChange={(event) => {
                        const nextValue = event.target.value;
                        onChange(nextValue === '' ? '' : Number(nextValue));
                    }}
                    step={field.step ?? 1}
                />
            );
            break;
        case 'checkbox':
            control = (
                <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <input
                        id={inputId}
                        type="checkbox"
                        checked={Boolean(value)}
                        onChange={(event) => onChange(event.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-[#5D3BFF] focus:ring-[#4DE5FF] dark:border-slate-600"
                    />
                    <span>{field.placeholder || 'Enabled'}</span>
                </label>
            );
            break;
        default:
            control = (
                <input
                    {...commonProps}
                    type="text"
                    value={typeof value === 'string' ? value : ''}
                    onChange={(event) => onChange(event.target.value)}
                />
            );
    }

    return (
        <div className="space-y-1">
            {field.inputType !== 'checkbox' ? (
                <label htmlFor={inputId} className="block text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                    {field.label}
                </label>
            ) : (
                <span className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                    {field.label}
                </span>
            )}
            {control}
            {field.helperText ? (
                <p id={helperId} className="text-xs text-slate-500 dark:text-slate-400">
                    {field.helperText}
                </p>
            ) : null}
        </div>
    );
}

function initializeValues(fields: InternalField[]) {
    return fields.reduce<Record<string, string | number | boolean>>((accumulator, field) => {
        if (field.defaultValue !== undefined) {
            accumulator[field.fieldKey] = field.defaultValue as string | number | boolean;
        } else if (field.inputType === 'checkbox') {
            accumulator[field.fieldKey] = false;
        } else {
            accumulator[field.fieldKey] = '';
        }
        return accumulator;
    }, {});
}

function synchronizeValues(
    previous: Record<string, string | number | boolean>,
    fields: InternalField[]
): Record<string, string | number | boolean> {
    const next: Record<string, string | number | boolean> = {};

    fields.forEach((field) => {
        if (Object.prototype.hasOwnProperty.call(previous, field.fieldKey)) {
            next[field.fieldKey] = previous[field.fieldKey];
        } else if (field.defaultValue !== undefined) {
            next[field.fieldKey] = field.defaultValue as string | number | boolean;
        } else if (field.inputType === 'checkbox') {
            next[field.fieldKey] = false;
        } else {
            next[field.fieldKey] = '';
        }
    });

    return next;
}

