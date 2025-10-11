'use client';
import { useState } from 'react';
import { FileText, Upload, Eye, Trash2, Info, CheckCircle, AlertCircle, Edit3, X, Download } from 'lucide-react';


const myFiles = [
    { id: 1, name: 'Document1.pdf', size: '2MB', uploadDate: '2024-10-05' },
    { id: 2, name: 'Document2.pdf', size: '2MB', uploadDate: '2024-10-07' },
    { id: 3, name: 'Document3.pdf', size: '3MB', uploadDate: '2024-10-10' },
];

export const ExistingFiles = () => {
    const [selectedFile, setSelectedFile] = useState<number | null>(null);

    return (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-gray-800">Your Documents</h2>
                    <p className="text-sm text-gray-600">{myFiles.length} files stored</p>
                </div>
            </div>

            <div className="space-y-3">
                {myFiles.map(file => (
                    <div
                        key={file.id}
                        className="border border-gray-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-md transition-all duration-200"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1">
                                <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center">
                                    <FileText className="w-6 h-6 text-red-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-gray-800 truncate">{file.name}</h3>
                                    <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                                        <span>{file.size}</span>
                                        <span className="text-gray-400">•</span>
                                        <span>{file.uploadDate}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    className="p-2 hover:bg-blue-50 rounded-lg transition-colors group"
                                    title="View File"
                                >
                                    <Eye className="w-5 h-5 text-gray-600 group-hover:text-blue-600" />
                                </button>
                                <button
                                    className="p-2 hover:bg-indigo-50 rounded-lg transition-colors group"
                                    title="View Details"
                                    onClick={() => setSelectedFile(selectedFile === file.id ? null : file.id)}
                                >
                                    <Info className="w-5 h-5 text-gray-600 group-hover:text-indigo-600" />
                                </button>
                                <button
                                    className="p-2 hover:bg-red-50 rounded-lg transition-colors group"
                                    title="Delete File"
                                >
                                    <Trash2 className="w-5 h-5 text-gray-600 group-hover:text-red-600" />
                                </button>
                            </div>
                        </div>

                        {selectedFile === file.id && (
                            <div className="mt-4 pt-4 border-t border-gray-200">
                                <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">File ID:</span>
                                        <span className="font-medium text-gray-800">{file.id}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Size:</span>
                                        <span className="font-medium text-gray-800">{file.size}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Upload Date:</span>
                                        <span className="font-medium text-gray-800">{file.uploadDate}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};