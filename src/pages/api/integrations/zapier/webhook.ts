import crypto from 'crypto';
import type { NextApiRequest, NextApiResponse } from 'next';

import { getSupabaseClient } from '../../../../utils/supabase-client';
import type { ZapierWebhookPayload } from '../../../../types/zapier';

export const config = {
    api: {
        bodyParser: false
    }
};

const SIGNATURE_HEADER = 'x-zapier-signature';
const ZAP_ID_HEADER = 'x-zap-id';
const EVENT_HEADER = 'x-zap-event';

async function readRawBody(req: NextApiRequest): Promise<string> {
    const chunks: Uint8Array[] = [];
    for await (const chunk of req) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk, 'utf8') : chunk);
    }
    return Buffer.concat(chunks).toString('utf8');
}

function verifySignature(secret: string | null, rawBody: string, signatureHeader: string | string[] | undefined): boolean {
    if (!secret) {
        return true;
    }

    if (!signatureHeader) {
        return false;
    }

    const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    const signatureBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expected, 'hex');
    if (signatureBuffer.length !== expectedBuffer.length) {
        return false;
    }
    const signatureBytes = new Uint8Array(
        signatureBuffer.buffer,
        signatureBuffer.byteOffset,
        signatureBuffer.byteLength
    );
    const expectedBytes = new Uint8Array(expectedBuffer.buffer, expectedBuffer.byteOffset, expectedBuffer.byteLength);
    return crypto.timingSafeEqual(signatureBytes, expectedBytes);
}

type ZapierWebhookResponse = {
    ok: boolean;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<ZapierWebhookResponse>) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        res.status(405).json({ ok: false });
        return;
    }

    try {
        const rawBody = await readRawBody(req);
        const secret = process.env.ZAPIER_WEBHOOK_SECRET ?? null;

        if (!verifySignature(secret, rawBody, req.headers[SIGNATURE_HEADER])) {
            res.status(401).json({ ok: false });
            return;
        }

        const zapIdHeader = req.headers[ZAP_ID_HEADER];
        const eventHeader = req.headers[EVENT_HEADER];
        const zapId = Array.isArray(zapIdHeader) ? zapIdHeader[0] : zapIdHeader;
        const eventType = Array.isArray(eventHeader) ? eventHeader[0] : eventHeader;

        let payload: ZapierWebhookPayload | Record<string, unknown> | null = null;
        if (rawBody) {
            try {
                payload = JSON.parse(rawBody) as ZapierWebhookPayload;
            } catch (error) {
                console.warn('Zapier payload is not valid JSON', error);
            }
        }

        const supabase = getSupabaseClient();
        const receivedAt = new Date().toISOString();

        await supabase.from('zapier_webhook_events').insert({
            zap_id: zapId,
            event_type: eventType ?? (payload && typeof payload === 'object' && 'event' in payload ? String(payload.event) : null),
            status: 'received',
            payload,
            headers: req.headers,
            received_at: receivedAt
        });

        res.status(202).json({ ok: true });
    } catch (error) {
        console.error('Unhandled Zapier webhook error', error);
        res.status(500).json({ ok: false });
    }
}
