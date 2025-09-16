import { getSupabaseClient } from './supabase-client';

const ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'DELETE'];

const parseId = (value) => {
    if (Array.isArray(value)) {
        return parseId(value[0]);
    }

    if (value === undefined || value === null) {
        return undefined;
    }

    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed === '' ? undefined : trimmed;
    }

    return value;
};

const parseBody = (body) => {
    if (body == null) {
        return null;
    }

    if (typeof body === 'string') {
        const trimmed = body.trim();
        if (!trimmed) {
            return null;
        }

        try {
            return JSON.parse(trimmed);
        } catch (err) {
            console.error('Failed to parse request body as JSON', err);
            return null;
        }
    }

    return body;
};

const ensureObject = (value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return null;
    }

    return value;
};

const handleSupabaseError = (res, error) => {
    console.error('Supabase error', error);
    const status = error && typeof error.status === 'number' ? error.status : 400;
    return res.status(status).json({ error: error?.message || 'Database error' });
};

async function handleGet(req, res, supabase, tableName) {
    const id = parseId(req.query.id);

    if (id) {
        const { data, error } = await supabase.from(tableName).select('*').eq('id', id).maybeSingle();

        if (error) {
            return handleSupabaseError(res, error);
        }

        if (!data) {
            return res.status(404).json({ error: 'Record not found' });
        }

        return res.status(200).json({ data });
    }

    const { data, error } = await supabase.from(tableName).select('*');

    if (error) {
        return handleSupabaseError(res, error);
    }

    return res.status(200).json({ data: data || [] });
}

async function handlePost(req, res, supabase, tableName) {
    const payload = ensureObject(parseBody(req.body));

    if (!payload) {
        return res.status(400).json({ error: 'Request body must be a JSON object' });
    }

    const { data, error } = await supabase.from(tableName).insert([payload]).select().single();

    if (error) {
        return handleSupabaseError(res, error);
    }

    return res.status(201).json({ data });
}

async function handlePut(req, res, supabase, tableName) {
    const payload = ensureObject(parseBody(req.body));

    if (!payload) {
        return res.status(400).json({ error: 'Request body must be a JSON object' });
    }

    const id = parseId(req.query.id) || parseId(payload.id);

    if (!id) {
        return res.status(400).json({ error: 'Record id is required' });
    }

    const update = { ...payload };
    delete update.id;

    if (Object.keys(update).length === 0) {
        return res.status(400).json({ error: 'No fields provided for update' });
    }

    const { data, error } = await supabase
        .from(tableName)
        .update(update)
        .eq('id', id)
        .select()
        .maybeSingle();

    if (error) {
        return handleSupabaseError(res, error);
    }

    if (!data) {
        return res.status(404).json({ error: 'Record not found' });
    }

    return res.status(200).json({ data });
}

async function handleDelete(req, res, supabase, tableName) {
    const payload = ensureObject(parseBody(req.body));
    const id = parseId(req.query.id) || parseId(payload?.id);

    if (!id) {
        return res.status(400).json({ error: 'Record id is required' });
    }

    const { data, error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id)
        .select()
        .maybeSingle();

    if (error) {
        return handleSupabaseError(res, error);
    }

    if (!data) {
        return res.status(404).json({ error: 'Record not found' });
    }

    return res.status(200).json({ data });
}

export function createCrudHandler(tableName) {
    return async function crudHandler(req, res) {
        res.setHeader('Content-Type', 'application/json');

        if (!ALLOWED_METHODS.includes(req.method)) {
            res.setHeader('Allow', ALLOWED_METHODS);
            return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
        }

        try {
            const supabase = getSupabaseClient();

            switch (req.method) {
                case 'GET':
                    return await handleGet(req, res, supabase, tableName);
                case 'POST':
                    return await handlePost(req, res, supabase, tableName);
                case 'PUT':
                    return await handlePut(req, res, supabase, tableName);
                case 'DELETE':
                    return await handleDelete(req, res, supabase, tableName);
                default:
                    res.setHeader('Allow', ALLOWED_METHODS);
                    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
            }
        } catch (err) {
            console.error(`Unhandled error in ${tableName} handler`, err);
            return res.status(500).json({ error: 'Internal server error' });
        }
    };
}
