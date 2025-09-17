import type { Handler } from '@netlify/functions';
import Stripe from 'stripe';

import type { InvoiceRecord } from '../../src/types/invoice';

type CheckoutSessionRequest = {
    invoice?: InvoiceRecord;
    successUrl?: string;
    cancelUrl?: string;
};

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_API_VERSION: Stripe.LatestApiVersion = '2025-08-27.basil';

const handler: Handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed.' })
        };
    }

    if (!STRIPE_SECRET_KEY) {
        console.error('create-checkout-session: missing STRIPE_SECRET_KEY environment variable');
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Stripe is not configured for this site.' })
        };
    }

    const clientContext = event.clientContext as unknown as { user?: { app_metadata?: { roles?: unknown } } } | undefined;
    const roles = Array.isArray(clientContext?.user?.app_metadata?.roles)
        ? clientContext?.user?.app_metadata?.roles
        : [];
    const hasPhotographerRole = roles.some((role) => typeof role === 'string' && role.toLowerCase() === 'photographer');
    if (!hasPhotographerRole) {
        return {
            statusCode: 403,
            body: JSON.stringify({ error: 'Photographer access is required to create payment links.' })
        };
    }

    let payload: CheckoutSessionRequest | null = null;
    try {
        const requestBody = event.body as string | null;
        if (requestBody) {
            payload = JSON.parse(requestBody) as CheckoutSessionRequest;
        }
    } catch (error) {
        console.warn('create-checkout-session: invalid request payload', error);
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Invalid request payload.' })
        };
    }

    if (!payload?.invoice) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Invoice details are required.' })
        };
    }

    const invoice = payload.invoice;

    if (!Array.isArray(invoice.lineItems) || invoice.lineItems.length === 0) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'At least one line item is required to create a payment session.' })
        };
    }

    try {
        const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: STRIPE_API_VERSION });
        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            customer_email: invoice.clientEmail,
            payment_method_types: ['card'],
            allow_promotion_codes: true,
            metadata: {
                invoiceId: invoice.id,
                project: invoice.project
            },
            line_items: invoice.lineItems.map((item) => ({
                quantity: Math.max(1, item.quantity),
                price_data: {
                    currency: invoice.currency.toLowerCase(),
                    product_data: {
                        name: item.description
                    },
                    unit_amount: Math.round(item.unitPrice * 100)
                }
            })),
            success_url: payload.successUrl ?? 'https://codex.studio/checkout/success',
            cancel_url: payload.cancelUrl ?? 'https://codex.studio/checkout/cancel'
        });

        return {
            statusCode: 200,
            body: JSON.stringify({ id: session.id, url: session.url })
        };
    } catch (error) {
        console.error('create-checkout-session: Stripe error', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Unable to create a Stripe checkout session.' })
        };
    }
};

export { handler };
