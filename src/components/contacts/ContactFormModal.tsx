import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormProvider, useForm } from 'react-hook-form';

import { FieldGrid } from '../forms/FieldGrid';
import { FieldWrapper } from '../forms/FieldWrapper';
import { TextInput, Textarea } from '../forms/inputs';
import type { ContactRecord } from '../../types/contact';

type ContactFormModalProps = {
    open: boolean;
    contactId: string | null;
    onClose: () => void;
    onSaved: (record: ContactRecord, mode: 'create' | 'update') => void;
    onError: (message: string) => void;
};

function optionalTrimmed(max: number | null, message: string) {
    let schema = z
        .string()
        .trim()
        .optional()
        .transform((value) => value ?? '');

    if (max != null) {
        schema = schema.refine((value) => value.length <= max, message);
    }

    return schema;
}

const emailField = z
    .string()
    .trim()
    .optional()
    .transform((value) => value ?? '')
    .refine((value) => value.length === 0 || z.string().email().safeParse(value).success, 'Enter a valid email');

const phoneField = z
    .string()
    .trim()
    .optional()
    .transform((value) => value ?? '')
    .refine(
        (value) =>
            value.length === 0 ||
            /^[+0-9 ()-]{7,20}$/i.test(value) ||
            z
                .string()
                .regex(/^[+0-9 ()-]{7,20}$/i)
                .safeParse(value)
                .success,
        'Enter a valid phone number'
    );

const contactFormSchema = z
    .object({
        firstName: optionalTrimmed(60, 'First name must be 60 characters or fewer'),
        lastName: optionalTrimmed(60, 'Last name must be 60 characters or fewer'),
        business: optionalTrimmed(120, 'Business must be 120 characters or fewer'),
        email: emailField,
        phone: phoneField,
        address: optionalTrimmed(160, 'Address must be 160 characters or fewer'),
        city: optionalTrimmed(80, 'City must be 80 characters or fewer'),
        state: optionalTrimmed(40, 'State must be 40 characters or fewer'),
        notes: optionalTrimmed(1000, 'Notes must be 1000 characters or fewer')
    })
    .superRefine((data, ctx) => {
        if (!data.firstName && !data.lastName && !data.business && !data.email) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['firstName'],
                message: 'Add a name, business, or email so the contact is identifiable.'
            });
        }
    });

type FormValues = z.infer<typeof contactFormSchema>;

const DEFAULT_VALUES: FormValues = {
    firstName: '',
    lastName: '',
    business: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    notes: ''
};

function mapRecordToForm(record: ContactRecord): FormValues {
    return {
        firstName: record.first_name?.trim() ?? '',
        lastName: record.last_name?.trim() ?? '',
        business: record.business?.trim() ?? '',
        email: record.email?.trim() ?? '',
        phone: record.phone?.trim() ?? '',
        address: record.address?.trim() ?? '',
        city: record.city?.trim() ?? '',
        state: record.state?.trim() ?? '',
        notes: record.notes?.trim() ?? ''
    };
}

function mapFormToPayload(values: FormValues) {
    const toNullable = (value: string) => (value.trim().length > 0 ? value.trim() : null);
    return {
        first_name: toNullable(values.firstName),
        last_name: toNullable(values.lastName),
        business: toNullable(values.business),
        email: toNullable(values.email),
        phone: toNullable(values.phone),
        address: toNullable(values.address),
        city: toNullable(values.city),
        state: toNullable(values.state),
        notes: toNullable(values.notes)
    } satisfies Record<string, string | null>;
}

export function ContactFormModal({ open, contactId, onClose, onSaved, onError }: ContactFormModalProps) {
    const mode: 'create' | 'update' = contactId ? 'update' : 'create';
    const methods = useForm<FormValues>({
        resolver: zodResolver(contactFormSchema),
        defaultValues: DEFAULT_VALUES,
        mode: 'onBlur'
    });

    const {
        handleSubmit,
        reset,
        setFocus,
        formState: { isSubmitting }
    } = methods;

    const [isLoading, setIsLoading] = React.useState(false);
    const [submitError, setSubmitError] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (!open) {
            setSubmitError(null);
            setIsLoading(false);
            reset(DEFAULT_VALUES);
            return;
        }

        setSubmitError(null);

        if (!contactId) {
            reset(DEFAULT_VALUES);
            if (typeof window !== 'undefined') {
                window.requestAnimationFrame(() => setFocus('firstName'));
            }
            return;
        }

        let isCancelled = false;
        setIsLoading(true);

        (async () => {
            try {
                const response = await fetch(`/api/contacts/${contactId}`);
                const payload = (await response.json().catch(() => null)) as { data?: ContactRecord; error?: string } | null;

                if (!response.ok || !payload?.data) {
                    throw new Error(payload?.error ?? 'Unable to load contact.');
                }

                if (isCancelled) {
                    return;
                }

                reset(mapRecordToForm(payload.data));
                if (typeof window !== 'undefined') {
                    window.requestAnimationFrame(() => setFocus('firstName'));
                }
            } catch (error) {
                if (isCancelled) {
                    return;
                }
                const message = error instanceof Error ? error.message : 'Unable to load contact.';
                setSubmitError(message);
            } finally {
                if (!isCancelled) {
                    setIsLoading(false);
                }
            }
        })();

        return () => {
            isCancelled = true;
        };
    }, [contactId, open, reset, setFocus]);

    const onSubmit = handleSubmit(async (values) => {
        setSubmitError(null);
        const payload = mapFormToPayload(values);

        try {
            const response = await fetch(contactId ? `/api/contacts/${contactId}` : '/api/contacts', {
                method: contactId ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const body = (await response.json().catch(() => null)) as { data?: ContactRecord; error?: string } | null;

            if (!response.ok || !body?.data) {
                throw new Error(body?.error ?? 'Unable to save contact.');
            }

            onSaved(body.data, mode);
            onClose();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unable to save contact.';
            setSubmitError(message);
            onError(message);
        }
    });

    return (
        <Dialog.Root
            open={open}
            onOpenChange={(value) => {
                if (!value) {
                    onClose();
                }
            }}
        >
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm" />
                <Dialog.Content className="fixed inset-0 z-50 mx-auto my-10 flex w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-slate-800/80 bg-slate-950/90 shadow-2xl focus:outline-none">
                    <FormProvider {...methods}>
                        <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-6 p-6">
                            <div className="flex items-start justify-between gap-4">
                                <div className="space-y-2">
                                    <Dialog.Title className="text-xl font-semibold text-white">
                                        {mode === 'update' ? 'Edit contact' : 'Add contact'}
                                    </Dialog.Title>
                                    <Dialog.Description className="text-sm text-slate-300">
                                        {mode === 'update'
                                            ? 'Update contact details and keep their profile aligned.'
                                            : 'Capture a new lead without leaving the workspace.'}
                                    </Dialog.Description>
                                </div>
                                <Dialog.Close asChild>
                                    <button
                                        type="button"
                                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-700/70 text-slate-300 transition hover:border-slate-500 hover:text-white"
                                        aria-label="Close"
                                    >
                                        ×
                                    </button>
                                </Dialog.Close>
                            </div>

                            {submitError ? (
                                <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                                    {submitError}
                                </div>
                            ) : null}

                            {isLoading ? (
                                <div className="flex flex-1 items-center justify-center text-sm text-slate-400">Loading contact…</div>
                            ) : (
                                <FieldGrid className="gap-4">
                                    <FieldWrapper name="firstName" label="First name" size="md">
                                        <TextInput name="firstName" placeholder="Jamie" autoComplete="given-name" />
                                    </FieldWrapper>
                                    <FieldWrapper name="lastName" label="Last name" size="md">
                                        <TextInput name="lastName" placeholder="Rivera" autoComplete="family-name" />
                                    </FieldWrapper>
                                    <FieldWrapper name="business" label="Business" size="lg">
                                        <TextInput name="business" placeholder="Aperture Studio" autoComplete="organization" />
                                    </FieldWrapper>
                                    <FieldWrapper name="email" label="Email" size="lg" helpText="Used for hand-offs and quick replies.">
                                        <TextInput name="email" type="email" placeholder="jamie@example.com" autoComplete="email" />
                                    </FieldWrapper>
                                    <FieldWrapper name="phone" label="Phone" size="sm">
                                        <TextInput name="phone" type="tel" placeholder="(555) 010-1234" autoComplete="tel" />
                                    </FieldWrapper>
                                    <FieldWrapper name="address" label="Address" size="xl">
                                        <TextInput name="address" placeholder="872 Market Street" autoComplete="street-address" />
                                    </FieldWrapper>
                                    <FieldWrapper name="city" label="City" size="md">
                                        <TextInput name="city" placeholder="San Francisco" autoComplete="address-level2" />
                                    </FieldWrapper>
                                    <FieldWrapper name="state" label="State / Region" size="sm">
                                        <TextInput name="state" placeholder="CA" autoComplete="address-level1" />
                                    </FieldWrapper>
                                    <FieldWrapper name="notes" label="Notes" size="xl" helpText="Keep context, preferences, and follow-up reminders together.">
                                        <Textarea name="notes" rows={4} placeholder="Add context or follow-up details" />
                                    </FieldWrapper>
                                </FieldGrid>
                            )}

                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    className="rounded-2xl border border-slate-800/70 bg-slate-900/60 px-4 py-2 text-sm text-slate-300 transition hover:border-slate-600 hover:text-white"
                                    onClick={onClose}
                                    disabled={isSubmitting}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                                    disabled={isSubmitting || isLoading}
                                >
                                    {isSubmitting
                                        ? mode === 'update'
                                            ? 'Saving…'
                                            : 'Adding…'
                                        : mode === 'update'
                                            ? 'Save changes'
                                            : 'Add contact'}
                                </button>
                            </div>
                        </form>
                    </FormProvider>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}

export default ContactFormModal;
