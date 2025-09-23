import type { ReactNode, HTMLAttributes } from 'react';
import clsx from 'classnames';

export type ContainerWidth = 'narrow' | 'base' | 'wide' | 'full';

export type ContainerProps = HTMLAttributes<HTMLDivElement> & {
    children: ReactNode;
    width?: ContainerWidth;
    padded?: boolean;
};

const WIDTH_CLASS: Record<ContainerWidth, string> = {
    narrow: 'max-w-3xl',
    base: 'max-w-7xl',
    wide: 'max-w-[88rem]',
    full: 'max-w-none'
};

export function Container({ children, width = 'base', padded = true, className, ...props }: ContainerProps) {
    return (
        <div
            className={clsx(
                'mx-auto w-full',
                WIDTH_CLASS[width],
                padded && 'px-4',
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}
