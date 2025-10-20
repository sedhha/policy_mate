// components/PDFAnnotator/BookmarkPopover.tsx
import React from 'react';
import type {
    SimpleAnnotation,
    BookmarkType,
    BookmarkTypeDef,
    BookmarkPopoverProps,
} from '@/components/PDFAnnotator/types';

// Central config (exportable if needed elsewhere)
const BOOKMARK_TYPES: BookmarkTypeDef[] = [
    {
        key: 'review-later',
        icon: '⏱️',
        label: 'Review Later',
        description: 'Flag for future review',
        color: 'blue',
        selectedClasses: 'border-blue-400 bg-blue-50 shadow-lg',
    },
    {
        key: 'verify',
        icon: '✅',
        label: 'Verify',
        description: 'Needs verification',
        color: 'green',
        selectedClasses: 'border-green-400 bg-green-50 shadow-lg',
    },
    {
        key: 'important',
        icon: '⭐',
        label: 'Important',
        description: 'Mark as important',
        color: 'yellow',
        selectedClasses: 'border-yellow-400 bg-yellow-50 shadow-lg',
    },
    {
        key: 'question',
        icon: '❓',
        label: 'Question',
        description: 'Has questions',
        color: 'purple',
        selectedClasses: 'border-purple-400 bg-purple-50 shadow-lg',
    },
];

const BookmarkTypeButton: React.FC<{
    type: BookmarkTypeDef;
    selected: boolean;
    onSelect: () => void;
}> = ({ type, selected, onSelect }) => {
    const base =
        'p-3 rounded-xl border-2 text-left transition-all duration-200 cursor-pointer hover:shadow-md';
    const selectedClasses = selected
        ? type.selectedClasses
        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50';
    return (
        <button
            key={type.key}
            className={`${base} ${selectedClasses}`}
            onClick={onSelect}
            type="button"
        >
            <div className="flex items-center space-x-2 mb-1">
                <span className="text-lg">{type.icon}</span>
                <span className="text-sm font-medium text-gray-800">{type.label}</span>
            </div>
            <p className="text-xs text-gray-600">{type.description}</p>
        </button>
    );
};

const Header: React.FC<{
    ann: SimpleAnnotation;
    onMinimize: () => void;
    onClose: () => void;
}> = ({ ann, onMinimize, onClose }) => (
    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white">
        <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-orange-200 rounded-full animate-pulse" />
            <div className="font-semibold text-sm">Bookmark Manager</div>
            <span className="text-xs text-orange-100">
                #{(ann.session_id || '019a016c-3ba3-7ad5-b1c4-35d53b8046c5').slice(-6)}
            </span>
        </div>
        <div className="flex items-center space-x-1">
            <button
                className="text-white hover:text-gray-200 transition-colors p-1 rounded-full hover:bg-white/10 cursor-pointer"
                onClick={onMinimize}
                title="Minimize"
                type="button"
            >
                <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M20 12H4"
                    />
                </svg>
            </button>
            <button
                className="text-white hover:text-gray-200 transition-colors p-1 rounded-full hover:bg-white/10 cursor-pointer"
                onClick={onClose}
                title="Close"
                type="button"
            >
                <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                    />
                </svg>
            </button>
        </div>
    </div>
);

export const BookmarkPopover: React.FC<BookmarkPopoverProps> = ({
    ann,
    onClose,
    updateAnnotation,
    hasCommentPanelOpen = false,
    onBookmarkTypeChange,
    onNoteCommit,
}) => {
    // ---- local state + baselines ----
    const [draft, setDraft] = React.useState(ann.bookmarkNote ?? '');
    const [selectedType, setSelectedType] = React.useState<BookmarkType | undefined>(
        ann.bookmarkType
    );
    const [isMinimized, setIsMinimized] = React.useState(false);

    // baselines that define "saved" values (so Save can disable afterwards)
    const [lastSavedNote, setLastSavedNote] = React.useState(ann.bookmarkNote ?? '');
    const [lastSavedType, setLastSavedType] = React.useState<BookmarkType | undefined>(
        ann.bookmarkType
    );

    // if user opens a different annotation, sync local state
    React.useEffect(() => {
        setDraft(ann.bookmarkNote ?? '');
        setSelectedType(ann.bookmarkType);
        setLastSavedNote(ann.bookmarkNote ?? '');
        setLastSavedType(ann.bookmarkType);
    }, [ann.id]); // eslint-disable-line react-hooks/exhaustive-deps

    const trimmed = draft.trim();
    const isDirty = trimmed !== (lastSavedNote ?? '') || selectedType !== lastSavedType;

    const onModalClose = () => {
        // optional: auto-save on close, or keep it strict; here we keep strict
        onClose();
    };

    const handleSelectType = React.useCallback(
        (typeKey: string) => {
            const t = typeKey as BookmarkType;
            setSelectedType(t);
        },
        []
    );

    const handleSave = () => {
        updateAnnotation(ann.id, {
            bookmarkType: selectedType,
            bookmarkNote: trimmed,
        });

        // notify hooks
        if (onBookmarkTypeChange && selectedType !== lastSavedType) {
            onBookmarkTypeChange(ann.id, selectedType ?? '');
        }
        if (onNoteCommit && trimmed !== (lastSavedNote ?? '')) {
            onNoteCommit(ann.id, trimmed);
        }

        // reset baselines so button disables
        setLastSavedType(selectedType);
        setLastSavedNote(trimmed);
    };

    if (isMinimized) {
        return (
            <div
                className={`fixed bottom-4 z-[55] bg-white shadow-lg rounded-full p-3 border border-gray-200 cursor-pointer hover:shadow-xl transition-shadow ${hasCommentPanelOpen ? 'right-[470px]' : 'right-4'
                    }`}
                onClick={() => setIsMinimized(false)}
            >
                <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
                    <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                </div>
            </div>
        );
    }

    return (
        <div
            className={`fixed bottom-4 z-[55] bg-white shadow-2xl rounded-2xl overflow-hidden w-[400px] flex flex-col border border-gray-200 ${hasCommentPanelOpen ? 'right-[470px]' : 'right-4'
                }`}
            onClick={(e) => e.stopPropagation()}
            onMouseDownCapture={(e) => e.stopPropagation()}
        >
            <Header ann={ann} onMinimize={() => setIsMinimized(true)} onClose={onModalClose} />

            {/* Content */}
            <div className="p-4 space-y-4">
                {/* Bookmark Type Selection */}
                <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Choose bookmark type:</h3>
                    <div className="grid grid-cols-2 gap-2">
                        {BOOKMARK_TYPES.map((type) => (
                            <BookmarkTypeButton
                                key={type.key}
                                type={type}
                                selected={selectedType === type.key}
                                onSelect={() => handleSelectType(type.key)}
                            />
                        ))}
                    </div>
                </div>

                {/* Note Section */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Add a note (optional):
                    </label>
                    <div className="relative">
                        <textarea
                            placeholder="Write your bookmark note here..."
                            className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:border-amber-400 focus:ring-2 focus:ring-amber-100 resize-none scrollbar-none cursor-text transition-all"
                            rows={3}
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                        />
                        <div className="text-xs text-gray-400 mt-1">• {draft.length} characters</div>
                    </div>

                    {/* Save row */}
                    <div className="mt-3 flex items-center justify-end">
                        <button
                            type="button"
                            disabled={!isDirty}
                            onClick={handleSave}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 ${isDirty
                                ? 'bg-amber-600 text-white hover:bg-amber-700 cursor-pointer'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                }`}
                            title={isDirty ? 'Save bookmark changes' : 'No changes to save'}
                        >
                            💾 Save
                        </button>
                    </div>
                </div>

                {/* Current Note Display */}
                {lastSavedNote && (
                    <div className="bg-gray-50 rounded-lg p-3">
                        <div className="text-xs font-medium text-gray-600 mb-1">Current Note:</div>
                        <div className="text-sm text-gray-800 cursor-text">
                            {lastSavedNote}
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 bg-white p-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1">
                        <div className={`w-2 h-2 rounded-full ${ann.resolved ? 'bg-green-500' : 'bg-amber-500'}`}></div>
                        <span className={`text-xs font-medium ${ann.resolved ? 'text-green-600' : 'text-amber-600'}`}>
                            {ann.resolved ? 'Bookmarked & Resolved' : 'Bookmarked'}
                        </span>
                    </div>

                    <button
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer ${ann.resolved ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-green-600 text-white hover:bg-green-700'
                            }`}
                        onClick={() =>
                            updateAnnotation(ann.id, {
                                resolved: !ann.resolved,
                                // keep latest draft in store when toggling
                                bookmarkNote: trimmed,
                                bookmarkType: selectedType,
                            })
                        }
                    >
                        {ann.resolved ? '↻ Reopen' : '✓ Mark Resolved'}
                    </button>
                </div>
            </div>
        </div>
    );
};
