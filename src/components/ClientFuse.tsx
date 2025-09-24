'use client';

import { PropsWithChildren } from 'react';
import { useRenderFuse } from '@/lib/useRenderFuse';

/** Wraps children and trips if this subtree re-renders excessively. */
export default function ClientFuse({ children }: PropsWithChildren) {
    useRenderFuse('ClientFuse'); // name shows up in any loop error
    return <>{children}</>;
}
