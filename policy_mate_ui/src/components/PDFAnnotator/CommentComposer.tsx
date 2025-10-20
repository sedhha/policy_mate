// components/PDFAnnotator/CommentComposer.tsx
import React from 'react';

export const CommentComposer: React.FC<{
    onSubmit: (text: string) => void;
    placeholder?: string;
    disabled?: boolean;
}> = ({ onSubmit, placeholder = "Type your message... (Press Enter to send, Shift+Enter for new line)", disabled = false }) => {
    const [value, setValue] = React.useState('');
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const textAreaRef = React.useRef<HTMLTextAreaElement>(null);

    const adjustTextAreaHeight = () => {
        const textArea = textAreaRef.current;
        if (textArea) {
            textArea.style.height = 'auto';
            textArea.style.height = Math.min(textArea.scrollHeight, 120) + 'px';
        }
    };

    React.useEffect(() => {
        adjustTextAreaHeight();
    }, [value]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!value.trim() || isSubmitting || disabled) return;

        setIsSubmitting(true);
        await onSubmit(value.trim());
        setValue('');
        setIsSubmitting(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    const isDisabled = disabled || isSubmitting;

    return (
        <form onSubmit={handleSubmit} className="relative">
            <div className={`relative flex items-center space-x-3 p-3 bg-gray-50 rounded-2xl border border-gray-200 focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100 transition-all ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <textarea
                    ref={textAreaRef}
                    className="flex-1 resize-none bg-transparent border-none outline-none text-sm placeholder-gray-500 min-h-[20px] max-h-[120px] py-1 overflow-y-auto scrollbar-none leading-snug"
                    placeholder={placeholder}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={1}
                    disabled={isDisabled}
                />
                <button
                    type="submit"
                    disabled={!value.trim() || isDisabled}
                    className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed cursor-pointer transition-all duration-200 hover:shadow-lg hover:shadow-blue-200"
                >
                    {isSubmitting ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                    )}
                </button>
            </div>
            <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                <span>Compliance Copilot can make mistakes.</span>
                <span>{value.length} characters</span>
            </div>
        </form>
    );
};
