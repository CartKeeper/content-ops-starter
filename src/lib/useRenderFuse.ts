'use client';
import { useRef } from 'react';

/** Throws/logs if a component renders >limit times within windowMs. */
export function useRenderFuse(name: string, limit = 50, windowMs = 1000) {
    if (typeof performance === 'undefined') {
        return;
    }

    const count = useRef(0);
    const start = useRef(performance.now());
    const now = performance.now();

    if (now - start.current > windowMs) {
        start.current = now;
        count.current = 0;
    }
    if (++count.current > limit) {
        // eslint-disable-next-line no-console
        console.error(`[render-fuse] ${name} exceeded ${limit} renders/${windowMs}ms`);
        throw new Error(`[render-fuse] ${name} render loop`);
    }
}
