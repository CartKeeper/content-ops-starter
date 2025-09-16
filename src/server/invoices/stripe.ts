import Stripe from 'stripe';

import type { InvoiceRecord } from '../../types/invoice';

let stripeClient: Stripe | null = null;

function getStripeClient(): Stripe | null {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
        return null;
    }

    if (!stripeClient) {
        stripeClient = new Stripe(secretKey);
    }

    return stripeClient;
}

export async function createStripePaymentLink(invoice: InvoiceRecord): Promise<string | null> {
    const stripe = getStripeClient();

    if (!stripe) {
        return null;
    }

    try {
        const paymentLink = await stripe.paymentLinks.create({
            line_items: [
                {
                    price_data: {
                        currency: invoice.currency.toLowerCase(),
                        unit_amount: Math.round(invoice.totals.total * 100),
                        product_data: {
                            name: invoice.project || `Invoice ${invoice.id}`,
                            metadata: {
                                invoiceId: invoice.id,
                                client: invoice.client
                            }
                        }
                    },
                    quantity: 1
                }
            ],
            metadata: {
                invoiceId: invoice.id,
                client: invoice.client
            },
            after_completion: {
                type: 'redirect',
                redirect: {
                    url: process.env.STRIPE_SUCCESS_URL || 'https://thankyou.example.com/invoice-paid'
                }
            }
        });

        return paymentLink.url;
    } catch (error) {
        console.warn('Unable to generate Stripe payment link', error);
        return null;
    }
}
