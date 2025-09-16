import fs from 'fs/promises';
import path from 'path';

type CmsCollection<T> = {
    items?: T[];
};

export async function readCmsCollection<T>(fileName: string): Promise<T[]> {
    const filePath = path.join(process.cwd(), 'content', 'data', fileName);

    try {
        const raw = await fs.readFile(filePath, 'utf-8');
        const parsed = JSON.parse(raw) as CmsCollection<T> | T[];

        if (Array.isArray(parsed)) {
            return parsed as T[];
        }

        if (parsed && typeof parsed === 'object') {
            const items = (parsed as CmsCollection<T>).items;
            if (Array.isArray(items)) {
                return items as T[];
            }
        }
    } catch (error) {
        return [];
    }

    return [];
}

