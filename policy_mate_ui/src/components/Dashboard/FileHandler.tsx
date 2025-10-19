// filePath: policy_mate_ui/src/components/Dashboard/FileHandler.tsx
'use client';

import { MAX_FILE_SIZE } from '@/constants';
import { AlertCircle, CheckCircle, Edit3, FileText, Upload, X, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { uploadFile } from '@/utils/apis/upload';
import { ErrorModal } from "@/components/Modal/ErrorModal";
import { SuccessModal } from "@/components/Modal/SuccessModal";

export const FileHandler = () => {
    const [fileName, setFileName] = useState<string | null>(null);
    const [fileContent, setFileContent] = useState<File | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<string>('');
    const [errorModal, setErrorModal] = useState<{ isOpen: boolean; title: string; message: string }>({
        isOpen: false,
        title: '',
        message: ''
    });
    const [successModal, setSuccessModal] = useState<{ isOpen: boolean; fileName: string; isDuplicate: boolean }>({
        isOpen: false,
        fileName: '',
        isDuplicate: false
    });

    const showError = (title: string, message: string) => {
        setErrorModal({ isOpen: true, title, message });
    };

    const closeError = () => {
        setErrorModal({ isOpen: false, title: '', message: '' });
    };

    const showSuccess = (fileName: string, isDuplicate: boolean) => {
        setSuccessModal({ isOpen: true, fileName, isDuplicate });
    };

    const closeSuccess = () => {
        setSuccessModal({ isOpen: false, fileName: '', isDuplicate: false });
        clearFile();
    };

    const handleFileChange = (file: File | null) => {
        if (!file) {
            setFileName(null);
            setFileContent(null);
            return;
        }

        if (file.type !== 'application/pdf') {
            showError(
                'Invalid File Type',
                'Please upload a PDF file only. Other file formats are not supported at this time.'
            );
            return;
        }

        if (file.size > MAX_FILE_SIZE) {
            showError(
                'File Too Large',
                `The file size must be less than 5MB. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB.`
            );
            return;
        }

        setFileName(file.name || 'unknown.pdf');
        setFileContent(file);
        setIsEditing(false);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        handleFileChange(file || null);
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileChange(e.dataTransfer.files[0]);
        }
    };

    const isFileNameValid = fileName?.match(/^[a-zA-Z0-9-_\.]+$/) !== null;

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    };

    const clearFile = () => {
        setFileName(null);
        setFileContent(null);
        setIsEditing(false);
        setIsUploading(false);
        setUploadProgress('');
    };

    const handleUpload = async () => {
        if (!fileContent || !fileName || !isFileNameValid) return;

        setIsUploading(true);
        setUploadProgress('Starting upload...');

        try {
            // Create a new File with the updated name if it was changed
            const fileToUpload = fileName !== fileContent.name
                ? new File([fileContent], fileName, { type: fileContent.type })
                : fileContent;

            const result = await uploadFile(
                fileToUpload,
                'custom',
                (step, progress) => {
                    setUploadProgress(`${step} (${progress}%)`);
                }
            );

            if (result.success) {
                showSuccess(result.fileName, result.isDuplicate);
            } else {
                showError('Upload Failed', result.error || 'An unknown error occurred during upload');
            }
        } catch (error) {
            showError(
                'Upload Failed',
                error instanceof Error ? error.message : 'An unexpected error occurred'
            );
        } finally {
            setIsUploading(false);
            setUploadProgress('');
        }
    };

    return (
        <>
            <ErrorModal
                isOpen={errorModal.isOpen}
                title={errorModal.title}
                message={errorModal.message}
                onClose={closeError}
            />

            <SuccessModal
                isOpen={successModal.isOpen}
                fileName={successModal.fileName}
                isDuplicate={successModal.isDuplicate}
                onClose={closeSuccess}
            />

            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
                        <Upload className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-800">Upload New</h3>
                        <p className="text-sm text-slate-600">PDF files, max 5MB</p>
                    </div>
                </div>

                {!fileContent ? (
                    <div
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                        className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-200 ${dragActive
                                ? 'border-blue-500 bg-blue-50/50'
                                : 'border-slate-300 hover:border-blue-400 hover:bg-blue-50/30'
                            }`}
                    >
                        <div className="flex flex-col items-center gap-4">
                            <div className={`w-16 h-16 bg-gradient-to-br rounded-2xl flex items-center justify-center transition-all ${dragActive
                                    ? 'from-blue-500 to-indigo-600 scale-110'
                                    : 'from-blue-100 to-indigo-100'
                                }`}>
                                <Upload className={`w-8 h-8 ${dragActive ? 'text-white' : 'text-blue-600'}`} />
                            </div>
                            <div>
                                <p className="text-slate-700 font-semibold mb-2">
                                    Drag and drop your PDF here
                                </p>
                                <p className="text-sm text-slate-500">or click to browse</p>
                            </div>
                            <label className="cursor-pointer">
                                <input
                                    type="file"
                                    accept=".pdf,application/pdf"
                                    onChange={handleInputChange}
                                    className="hidden"
                                />
                                <span className="inline-block px-6 py-3 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl">
                                    Choose File
                                </span>
                            </label>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="border-2 border-slate-200 rounded-xl p-5 bg-gradient-to-br from-blue-50 to-indigo-50">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3 flex-1">
                                    <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-sm border border-red-200">
                                        <FileText className="w-6 h-6 text-red-600" />
                                    </div>
                                    <div className="flex-1">
                                        {isEditing ? (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={fileName || ''}
                                                    onChange={(e) => setFileName(e.target.value)}
                                                    className={`flex-1 px-3 py-2 border rounded-lg outline-none focus:ring-2 ${isFileNameValid
                                                            ? 'border-slate-300 focus:ring-blue-500 focus:border-transparent'
                                                            : 'border-red-300 focus:ring-red-500'
                                                        }`}
                                                    placeholder="Enter file name"
                                                />
                                                <button
                                                    onClick={() => setIsEditing(false)}
                                                    className="p-2 hover:bg-white rounded-lg transition-colors"
                                                >
                                                    <X className="w-4 h-4 text-slate-600" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-semibold text-slate-800 break-all">{fileName}</h3>
                                                <button
                                                    onClick={() => setIsEditing(true)}
                                                    className="p-1 hover:bg-white cursor-pointer rounded transition-colors flex-shrink-0"
                                                    title="Rename file"
                                                >
                                                    <Edit3 className="w-4 h-4 text-slate-600" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={clearFile}
                                    className="p-2 hover:bg-white rounded-lg transition-colors flex-shrink-0"
                                    title="Remove file"
                                >
                                    <X className="w-5 h-5 text-slate-600" />
                                </button>
                            </div>

                            <div className="bg-white rounded-lg p-4 space-y-3 border border-slate-200">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-600">File Size:</span>
                                    <span className="font-medium text-slate-800">{formatFileSize(fileContent.size)}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-600">File Type:</span>
                                    <span className="font-medium text-slate-800">PDF</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-600">File Name Status:</span>
                                    <div className="flex items-center gap-1.5">
                                        {isFileNameValid ? (
                                            <>
                                                <CheckCircle className="w-4 h-4 text-emerald-600" />
                                                <span className="font-medium text-emerald-700">Valid</span>
                                            </>
                                        ) : (
                                            <>
                                                <AlertCircle className="w-4 h-4 text-red-600" />
                                                <span className="font-medium text-red-700">Invalid</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {!isFileNameValid && (
                                <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
                                    <p className="text-sm text-red-700">
                                        <strong>Invalid file name.</strong> Only letters (a-z, A-Z), numbers (0-9), hyphens (-), underscores (_), and dots (.) are allowed.
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={handleUpload}
                                disabled={!isFileNameValid || isUploading}
                                className="cursor-pointer flex-1 bg-gradient-to-br from-blue-500 to-indigo-600 text-white py-3 rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isUploading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Uploading...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-5 h-5" />
                                        Upload Document
                                    </>
                                )}
                            </button>
                            <button
                                onClick={clearFile}
                                disabled={isUploading}
                                className="px-6 py-3 cursor-pointer border-2 border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Cancel
                            </button>
                        </div>

                        {isUploading && uploadProgress && (
                            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <p className="text-sm text-blue-700 flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    {uploadProgress}
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Quick Stats */}
                <div className="mt-6 grid grid-cols-2 gap-3">
                    <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4 border border-emerald-200">
                        <div className="text-2xl font-bold text-emerald-700">0</div>
                        <div className="text-xs text-emerald-600 font-medium mt-1">Compliant</div>
                    </div>
                    <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4 border border-amber-200">
                        <div className="text-2xl font-bold text-amber-700">1</div>
                        <div className="text-xs text-amber-600 font-medium mt-1">Pending</div>
                    </div>
                </div>
            </div>
        </>
    );
};