function resolveDeploymentUrl(): string | null {
    const explicit = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.PUBLIC_APP_URL;
    if (explicit && explicit.trim()) {
        return explicit.trim();
    }

    const vercelUrl = process.env.VERCEL_URL;
    if (vercelUrl && vercelUrl.trim()) {
        const normalized = vercelUrl.startsWith('http') ? vercelUrl : `https://${vercelUrl}`;
        return normalized;
    }

    const netlifyUrl = process.env.URL || process.env.DEPLOY_PRIME_URL;
    if (netlifyUrl && netlifyUrl.trim()) {
        return netlifyUrl.trim();
    }

    return null;
}

export function getAppBaseUrl(): string {
    return resolveDeploymentUrl() ?? 'http://localhost:3000';
}
