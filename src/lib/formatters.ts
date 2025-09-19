import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const DEFAULT_CURRENCY_FORMATTER = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2
});

export function formatCurrency(
    value: number | null | undefined,
    options?: Intl.NumberFormatOptions
): string {
    if (typeof value !== 'number' || Number.isNaN(value)) {
        return '$0.00';
    }

    const formatter = options
        ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', ...options })
        : DEFAULT_CURRENCY_FORMATTER;

    return formatter.format(value / 100);
}

export function formatDate(value: string | Date | null | undefined, fallback = '—'): string {
    if (!value) {
        return fallback;
    }

    const parsed = typeof value === 'string' ? dayjs(value) : dayjs(value);
    if (!parsed.isValid()) {
        return fallback;
    }

    return parsed.format('MMM D, YYYY');
}

export function formatDateTime(value: string | Date | null | undefined, fallback = '—'): string {
    if (!value) {
        return fallback;
    }

    const parsed = typeof value === 'string' ? dayjs(value) : dayjs(value);
    if (!parsed.isValid()) {
        return fallback;
    }

    return parsed.format('MMM D, YYYY • h:mm A');
}

export function formatRelative(value: string | Date | null | undefined, fallback = '—'): string {
    if (!value) {
        return fallback;
    }

    const parsed = typeof value === 'string' ? dayjs(value) : dayjs(value);
    if (!parsed.isValid()) {
        return fallback;
    }

    return parsed.fromNow();
}

export function formatPhone(value: string | null | undefined): string {
    if (!value) {
        return '—';
    }

    const digits = value.replace(/\D+/g, '');
    if (digits.length === 10) {
        const area = digits.slice(0, 3);
        const prefix = digits.slice(3, 6);
        const line = digits.slice(6);
        return `(${area}) ${prefix}-${line}`;
    }

    return value;
}

