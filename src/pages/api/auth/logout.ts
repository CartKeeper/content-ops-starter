import type { NextApiRequest, NextApiResponse } from 'next';

import { clearSessionCookie } from '../../../lib/session-cookie';

export default async function handler(request: NextApiRequest, response: NextApiResponse) {
    if (request.method !== 'POST') {
        response.setHeader('Allow', 'POST');
        return response.status(405).json({ error: 'Method not allowed' });
    }

    clearSessionCookie(response);

    return response.status(200).json({ success: true });
}
