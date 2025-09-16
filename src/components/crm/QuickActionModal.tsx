import * as React from 'react';

import {
    QuickActionDynamicField,
    QuickActionModalType,
    useQuickActionSettings
} from './quick-action-settings';
import { CRM_BRAND_ACCENT_GLOW, CRM_BRAND_ACCENT_GLOW_SOFT } from './theme';

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
    'w-full rounded-xl border border-white/40 bg-white/70 px-3 py-2 text-sm text-slate-800 shadow-sm backdrop-blur focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[rgba(45,212,191,0.35)] dark:border-white/10 dark:bg-[#0d1c33]/70 dark:text-slate-100 dark:focus:border-[#2DD4BF] dark:focus:ring-[rgba(45,212,191,0.35)]';

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
            className="fixed inset-0 z-[100] flex items-center justify-center bg-[#030a16]/80 p-4 backdrop-blur-md"
            style={{ backgroundImage: `radial-gradient(circle at top, ${CRM_BRAND_ACCENT_GLOW_SOFT}, transparent 55%)` }}
        >
            <div
                role="dialog"
                aria-modal="true"
                className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-white/25 bg-white/85 p-8 shadow-2xl backdrop-blur-2xl transition dark:border-white/10 dark:bg-[#0b162c]/85"
                onClick={(event) => event.stopPropagation()}
            >
                <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-28 -top-24 h-72 w-72 rounded-full blur-3xl"
                    style={{ background: `radial-gradient(circle at center, ${CRM_BRAND_ACCENT_GLOW}, transparent 65%)` }}
                />
                <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -bottom-24 left-8 h-64 w-64 rounded-full blur-3xl"
                    style={{ background: `radial-gradient(circle at center, ${CRM_BRAND_ACCENT_GLOW_SOFT}, transparent 70%)` }}
                />
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/70 text-slate-500 shadow-sm transition hover:text-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[rgba(45,212,191,0.35)] dark:bg-[#0d1c33]/70 dark:text-slate-300 dark:hover:text-[#5EEAD4]"
                    aria-label="Close modal"
                >
                    ×
                </button>
                <div className="relative z-10 mb-6 space-y-2">
                    <span className="inline-flex items-center rounded-full border border-[#2DD4BF]/30 bg-[#2DD4BF]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[#0F766E] dark:border-[#2DD4BF]/40 dark:bg-[#2DD4BF]/20 dark:text-[#5EEAD4]">
                        {type === 'booking' && 'Schedule shoot'}
                        {type === 'invoice' && 'Create invoice'}
                        {type === 'gallery' && 'Upload gallery'}
                    </span>
                    <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">{title}</h2>
                    <p className="text-sm text-slate-600 dark:text-slate-300">{subtitle}</p>
                </div>
                <form ref={formRef} className="relative z-10 space-y-4" onSubmit={handleSubmit}>
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
                    {error ? <p className="text-sm text-rose-500">{error}</p> : null}
                    <div className="flex flex-wrap justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="inline-flex items-center justify-center rounded-full border border-white/40 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-white/80 focus:outline-none focus:ring-2 focus:ring-[rgba(45,212,191,0.25)] dark:border-white/10 dark:bg-[#0d1c33]/70 dark:text-slate-200 dark:hover:bg-[#10213b]/70"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="inline-flex items-center justify-center rounded-full bg-[#0F766E] px-5 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-[#0d8a80] focus:outline-none focus:ring-2 focus:ring-[rgba(45,212,191,0.35)] disabled:cursor-not-allowed disabled:bg-[#0F766E]/60 dark:bg-[#2DD4BF] dark:text-slate-900 dark:hover:bg-[#34E0C7]"
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
                        className="h-4 w-4 rounded border-white/40 text-[#0F766E] focus:ring-[rgba(45,212,191,0.35)] dark:border-white/20 dark:bg-[#0d1c33]"
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

