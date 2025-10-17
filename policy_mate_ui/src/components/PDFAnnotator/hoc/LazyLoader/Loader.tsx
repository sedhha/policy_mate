import React, { Suspense, useState } from 'react';
import {
    DefaultLoader,
    DefaultError,
    type ErrorViewProps,
} from '@/components/PDFAnnotator/hoc/LazyLoader/DefaultLoader';

type ModuleMap = Record<string, unknown>;
type Importer = () => Promise<ModuleMap>;

type Options = {
    /** Named export to use (default: "default") */
    exportName?: string;
    /** Loader UI while fetching */
    loader?: React.ReactNode;
    /** Error UI with retry */
    ErrorView?: React.ComponentType<ErrorViewProps>;
};

/** Narrow unknown to a React component type (best-effort runtime check) */
function isComponentType<P>(val: unknown): val is React.ComponentType<P> {
    return typeof val === 'function';
}

/**
 * withLazyLoader
 * Wrap a dynamic import with Suspense + ErrorBoundary + retry.
 */
export const withLazyLoader = <P extends object>(
    importer: Importer,
    opts: Options = {}
): React.FC<P> => {
    const {
        exportName = 'default',
        loader = <DefaultLoader />,
        ErrorView = DefaultError,
    } = opts;

    const LazyComp = React.lazy(async () => {
        const mod = await importer();

        const fromNamed = (mod as ModuleMap)[exportName];
        const fromDefault = (mod as ModuleMap)['default'];
        const picked = fromNamed ?? fromDefault;

        if (!isComponentType<P>(picked)) {
            throw new Error(`Export "${exportName}" is not a valid React component.`);
        }
        return { default: picked };
    });

    const Wrapped: React.FC<P> = props => {
        const [retryKey, setRetryKey] = useState(0);
        return (
            <ErrorBoundary
                fallbackRender={error => (
                    <ErrorView error={error} onRetry={() => setRetryKey(k => k + 1)} />
                )}
            >
                <Suspense fallback={loader}>
                    <LazyComp key={retryKey} {...props} />
                </Suspense>
            </ErrorBoundary>
        );
    };

    Wrapped.displayName = `withLazyLoader(${exportName})`;
    return Wrapped;
};

/* ---------------- Error Boundary ---------------- */

class ErrorBoundary extends React.Component<
    {
        fallbackRender: (error: unknown) => React.ReactNode;
        children?: React.ReactNode;
    },
    { error: unknown | null }
> {
    constructor(props: {
        fallbackRender: (error: unknown) => React.ReactNode;
        children?: React.ReactNode;
    }) {
        super(props);
        this.state = { error: null };
    }
    static getDerivedStateFromError(error: unknown) {
        return { error };
    }
    // remove unused arg to fix no-unused-vars
    componentDidCatch(): void {
        /* hook for logging */
    }
    render() {
        if (this.state.error) return this.props.fallbackRender(this.state.error);
        return this.props.children;
    }
}
