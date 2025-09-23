import type { ReactNode } from 'react';
import clsx from 'classnames';

export type PageBodyProps = {
    children: ReactNode;
    width?: 'base' | 'wide' | 'narrow';
    className?: string;
};

const WIDTH_CLASS: Record<NonNullable<PageBodyProps['width']>, string> = {
    base: 'max-w-7xl',
    wide: 'max-w-[88rem]',
    narrow: 'max-w-4xl'
};

export function PageBody({ children, width = 'base', className }: PageBodyProps) {
    return (
        <div className={clsx('mx-auto w-full px-4', WIDTH_CLASS[width], className)}>{children}</div>
    );
}
