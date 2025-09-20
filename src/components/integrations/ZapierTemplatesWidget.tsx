import * as React from 'react';

type ZapierTemplatesWidgetProps = {
    /**
     * Zapier app slugs to highlight in the embed.
     * Defaults can also be overridden via NEXT_PUBLIC_ZAPIER_WIDGET_APPS.
     */
    apps?: string[];
    /**
     * Zapier category slugs to filter template results.
     */
    categories?: string[];
    /**
     * Explicit Zap template IDs to surface.
     */
    templateIds?: string[];
    /**
     * Limit the number of templates rendered by the widget.
     */
    limit?: number;
    className?: string;
};

const ZAPIER_WIDGET_SRC = 'https://zapier.com/apps/embed/widget.js';
const DEFAULT_APPS = ['dropbox', 'slack', 'notion'];

const ENV_APPS = (process.env.NEXT_PUBLIC_ZAPIER_WIDGET_APPS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

const ENV_LIMIT = Number.parseInt(process.env.NEXT_PUBLIC_ZAPIER_WIDGET_LIMIT ?? '', 10);
const DEFAULT_LIMIT = Number.isFinite(ENV_LIMIT) && ENV_LIMIT > 0 ? ENV_LIMIT : 6;

function sanitizeValues(values: string[] | undefined): string[] {
    if (!values) {
        return [];
    }
    return values
        .map((value) => value.trim())
        .filter((value, index, array) => value.length > 0 && array.indexOf(value) === index);
}

function buildParams(
    containerId: string,
    apps: string[],
    categories: string[],
    templateIds: string[],
    limit: number
): string {
    const params = new URLSearchParams();
    params.set('html_id', containerId);
    if (apps.length > 0) {
        params.set('apps', apps.join(','));
    }
    if (categories.length > 0) {
        params.set('categories', categories.join(','));
    }
    if (templateIds.length > 0) {
        params.set('ids', templateIds.join(','));
    }
    if (Number.isFinite(limit) && limit > 0) {
        params.set('limit', String(limit));
    }
    return params.toString();
}

export function ZapierTemplatesWidget({
    apps,
    categories: categoriesProp,
    templateIds: templateIdsProp,
    limit = DEFAULT_LIMIT,
    className
}: ZapierTemplatesWidgetProps) {
    const baseId = React.useId();
    const containerId = React.useMemo(() => {
        const normalized = baseId.replace(/[^a-zA-Z0-9_-]/g, '');
        return normalized ? `zapier-widget-${normalized}` : 'zapier-widget';
    }, [baseId]);
    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const scriptRef = React.useRef<HTMLScriptElement | null>(null);

    const resolvedApps = React.useMemo(() => {
        const provided = sanitizeValues(apps);
        if (provided.length > 0) {
            return provided;
        }
        if (ENV_APPS.length > 0) {
            return ENV_APPS;
        }
        return DEFAULT_APPS;
    }, [apps]);

    const resolvedCategories = React.useMemo(() => sanitizeValues(categoriesProp), [categoriesProp]);
    const resolvedTemplateIds = React.useMemo(() => sanitizeValues(templateIdsProp), [templateIdsProp]);

    const [isWidgetReady, setIsWidgetReady] = React.useState(false);
    const [loadError, setLoadError] = React.useState<string | null>(null);

    const hasConfiguration =
        resolvedApps.length > 0 || resolvedCategories.length > 0 || resolvedTemplateIds.length > 0;

    React.useEffect(() => {
        if (!hasConfiguration || !containerRef.current) {
            return undefined;
        }

        const container = containerRef.current;
        setLoadError(null);
        setIsWidgetReady(false);

        const params = buildParams(containerId, resolvedApps, resolvedCategories, resolvedTemplateIds, limit);
        const script = document.createElement('script');
        script.src = `${ZAPIER_WIDGET_SRC}?${params}`;
        script.async = true;
        script.dataset.zapierContainer = containerId;

        const handleError = () => setLoadError('Unable to load Zapier templates. Confirm the widget configuration.');
        script.addEventListener('error', handleError);

        const observer = new MutationObserver(() => {
            if (container.querySelector('zapier-zap-templates')) {
                setIsWidgetReady(true);
                observer.disconnect();
            }
        });

        observer.observe(container, { childList: true });

        scriptRef.current = script;
        container.innerHTML = '';
        container.appendChild(script);

        return () => {
            observer.disconnect();
            script.removeEventListener('error', handleError);
            if (script.parentNode) {
                script.parentNode.removeChild(script);
            }
            container.innerHTML = '';
            scriptRef.current = null;
        };
    }, [
        containerId,
        hasConfiguration,
        limit,
        resolvedApps,
        resolvedCategories,
        resolvedTemplateIds
    ]);

    if (!hasConfiguration) {
        return (
            <div
                className={className}
                aria-live="polite"
            >
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-6 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
                    Provide Zapier app slugs via NEXT_PUBLIC_ZAPIER_WIDGET_APPS or the <code>apps</code> prop to render the
                    automation gallery.
                </div>
            </div>
        );
    }

    return (
        <div className={className} aria-live="polite">
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-900/40">
                {!isWidgetReady && !loadError ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400">Loading curated Zapier automations…</p>
                ) : null}
                <div id={containerId} ref={containerRef} className="min-h-[240px]" />
            </div>
            {loadError ? <p className="mt-3 text-sm text-rose-500 dark:text-rose-300">{loadError}</p> : null}
        </div>
    );
}

export default ZapierTemplatesWidget;
