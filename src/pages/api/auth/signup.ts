import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(request: NextApiRequest, response: NextApiResponse) {
    response.setHeader('Allow', 'POST');

    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method not allowed' });
    }

    return response.status(403).json({
        error: 'Self-service signups are disabled. Ask an administrator to send an invitation.',
    });
}
