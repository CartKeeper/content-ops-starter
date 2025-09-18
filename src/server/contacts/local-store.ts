import fs from 'fs/promises';
import path from 'path';

import type { ContactRecord } from '../../types/contact';

const DATA_DIRECTORY = path.join(process.cwd(), 'content', 'data');
const CONTACTS_FILE_NAME = 'crm-contacts.json';

export const CONTACTS_DATA_FILE_PATH = path.join(DATA_DIRECTORY, CONTACTS_FILE_NAME);

function isRecordArray(value: unknown): value is ContactRecord[] {
    if (!Array.isArray(value)) {
        return false;
    }

    return value.every((entry) => entry && typeof entry === 'object');
}

export async function readContactsFromDisk(): Promise<ContactRecord[]> {
    try {
        const raw = await fs.readFile(CONTACTS_DATA_FILE_PATH, 'utf-8');
        const parsed = JSON.parse(raw) as { items?: ContactRecord[] } | ContactRecord[];

        if (isRecordArray(parsed)) {
            return parsed;
        }

        if (parsed && isRecordArray(parsed.items)) {
            return parsed.items;
        }
    } catch (error) {
        // If the file hasn't been created yet we return an empty collection.
    }

    return [];
}

export async function writeContactsToDisk(records: ContactRecord[]): Promise<void> {
    await fs.mkdir(DATA_DIRECTORY, { recursive: true });
    const payload = {
        type: 'CrmContacts',
        items: records
    } satisfies { type: string; items: ContactRecord[] };

    const serialized = `${JSON.stringify(payload, null, 4)}\n`;
    await fs.writeFile(CONTACTS_DATA_FILE_PATH, serialized, 'utf-8');
}
