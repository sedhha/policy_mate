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

            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                        <Upload className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Upload New Document</h2>
                        <p className="text-sm text-gray-600">PDF files only, max 5MB</p>
                    </div>
                </div>

                {!fileContent ? (
                    <div
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${dragActive
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                            }`}
                    >
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center">
                                <Upload className="w-8 h-8 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-gray-800 font-medium mb-1">
                                    Drag and drop your PDF here
                                </p>
                                <p className="text-sm text-gray-600">or click to browse</p>
                            </div>
                            <label className="cursor-pointer">
                                <input
                                    type="file"
                                    accept=".pdf,application/pdf"
                                    onChange={handleInputChange}
                                    className="hidden"
                                />
                                <span className="inline-block px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg">
                                    Choose File
                                </span>
                            </label>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="border border-gray-200 rounded-xl p-5 bg-gradient-to-br from-blue-50 to-indigo-50">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3 flex-1">
                                    <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-sm">
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
                                                        ? 'border-gray-300 focus:ring-blue-500 focus:border-transparent'
                                                        : 'border-red-300 focus:ring-red-500'
                                                        }`}
                                                    placeholder="Enter file name"
                                                />
                                                <button
                                                    onClick={() => setIsEditing(false)}
                                                    className="p-2 hover:bg-white rounded-lg transition-colors"
                                                >
                                                    <X className="w-4 h-4 text-gray-600" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-semibold text-gray-800 break-all">{fileName}</h3>
                                                <button
                                                    onClick={() => setIsEditing(true)}
                                                    className="p-1 hover:bg-white cursor-pointer rounded transition-colors flex-shrink-0"
                                                    title="Rename file"
                                                >
                                                    <Edit3 className="w-4 h-4 text-gray-600" />
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
                                    <X className="w-5 h-5 text-gray-600" />
                                </button>
                            </div>

                            <div className="bg-white rounded-lg p-4 space-y-3">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-600">File Size:</span>
                                    <span className="font-medium text-gray-800">{formatFileSize(fileContent.size)}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-600">File Type:</span>
                                    <span className="font-medium text-gray-800">PDF</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-600">File Name Status:</span>
                                    <div className="flex items-center gap-1.5">
                                        {isFileNameValid ? (
                                            <>
                                                <CheckCircle className="w-4 h-4 text-green-600" />
                                                <span className="font-medium text-green-700">Valid</span>
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
                                className="cursor-pointer flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                                className="px-6 py-3 cursor-pointer border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
            </div>
        </>
    );
};