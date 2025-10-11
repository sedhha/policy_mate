import { SuccessModalProps } from "@/types";
import { CheckCircle } from "lucide-react";

export const SuccessModal = ({ isOpen, fileName, isDuplicate, onClose }: SuccessModalProps) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">
                            {isDuplicate ? 'File Already Exists' : 'Upload Successful'}
                        </h3>
                        <p className="text-gray-600 text-sm leading-relaxed">
                            {isDuplicate
                                ? `"${fileName}" already exists in your documents. You've been linked to the existing file.`
                                : `"${fileName}" has been uploaded successfully and is ready to use.`
                            }
                        </p>
                    </div>
                </div>
                <div className="mt-6 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-medium hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-md hover:shadow-lg"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};