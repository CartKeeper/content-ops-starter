import bcrypt from 'bcryptjs';
import { jwtVerify } from 'jose';

const SUPABASE_URL = 'https://example.supabase.co';
const SUPABASE_ANON_KEY = 'public-anon-key';
const SUPABASE_JWT_SECRET = 'test-supabase-jwt-secret';

process.env.SUPABASE_URL = SUPABASE_URL;
process.env.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;
process.env.SUPABASE_JWT_SECRET = SUPABASE_JWT_SECRET;

// Remove secrets that should not be present for this verification.
delete process.env.SUPABASE_SERVICE_ROLE_KEY;
delete process.env.SUPABASE_SERVICE_ROLE;
delete process.env.AUTH_JWT_SECRET;
delete process.env.JWT_SECRET;

type MockResponse = {
    statusCode?: number;
    jsonBody?: any;
    headers: Record<string, string | string[]>;
    status: (code: number) => MockResponse;
    json: (body: any) => MockResponse;
    setHeader: (name: string, value: string | string[]) => void;
};

function createResponse(): MockResponse {
    const response: MockResponse = {
        headers: {},
        status(code: number) {
            this.statusCode = code;
            return this;
        },
        json(body: any) {
            this.jsonBody = body;
            return this;
        },
        setHeader(name: string, value: string | string[]) {
            this.headers[name] = value;
        }
    };

    return response;
}

async function main() {
    const [{ supabaseAdmin }, { default: loginHandler }] = await Promise.all([
        import('../src/lib/supabase-admin'),
        import('../src/pages/api/auth/login')
    ]);

    const plainPassword = 'correcthorsebatterystaple';
    const passwordHash = bcrypt.hashSync(plainPassword, 10);

    const mockUserRecord = {
        id: 'user-123',
        email: 'studio@example.com',
        password_hash: passwordHash,
        name: 'Studio Admin',
        roles: ['photographer'],
        role: 'admin',
        permissions: {
            canManageUsers: true,
            canEditSettings: true,
            canViewGalleries: true,
            canManageIntegrations: true,
            canManageCalendar: true
        },
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-06-01T00:00:00.000Z',
        role_title: 'Owner',
        phone: null,
        welcome_message: null,
        avatar_url: null,
        status: 'active',
        email_verified_at: '2024-01-02T00:00:00.000Z',
        calendar_id: null,
        deactivated_at: null,
        last_login_at: null
    };

    const normalizedEmail = mockUserRecord.email.toLowerCase();

    (supabaseAdmin as any).from = (table: string) => {
        if (table !== 'users') {
            throw new Error(`Unexpected table: ${table}`);
        }

        return {
            select() {
                return {
                    eq(column: string, value: unknown) {
                        return {
                            async maybeSingle() {
                                if (column === 'email' && value === normalizedEmail) {
                                    return { data: mockUserRecord, error: null };
                                }

                                return { data: null, error: null };
                            }
                        };
                    }
                };
            },
            update() {
                return {
                    async eq() {
                        return { data: null, error: null };
                    }
                };
            }
        };
    };

    const request = {
        method: 'POST',
        body: {
            email: mockUserRecord.email,
            password: plainPassword
        },
        headers: {}
    } as any;

    const response = createResponse();

    await loginHandler(request, response as any);

    if (response.statusCode !== 200) {
        throw new Error(`Expected 200 response, received ${response.statusCode}`);
    }

    if (!response.jsonBody?.user) {
        throw new Error('Login handler did not return a user payload.');
    }

    const cookieHeader = response.headers['Set-Cookie'];
    if (!cookieHeader || (Array.isArray(cookieHeader) && cookieHeader.length === 0)) {
        throw new Error('Session cookie was not set.');
    }

    const cookieValue = Array.isArray(cookieHeader) ? cookieHeader[0] : cookieHeader;
    const tokenMatch = cookieValue.match(/session=([^;]+)/);
    if (!tokenMatch) {
        throw new Error('Unable to locate session token in cookie header.');
    }

    const token = tokenMatch[1];
    await jwtVerify(token, new TextEncoder().encode(SUPABASE_JWT_SECRET), {
        issuer: 'content-ops-starter'
    });

    console.log('Login succeeded with Supabase anon key and JWT secret fallback.');
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
