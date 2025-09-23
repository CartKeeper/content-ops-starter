const hasPublishableKey = Boolean(
    typeof process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY === 'string'
        ? process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.trim().length
        : false,
);

export const BILLING_ENABLED: boolean =
    process.env.NEXT_PUBLIC_BILLING_ENABLED === 'true' && hasPublishableKey;

export function isBillingEnabled(): boolean {
    return BILLING_ENABLED;
}

const TOUR_ENV_FLAG = process.env.NEXT_PUBLIC_ENABLE_TOUR === 'true';

export function isTourGloballyEnabled(): boolean {
    return TOUR_ENV_FLAG;
}
