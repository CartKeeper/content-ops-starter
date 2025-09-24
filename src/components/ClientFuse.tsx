'use client';

import { PropsWithChildren } from 'react';
import { useRenderFuse } from '@/lib/useRenderFuse';

/**
 * Wraps children and trips if this subtree re-renders excessively.
 *
 * In production we skip the fuse entirely so runtime behaviour
 * never changes for end users. The fuse is only meant to help
 * developers catch feedback loops while working locally.
 */
export default function ClientFuse({ children }: PropsWithChildren) {
    if (process.env.NODE_ENV !== 'production') {
        useRenderFuse('ClientFuse'); // name shows up in any loop error
    }

    return <>{children}</>;
}
