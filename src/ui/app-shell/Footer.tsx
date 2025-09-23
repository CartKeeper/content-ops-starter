import type { ReactNode } from 'react';

export type FooterProps = {
    children?: ReactNode;
};

export function Footer({ children }: FooterProps) {
    const year = new Date().getFullYear();

    return (
        <footer className="border-t border-border-subtle bg-surface py-6">
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 text-sm text-text-subtle sm:flex-row sm:items-center sm:justify-between">
                <span>&copy; {year} Aperture Studio CRM. All rights reserved.</span>
                {children ? <div className="flex items-center gap-2">{children}</div> : null}
            </div>
        </footer>
    );
}
