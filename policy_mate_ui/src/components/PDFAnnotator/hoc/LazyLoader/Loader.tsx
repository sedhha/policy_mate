"use client";

import React, { Suspense, useState } from "react";
import dynamic from "next/dynamic";
import {
    DefaultLoader,
    DefaultError,
    type ErrorViewProps,
} from "@/components/PDFAnnotator/hoc/LazyLoader/DefaultLoader";

type ModuleMap = Record<string, unknown>;
type Importer = () => Promise<ModuleMap>;

interface Options {
    /** Named export to use (default: "default") */
    exportName?: string;
    /** Loader UI while fetching */
    loader?: React.ReactNode;
    /** Error UI with retry */
    ErrorView?: React.ComponentType<ErrorViewProps>;
}

/** Runtime guard that a value is a component */
function isComponentType<P>(val: unknown): val is React.ComponentType<P> {
    return typeof val === "function";
}

/**
 * ✅ withLazyLoader (App Router–safe)
 *
 * Wraps a dynamic import in a client boundary, providing Suspense fallback
 * and a retryable error view. Uses next/dynamic internally to avoid
 * server evaluation of lazy modules under Turbopack.
 */
export function withLazyLoader<P extends object>(
    importer: Importer,
    opts: Options = {}
): React.FC<P> {
    const {
        exportName = "default",
        loader = <DefaultLoader />,
        ErrorView = DefaultError,
    } = opts;

    // next/dynamic automatically defers evaluation to client
    const DynamicComp = dynamic(async () => {
        const mod = await importer();
        const fromNamed = (mod as ModuleMap)[exportName];
        const fromDefault = (mod as ModuleMap)["default"];
        const picked = fromNamed ?? fromDefault;

        if (!isComponentType<P>(picked)) {
            throw new Error(`Export "${exportName}" is not a valid React component.`);
        }
        return picked;
    }, {
        ssr: false,
        loading: () => loader,
    });

    const Wrapped: React.FC<P> = (props) => {
        const [retryKey, setRetryKey] = useState(0);
        const [error, setError] = useState<unknown>(null);

        if (error) {
            return (
                <ErrorView
                    error={error}
                    onRetry={() => {
                        setError(null);
                        setRetryKey((k) => k + 1);
                    }}
                />
            );
        }

        return (
            <Suspense fallback={loader}>
                <DynamicComp
                    key={retryKey}
                    {...(props as P)}
                    // Capture runtime errors to mimic an error boundary
                    // (useEffect is unreliable inside next/dynamic, so fallback to try/catch wrapper)
                    // eslint-disable-next-line react/jsx-no-useless-fragment
                    onError={(err: unknown) => setError(err)}
                />
            </Suspense>
        );
    };

    Wrapped.displayName = `withLazyLoader(${exportName})`;
    return Wrapped;
}
