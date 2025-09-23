import { Component, ErrorInfo, ReactNode } from 'react';

interface GlobalErrorBoundaryProps {
    children: ReactNode;
}

interface GlobalErrorBoundaryState {
    error: Error | null;
}

class GlobalErrorBoundary extends Component<GlobalErrorBoundaryProps, GlobalErrorBoundaryState> {
    state: GlobalErrorBoundaryState = {
        error: null
    };

    static getDerivedStateFromError(error: Error): GlobalErrorBoundaryState {
        return { error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        if (process.env.NODE_ENV !== 'production') {
            console.error('Unhandled application error', error, errorInfo);
        }
    }

    private handleReset = () => {
        this.setState({ error: null });
        if (typeof window !== 'undefined') {
            window.location.reload();
        }
    };

    render(): ReactNode {
        const { error } = this.state;

        if (error) {
            return (
                <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
                    <div className="space-y-2">
                        <h1 className="text-2xl font-semibold">Something went wrong</h1>
                        <p className="text-sm text-zinc-400">{error.message || 'An unexpected error occurred.'}</p>
                    </div>
                    {error.stack ? (
                        <pre className="w-full max-w-3xl overflow-auto rounded-lg bg-zinc-900 p-4 text-left text-xs text-zinc-100">
                            <code>{error.stack}</code>
                        </pre>
                    ) : null}
                    <button
                        type="button"
                        onClick={this.handleReset}
                        className="rounded-md bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 transition hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                    >
                        Try again
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default GlobalErrorBoundary;
