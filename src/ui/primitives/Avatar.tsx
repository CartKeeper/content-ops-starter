import type { ReactNode } from 'react';
import clsx from 'classnames';

export type AvatarSize = 'sm' | 'md' | 'lg';
export type AvatarStatus = 'online' | 'offline' | 'busy';

export type AvatarProps = {
    name?: string;
    src?: string | null;
    size?: AvatarSize;
    status?: AvatarStatus;
    className?: string;
    fallback?: ReactNode;
};

const SIZE_CLASS: Record<AvatarSize, string> = {
    sm: 'h-8 w-8 text-sm',
    md: 'h-10 w-10 text-base',
    lg: 'h-12 w-12 text-lg'
};

const STATUS_CLASS: Record<AvatarStatus, string> = {
    online: 'bg-emerald-500',
    offline: 'bg-border-subtle',
    busy: 'bg-amber-500'
};

function initialsFromName(name?: string) {
    if (!name) {
        return '';
    }
    const parts = name.trim().split(/\s+/);
    const [first = '', second = ''] = parts;
    return (first.charAt(0) + second.charAt(0)).toUpperCase();
}

export function Avatar({ name, src, size = 'md', status, className, fallback }: AvatarProps) {
    const initials = initialsFromName(name);
    const showFallback = !src && (fallback || initials);

    return (
        <span className={clsx('relative inline-flex rounded-full bg-surface-muted text-text-primary', SIZE_CLASS[size], className)}>
            {src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={src}
                    alt={name ? `${name} avatar` : 'User avatar'}
                    className="h-full w-full rounded-full object-cover"
                />
            ) : showFallback ? (
                <span className="flex h-full w-full items-center justify-center font-medium">
                    {fallback ?? initials}
                </span>
            ) : null}
            {status ? (
                <span
                    className={clsx(
                        'absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-surface bg-surface',
                        STATUS_CLASS[status]
                    )}
                    aria-hidden
                />
            ) : null}
        </span>
    );
}
