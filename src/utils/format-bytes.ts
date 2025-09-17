const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

export function formatBytes(bytes: number | null | undefined, precision = 1): string {
    const size = typeof bytes === 'number' && Number.isFinite(bytes) ? Math.max(0, bytes) : 0;

    if (size === 0) {
        return '0 B';
    }

    const exponent = Math.min(Math.floor(Math.log(size) / Math.log(1024)), UNITS.length - 1);
    const value = size / 1024 ** exponent;
    const formatted = value.toFixed(exponent === 0 ? 0 : precision);
    return `${formatted.replace(/\.0+$/, '')} ${UNITS[exponent]}`;
}

export function sumBytes(values: Array<number | null | undefined>): number {
    return values.reduce((total, entry) => {
        if (typeof entry === 'number' && Number.isFinite(entry)) {
            return total + Math.max(0, entry);
        }
        return total;
    }, 0);
}
