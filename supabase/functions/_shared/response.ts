export type JsonRecord = Record<string, unknown>;

export function jsonResponse(body: JsonRecord, init: ResponseInit = {}): Response {
    const headers = new Headers(init.headers);
    if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    return new Response(JSON.stringify(body), { ...init, headers });
}

export async function parseJsonRequest<T extends JsonRecord>(request: Request): Promise<T> {
    const contentType = request.headers.get('content-type') ?? '';
    if (!contentType.toLowerCase().includes('application/json')) {
        throw new Error('Request must include a JSON body');
    }

    const payload = (await request.json()) as T;
    return payload;
}
