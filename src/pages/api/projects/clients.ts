import type { NextApiRequest, NextApiResponse } from 'next';

import { listProjectClients } from '../../../server/projects/store';

type ClientsResponse = { clients: Array<{ id: string; name: string }> };
type ErrorResponse = { error: string };

export default async function handler(
    request: NextApiRequest,
    response: NextApiResponse<ClientsResponse | ErrorResponse>
) {
    if (request.method !== 'GET') {
        response.setHeader('Allow', 'GET');
        response.status(405).json({ error: 'Method not allowed.' });
        return;
    }

    try {
        const clients = await listProjectClients();
        response.status(200).json({ clients });
    } catch (error) {
        console.error('Failed to load project clients', error);
        response.status(500).json({ error: 'Failed to load clients.' });
    }
}

