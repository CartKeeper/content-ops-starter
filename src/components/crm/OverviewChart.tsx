import * as React from 'react';
import classNames from 'classnames';
import {
    Bar,
    CartesianGrid,
    ComposedChart,
    Line,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts';
import type { TooltipContentProps } from 'recharts';
import type { Payload, ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent';

export type Timeframe = 'weekly' | 'monthly' | 'yearly';

export type ChartPoint = {
    label: string;
    shoots: number;
    revenue: number;
};

type OverviewChartProps = {
    data: Record<Timeframe, ChartPoint[]>;
};

const timeframeOptions: Array<{ id: Timeframe; label: string }> = [
    { id: 'weekly', label: 'This week' },
    { id: 'monthly', label: 'This month' },
    { id: 'yearly', label: 'This year' }
];

const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
});

const compactCurrencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1
});

const formatCurrency = (value: number) => currencyFormatter.format(value);
const formatCurrencyCompact = (value: number) => compactCurrencyFormatter.format(value);

type ChartDataKey = 'shoots' | 'revenue';
type ChartTooltipProps = TooltipContentProps<ValueType, NameType>;
type ChartTooltipPayload = Payload<ValueType, NameType> & { dataKey?: ChartDataKey };

function findChartEntry(entries: ChartTooltipPayload[], key: ChartDataKey) {
    return entries.find((entry) => entry.dataKey === key);
}

function toNumericValue(value: ValueType | undefined): number {
    if (typeof value === 'number') {
        return value;
    }
    if (Array.isArray(value)) {
        const [first] = value;
        if (typeof first === 'number') {
            return first;
        }
        const parsedArrayValue = Number(first ?? 0);
        return Number.isFinite(parsedArrayValue) ? parsedArrayValue : 0;
    }
    if (value === undefined || value === null) {
        return 0;
    }
    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
    if (!active || !payload || payload.length === 0) {
        return null;
    }

    const entries = payload as ChartTooltipPayload[];
    const shootsEntry = findChartEntry(entries, 'shoots');
    const revenueEntry = findChartEntry(entries, 'revenue');

    return (
        <div className="card shadow-sm">
            <div className="card-body p-3">
                <div className="text-uppercase text-secondary small fw-semibold">{label}</div>
                <div className="mt-2">
                    {shootsEntry && (
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <span className="d-flex align-items-center gap-2">
                                <span className="badge bg-primary" aria-hidden /> Shoots
                            </span>
                            <span className="fw-semibold">{toNumericValue(shootsEntry.value)}</span>
                        </div>
                    )}
                    {revenueEntry && (
                        <div className="d-flex justify-content-between align-items-center">
                            <span className="d-flex align-items-center gap-2">
                                <span className="badge bg-warning" aria-hidden /> Revenue
                            </span>
                            <span className="fw-semibold">{formatCurrency(toNumericValue(revenueEntry.value))}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

const renderChartTooltip = (props: ChartTooltipProps) => <ChartTooltip {...props} />;

export function OverviewChart({ data }: OverviewChartProps) {
    const [timeframe, setTimeframe] = React.useState<Timeframe>('monthly');
    const [isMounted, setIsMounted] = React.useState(false);

    React.useEffect(() => {
        setIsMounted(true);
    }, []);

    const activeData = data[timeframe] ?? [];
    const hasData = activeData.length > 0;
    const totalShoots = activeData.reduce((total, point) => total + point.shoots, 0);
    const totalRevenue = activeData.reduce((total, point) => total + point.revenue, 0);

    return (
        <div className="card card-stacked h-100">
            <div className="card-body">
                <div className="d-flex flex-wrap align-items-start justify-content-between gap-3">
                    <div>
                        <h2 className="card-title mb-1">Studio overview</h2>
                        <div className="text-secondary">
                            Shoots scheduled and revenue performance across time horizons.
                        </div>
                    </div>
                    <div className="btn-group btn-group-sm" role="group" aria-label="Select timeframe">
                        {timeframeOptions.map((option) => {
                            const isActive = option.id === timeframe;
                            return (
                                <button
                                    key={option.id}
                                    type="button"
                                    onClick={() => setTimeframe(option.id)}
                                    aria-pressed={isActive}
                                    className={classNames('btn', isActive ? 'btn-primary' : 'btn-outline-secondary')}
                                >
                                    {option.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
                <div className="row mt-4 g-4 align-items-end">
                    <div className="col-md-3">
                        <div className="text-uppercase text-secondary small fw-semibold">Total shoots</div>
                        <div className="h3 mb-3">{totalShoots}</div>
                        <div className="text-uppercase text-secondary small fw-semibold">Revenue</div>
                        <div className="h3 mb-0">{formatCurrency(totalRevenue)}</div>
                    </div>
                    <div className="col-md-9">
                        <div style={{ height: 280 }}>
                            <ResponsiveContainer>
                                <ComposedChart data={activeData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.3)" />
                                    <XAxis dataKey="label" stroke="currentColor" />
                                    <YAxis yAxisId="left" allowDecimals={false} stroke="currentColor" />
                                    <YAxis
                                        yAxisId="right"
                                        orientation="right"
                                        tickFormatter={(value: number) => formatCurrencyCompact(value)}
                                        stroke="currentColor"
                                    />
                                    <Tooltip content={renderChartTooltip} wrapperStyle={{ outline: 'none' }} />
                                    <Bar yAxisId="left" dataKey="shoots" fill="var(--tblr-primary)" radius={[4, 4, 0, 0]} />
                                    <Line
                                        yAxisId="right"
                                        type="monotone"
                                        dataKey="revenue"
                                        stroke="var(--tblr-warning)"
                                        strokeWidth={3}
                                        dot={false}
                                    />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                        {!hasData && isMounted ? (
                            <div className="alert alert-secondary mt-3" role="status">
                                No data available for this timeframe.
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default OverviewChart;
