import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'framer-motion';
import dayjs from 'dayjs';

import type { BookingStatus } from './BookingList';

const inputBaseStyles =
    'w-full rounded-xl border border-white/50 bg-white/60 px-3 py-2 text-sm text-slate-800 shadow-sm backdrop-blur focus:border-[#5D3BFF] focus:outline-none focus:ring-2 focus:ring-[#4DE5FF] dark:border-slate-700/80 dark:bg-slate-900/60 dark:text-slate-100 dark:focus:border-[#7ADFFF] dark:focus:ring-[#4DE5FF]';

type QuickSetupModalProps = {
    open: boolean;
    onClose: () => void;
};

type QuickSetupFormState = {
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    contactBusiness: string;
    contactNotes: string;
    convertToClient: boolean;
    projectTitle: string;
    shootType: string;
    location: string;
    shootDate: string;
    startTime: string;
    endTime: string;
    status: BookingStatus;
    creativeVision: string;
    budget: string;
};

type ContactResponse = {
    data?: { id: string };
    error?: string;
};

type BookingResponse = {
    error?: string;
};

function createInitialState(): QuickSetupFormState {
    return {
        contactName: '',
        contactEmail: '',
        contactPhone: '',
        contactBusiness: '',
        contactNotes: '',
        convertToClient: true,
        projectTitle: '',
        shootType: '',
        location: '',
        shootDate: dayjs().format('YYYY-MM-DD'),
        startTime: '09:00',
        endTime: '',
        status: 'Pending',
        creativeVision: '',
        budget: ''
    };
}

function parseOptionalString(value: unknown): string | undefined {
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed) {
            return trimmed;
        }
    }

    return undefined;
}

function parseStringValue(value: unknown, fallback: string): string {
    return parseOptionalString(value) ?? fallback;
}

function toBookingStatus(value: BookingStatus | string): BookingStatus {
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (normalized === 'confirmed') {
            return 'Confirmed';
        }
        if (normalized === 'editing') {
            return 'Editing';
        }
    }

    return 'Pending';
}

function formatTimeLabel(value: string): string | undefined {
    const trimmed = value.trim();
    if (!trimmed) {
        return undefined;
    }

    const parsed = dayjs(trimmed, ['HH:mm', 'H:mm', 'h:mm A', 'h:mmA'], true);
    if (parsed.isValid()) {
        return parsed.format('h:mm A');
    }

    const fallback = dayjs(trimmed);
    return fallback.isValid() ? fallback.format('h:mm A') : undefined;
}

function buildBookingPayload(values: QuickSetupFormState): Record<string, unknown> {
    const client = parseStringValue(values.contactName, 'New client');
    const shootType = parseStringValue(values.shootType || values.projectTitle, 'Session');
    const location = parseStringValue(values.location, 'Studio TBD');
    const status = toBookingStatus(values.status);

    const dateValue =
        typeof values.shootDate === 'string' && dayjs(values.shootDate).isValid() ? dayjs(values.shootDate).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD');

    const startTime = formatTimeLabel(values.startTime) ?? '9:00 AM';
    const endTime = values.endTime ? formatTimeLabel(values.endTime) : undefined;

    const payload: Record<string, unknown> = {
        client,
        shootType,
        date: dateValue,
        startTime,
        location,
        status,
        time: endTime ? `${startTime} – ${endTime}` : startTime
    };

    if (endTime) {
        payload.endTime = endTime;
    }

    const customFields: Record<string, string> = {};

    const projectTitle = values.projectTitle.trim();
    if (projectTitle) {
        customFields['project-title'] = projectTitle;
    }

    const creativeVision = values.creativeVision.trim();
    if (creativeVision) {
        customFields['creative-vision'] = creativeVision;
    }

    const budget = values.budget.trim();
    if (budget) {
        customFields.budget = budget;
    }

    const contactNotes = values.contactNotes.trim();
    if (contactNotes) {
        customFields['contact-notes'] = contactNotes;
    }

    const contactBusiness = values.contactBusiness.trim();
    if (contactBusiness) {
        customFields.business = contactBusiness;
    }

    if (Object.keys(customFields).length > 0) {
        payload.customFields = customFields;
    }

    return payload;
}

export function QuickSetupModal({ open, onClose }: QuickSetupModalProps) {
    const [formValues, setFormValues] = React.useState<QuickSetupFormState>(() => createInitialState());
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [success, setSuccess] = React.useState<string | null>(null);

    const formRef = React.useRef<HTMLFormElement | null>(null);

    React.useEffect(() => {
        if (!open) {
            setFormValues(createInitialState());
            setIsSubmitting(false);
            setError(null);
            setSuccess(null);
        }
    }, [open]);

    const handleFieldChange = <Field extends keyof QuickSetupFormState>(field: Field, value: QuickSetupFormState[Field]) => {
        setFormValues((previous) => ({ ...previous, [field]: value }));
        setError(null);
        setSuccess(null);
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (isSubmitting) {
            return;
        }

        setIsSubmitting(true);
        setError(null);
        setSuccess(null);

        try {
            const contactPayload = {
                name: formValues.contactName,
                email: formValues.contactEmail,
                phone: formValues.contactPhone,
                business: formValues.contactBusiness,
                notes: formValues.contactNotes
            };

            const contactResponse = await fetch('/api/contacts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(contactPayload)
            });

            let contactResult: ContactResponse | null = null;
            try {
                contactResult = (await contactResponse.json()) as ContactResponse;
            } catch (parseError) {
                contactResult = null;
            }

            if (!contactResponse.ok || !contactResult?.data?.id) {
                const message = contactResult?.error ?? 'Unable to save contact. Please try again.';
                throw new Error(message);
            }

            const contactId = contactResult.data.id;
            let convertWarning: string | null = null;

            if (formValues.convertToClient) {
                try {
                    const convertResponse = await fetch('/api/contacts/convert', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ contactId })
                    });

                    if (!convertResponse.ok) {
                        const payload = (await convertResponse.json().catch(() => null)) as { error?: string } | null;
                        convertWarning = payload?.error ?? 'Contact saved but conversion failed.';
                    }
                } catch (convertError) {
                    convertWarning = convertError instanceof Error ? convertError.message : 'Contact saved but conversion failed.';
                }
            }

            const bookingPayload = buildBookingPayload(formValues);
            const bookingResponse = await fetch('/api/crm/bookings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bookingPayload)
            });

            let bookingResult: BookingResponse | null = null;
            try {
                bookingResult = (await bookingResponse.json()) as BookingResponse;
            } catch (parseError) {
                bookingResult = null;
            }

            if (!bookingResponse.ok) {
                const message = bookingResult?.error ?? 'Unable to create booking. Please try again.';
                throw new Error(message);
            }

            const clientDisplayName = formValues.contactName.trim() || 'client';
            const successMessage = convertWarning
                ? `Booked ${clientDisplayName}, but conversion to client needs attention: ${convertWarning}`
                : `Booked ${clientDisplayName} and captured project details.`;

            setSuccess(successMessage);
            setFormValues(createInitialState());
            formRef.current?.reset();
        } catch (submissionError) {
            const message = submissionError instanceof Error ? submissionError.message : 'Unable to complete quick setup. Please try again.';
            setError(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog.Root open={open} onOpenChange={(nextOpen) => (!nextOpen ? onClose() : undefined)}>
            <AnimatePresence>
                {open ? (
                    <Dialog.Portal forceMount>
                        <Dialog.Overlay asChild>
                            <motion.div
                                className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2, ease: 'easeOut' }}
                            />
                        </Dialog.Overlay>
                        <Dialog.Content asChild>
                            <motion.div
                                className="fixed left-1/2 top-1/2 z-[101] w-full max-w-5xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[32px] border border-white/20 bg-white/85 shadow-2xl backdrop-blur-xl transition dark:border-slate-700/60 dark:bg-slate-950/80"
                                initial={{ opacity: 0, y: 32, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -24, scale: 0.98 }}
                                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                            >
                                <div className="max-h-[min(90vh,900px)] overflow-y-auto p-8">
                                    <Dialog.Close asChild>
                                        <button
                                            type="button"
                                            className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/40 bg-white/60 text-slate-500 transition hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4DE5FF] dark:border-slate-700/80 dark:bg-slate-900/80 dark:text-slate-300"
                                            aria-label="Close quick setup"
                                            onClick={onClose}
                                        >
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth={1.5}
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                className="h-5 w-5"
                                            >
                                                <path d="m16 8-8 8" />
                                                <path d="m8 8 8 8" />
                                            </svg>
                                        </button>
                                    </Dialog.Close>
                                    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6" noValidate>
                                        <header className="space-y-2">
                                            <Dialog.Title className="text-2xl font-semibold text-slate-900 dark:text-white">Quick client setup</Dialog.Title>
                                            <Dialog.Description className="text-sm text-slate-600 dark:text-slate-300">
                                                Capture contact details and project requirements in one streamlined workflow. Ideal when a lead calls in and you
                                                need to book the session immediately.
                                            </Dialog.Description>
                                        </header>
                                        {error ? (
                                            <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-800 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-100">
                                                {error}
                                            </div>
                                        ) : null}
                                        {success ? (
                                            <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-100">
                                                {success}
                                            </div>
                                        ) : null}
                                        <div className="grid gap-6 lg:grid-cols-2">
                                            <section className="space-y-5 rounded-3xl border border-white/40 bg-white/70 p-6 shadow-inner dark:border-slate-700/70 dark:bg-slate-900/60">
                                                <div className="space-y-1">
                                                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Contact card</h3>
                                                    <p className="text-sm text-slate-600 dark:text-slate-400">
                                                        Gather personal details so you can follow up with proposals, invoices, and delivery.
                                                    </p>
                                                </div>
                                                <div className="space-y-4 text-sm">
                                                    <div className="space-y-1">
                                                        <label htmlFor="quick-setup-contact-name" className="font-medium text-slate-700 dark:text-slate-200">
                                                            Full name
                                                        </label>
                                                        <input
                                                            id="quick-setup-contact-name"
                                                            type="text"
                                                            className={inputBaseStyles}
                                                            placeholder="Jamie Rivera"
                                                            value={formValues.contactName}
                                                            onChange={(event) => handleFieldChange('contactName', event.target.value)}
                                                            required
                                                            disabled={isSubmitting}
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label htmlFor="quick-setup-contact-email" className="font-medium text-slate-700 dark:text-slate-200">
                                                            Email
                                                        </label>
                                                        <input
                                                            id="quick-setup-contact-email"
                                                            type="email"
                                                            className={inputBaseStyles}
                                                            placeholder="jamie@example.com"
                                                            value={formValues.contactEmail}
                                                            onChange={(event) => handleFieldChange('contactEmail', event.target.value)}
                                                            disabled={isSubmitting}
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label htmlFor="quick-setup-contact-phone" className="font-medium text-slate-700 dark:text-slate-200">
                                                            Phone
                                                        </label>
                                                        <input
                                                            id="quick-setup-contact-phone"
                                                            type="tel"
                                                            className={inputBaseStyles}
                                                            placeholder="(555) 010-1234"
                                                            value={formValues.contactPhone}
                                                            onChange={(event) => handleFieldChange('contactPhone', event.target.value)}
                                                            disabled={isSubmitting}
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label
                                                            htmlFor="quick-setup-contact-business"
                                                            className="font-medium text-slate-700 dark:text-slate-200"
                                                        >
                                                            Business or organization
                                                        </label>
                                                        <input
                                                            id="quick-setup-contact-business"
                                                            type="text"
                                                            className={inputBaseStyles}
                                                            placeholder="Rivera Creative Studio"
                                                            value={formValues.contactBusiness}
                                                            onChange={(event) => handleFieldChange('contactBusiness', event.target.value)}
                                                            disabled={isSubmitting}
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label htmlFor="quick-setup-contact-notes" className="font-medium text-slate-700 dark:text-slate-200">
                                                            Relationship notes
                                                        </label>
                                                        <textarea
                                                            id="quick-setup-contact-notes"
                                                            className={`${inputBaseStyles} min-h-[112px] resize-none`}
                                                            placeholder="Referred by Alex; prefers text updates."
                                                            value={formValues.contactNotes}
                                                            onChange={(event) => handleFieldChange('contactNotes', event.target.value)}
                                                            disabled={isSubmitting}
                                                        />
                                                    </div>
                                                    <label className="flex items-center gap-3 rounded-2xl border border-white/40 bg-white/60 px-4 py-3 text-sm font-medium text-slate-700 transition dark:border-slate-700/70 dark:bg-slate-900/60 dark:text-slate-200">
                                                        <input
                                                            type="checkbox"
                                                            className="h-4 w-4 rounded border border-slate-300 text-indigo-600 focus:ring-[#4DE5FF] dark:border-slate-600"
                                                            checked={formValues.convertToClient}
                                                            onChange={(event) => handleFieldChange('convertToClient', event.target.checked)}
                                                            disabled={isSubmitting}
                                                        />
                                                        Convert to client after saving contact
                                                    </label>
                                                </div>
                                            </section>
                                            <section className="space-y-5 rounded-3xl border border-white/40 bg-white/70 p-6 shadow-inner dark:border-slate-700/70 dark:bg-slate-900/60">
                                                <div className="space-y-1">
                                                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Project card</h3>
                                                    <p className="text-sm text-slate-600 dark:text-slate-400">
                                                        Define the shoot logistics while you have the client on the call.
                                                    </p>
                                                </div>
                                                <div className="grid gap-4 text-sm">
                                                    <div className="space-y-1">
                                                        <label htmlFor="quick-setup-project-title" className="font-medium text-slate-700 dark:text-slate-200">
                                                            Project title
                                                        </label>
                                                        <input
                                                            id="quick-setup-project-title"
                                                            type="text"
                                                            className={inputBaseStyles}
                                                            placeholder="Spring campaign"
                                                            value={formValues.projectTitle}
                                                            onChange={(event) => handleFieldChange('projectTitle', event.target.value)}
                                                            disabled={isSubmitting}
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label htmlFor="quick-setup-shoot-type" className="font-medium text-slate-700 dark:text-slate-200">
                                                            Shoot type
                                                        </label>
                                                        <input
                                                            id="quick-setup-shoot-type"
                                                            type="text"
                                                            className={inputBaseStyles}
                                                            placeholder="Brand portraits"
                                                            value={formValues.shootType}
                                                            onChange={(event) => handleFieldChange('shootType', event.target.value)}
                                                            required
                                                            disabled={isSubmitting}
                                                        />
                                                    </div>
                                                    <div className="grid gap-4 sm:grid-cols-2">
                                                        <div className="space-y-1">
                                                            <label htmlFor="quick-setup-shoot-date" className="font-medium text-slate-700 dark:text-slate-200">
                                                                Shoot date
                                                            </label>
                                                            <input
                                                                id="quick-setup-shoot-date"
                                                                type="date"
                                                                className={inputBaseStyles}
                                                                value={formValues.shootDate}
                                                                onChange={(event) => handleFieldChange('shootDate', event.target.value)}
                                                                required
                                                                disabled={isSubmitting}
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label htmlFor="quick-setup-status" className="font-medium text-slate-700 dark:text-slate-200">
                                                                Status
                                                            </label>
                                                            <select
                                                                id="quick-setup-status"
                                                                className={`${inputBaseStyles} pr-10`}
                                                                value={formValues.status}
                                                                onChange={(event) => handleFieldChange('status', event.target.value as BookingStatus)}
                                                                disabled={isSubmitting}
                                                            >
                                                                <option value="Pending">Pending</option>
                                                                <option value="Confirmed">Confirmed</option>
                                                                <option value="Editing">Editing</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                    <div className="grid gap-4 sm:grid-cols-2">
                                                        <div className="space-y-1">
                                                            <label htmlFor="quick-setup-start-time" className="font-medium text-slate-700 dark:text-slate-200">
                                                                Start time
                                                            </label>
                                                            <input
                                                                id="quick-setup-start-time"
                                                                type="time"
                                                                className={inputBaseStyles}
                                                                value={formValues.startTime}
                                                                onChange={(event) => handleFieldChange('startTime', event.target.value)}
                                                                required
                                                                disabled={isSubmitting}
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label htmlFor="quick-setup-end-time" className="font-medium text-slate-700 dark:text-slate-200">
                                                                End time
                                                            </label>
                                                            <input
                                                                id="quick-setup-end-time"
                                                                type="time"
                                                                className={inputBaseStyles}
                                                                value={formValues.endTime}
                                                                onChange={(event) => handleFieldChange('endTime', event.target.value)}
                                                                disabled={isSubmitting}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label htmlFor="quick-setup-location" className="font-medium text-slate-700 dark:text-slate-200">
                                                            Location
                                                        </label>
                                                        <input
                                                            id="quick-setup-location"
                                                            type="text"
                                                            className={inputBaseStyles}
                                                            placeholder="Studio or on-site address"
                                                            value={formValues.location}
                                                            onChange={(event) => handleFieldChange('location', event.target.value)}
                                                            required
                                                            disabled={isSubmitting}
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label htmlFor="quick-setup-vision" className="font-medium text-slate-700 dark:text-slate-200">
                                                            Creative vision & must-have shots
                                                        </label>
                                                        <textarea
                                                            id="quick-setup-vision"
                                                            className={`${inputBaseStyles} min-h-[112px] resize-none`}
                                                            placeholder="Focus on natural light headshots and collaborative team imagery."
                                                            value={formValues.creativeVision}
                                                            onChange={(event) => handleFieldChange('creativeVision', event.target.value)}
                                                            disabled={isSubmitting}
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label htmlFor="quick-setup-budget" className="font-medium text-slate-700 dark:text-slate-200">
                                                            Proposed budget
                                                        </label>
                                                        <input
                                                            id="quick-setup-budget"
                                                            type="text"
                                                            className={inputBaseStyles}
                                                            placeholder="$2,400 retainer"
                                                            value={formValues.budget}
                                                            onChange={(event) => handleFieldChange('budget', event.target.value)}
                                                            disabled={isSubmitting}
                                                        />
                                                    </div>
                                                </div>
                                            </section>
                                        </div>
                                        <footer className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                                            <button
                                                type="button"
                                                onClick={onClose}
                                                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#4DE5FF] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                                            >
                                                {success ? 'Close' : 'Cancel'}
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={isSubmitting}
                                                className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#5D3BFF] via-[#3D7CFF] to-[#4DE5FF] px-6 py-2 text-sm font-semibold text-white shadow-lg transition hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[#4DE5FF] focus:ring-offset-2 focus:ring-offset-white disabled:cursor-not-allowed disabled:opacity-70 dark:focus:ring-offset-slate-900"
                                            >
                                                {isSubmitting ? 'Saving…' : 'Start booking'}
                                            </button>
                                        </footer>
                                    </form>
                                </div>
                            </motion.div>
                        </Dialog.Content>
                    </Dialog.Portal>
                ) : null}
            </AnimatePresence>
        </Dialog.Root>
    );
}

export default QuickSetupModal;
