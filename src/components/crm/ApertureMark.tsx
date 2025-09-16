import * as React from 'react';

const segmentPaths = [
    'M12.00 6.50 L12.00 2.00 A10 10 0 0 1 20.66 7.00 L16.76 9.25 A5.5 5.5 0 0 0 12.00 6.50 Z',
    'M16.76 9.25 L20.66 7.00 A10 10 0 0 1 20.66 17.00 L16.76 14.75 A5.5 5.5 0 0 0 16.76 9.25 Z',
    'M16.76 14.75 L20.66 17.00 A10 10 0 0 1 12.00 22.00 L12.00 17.50 A5.5 5.5 0 0 0 16.76 14.75 Z',
    'M12.00 17.50 L12.00 22.00 A10 10 0 0 1 3.34 17.00 L7.24 14.75 A5.5 5.5 0 0 0 12.00 17.50 Z',
    'M7.24 14.75 L3.34 17.00 A10 10 0 0 1 3.34 7.00 L7.24 9.25 A5.5 5.5 0 0 0 7.24 14.75 Z',
    'M7.24 9.25 L3.34 7.00 A10 10 0 0 1 12.00 2.00 L12.00 6.50 A5.5 5.5 0 0 0 7.24 9.25 Z'
];

const segmentColors = ['#5D3BFF', '#4534FF', '#3D7CFF', '#0F9BD7', '#4DE5FF', '#F45DC8'];

export type ApertureMarkProps = React.SVGProps<SVGSVGElement> & {
    title?: string;
};

export function ApertureMark({ title = 'Aperture Codex monogram', className, ...props }: ApertureMarkProps) {
    const reactId = React.useId();
    const sanitizedId = React.useMemo(() => reactId.replace(/:/g, ''), [reactId]);
    const titleId = `${sanitizedId}-title`;
    const gradientId = `${sanitizedId}-stroke`;

    return (
        <svg
            viewBox="0 0 24 24"
            role="img"
            aria-labelledby={titleId}
            className={className}
            {...props}
        >
            <title id={titleId}>{title}</title>
            <defs>
                <linearGradient id={gradientId} x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#5D3BFF" />
                    <stop offset="50%" stopColor="#3D7CFF" />
                    <stop offset="100%" stopColor="#4DE5FF" />
                </linearGradient>
            </defs>
            <circle cx={12} cy={12} r={11} fill="none" stroke={`url(#${gradientId})`} strokeWidth={1.5} />
            {segmentPaths.map((path, index) => (
                <path key={path} d={path} fill={segmentColors[index]} />
            ))}
            <circle cx={12} cy={12} r={3.2} fill="currentColor" opacity={0.85} />
        </svg>
    );
}

export default ApertureMark;
