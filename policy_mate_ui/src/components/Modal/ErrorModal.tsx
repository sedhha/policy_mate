// filePath: policy_mate_ui/src/components/Modal/ErrorModal.tsx
import { ErrorModalProps } from "@/types";
import { AlertCircle } from "lucide-react";

export const ErrorModal = ({ isOpen, title, message, onClose }: ErrorModalProps) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <AlertCircle className="w-6 h-6 text-red-600" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
                        <p className="text-gray-600 text-sm leading-relaxed">{message}</p>
                    </div>
                </div>
                <div className="mt-6 flex justify-end">
                    <button
                        onClick={onClose}
                        className="cursor-pointer px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg"
                    >
                        Got it
                    </button>
                </div>
            </div>
        </div>
    );
};

