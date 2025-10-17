'use client';
export type ErrorViewProps = { error?: unknown; onRetry: () => void };

/* ---------------- Default UI ---------------- */

export const DefaultLoader: React.FC = () => (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-12 h-12 border-4 border-blue-500 border-dashed rounded-full animate-spin" />
    </div>
);

export const DefaultError: React.FC<ErrorViewProps> = ({ error, onRetry }) => {
    const msg = error instanceof Error ? error.message : "Please try again.";
    return (
        <div className="min-h-screen grid place-items-center bg-red-50 px-4">
            <div className="max-w-md w-full bg-white p-6 rounded-xl shadow">
                <h2 className="text-lg font-semibold mb-2">Oops, failed to load this page.</h2>
                <p className="text-sm text-gray-600 mb-4">{msg}</p>
                <button
                    onClick={onRetry}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                >
                    Retry
                </button>
            </div>
        </div>
    );
};
