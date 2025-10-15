// filePath: policy_mate_ui/src/components/Dashboard/ExistingFileViewer.tsx
'use client';
import { useState, useEffect } from 'react';
import {
    FileText,
    Eye,
    Trash2,
    Info,
    CheckCircle,
    AlertCircle,
    XCircle,
    RefreshCw,
    Loader2,
    ChevronDown,
    ChevronUp,
    Clock,
    HelpCircle
} from 'lucide-react';
import { fetchDocuments } from '@/utils/apis/documents';
import { Document } from '@/types';

// Helper to get file type icon color based on file extension
const getFileIconColor = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
        case 'pdf':
            return { bg: 'bg-red-50', icon: 'text-red-600' };
        case 'doc':
        case 'docx':
            return { bg: 'bg-blue-50', icon: 'text-blue-600' };
        case 'xls':
        case 'xlsx':
            return { bg: 'bg-green-50', icon: 'text-green-600' };
        case 'txt':
            return { bg: 'bg-gray-50', icon: 'text-gray-600' };
        default:
            return { bg: 'bg-purple-50', icon: 'text-purple-600' };
    }
};

// Helper to get compliance status badge styles
const getComplianceStyles = (status: number) => {
    switch (status) {
        case 51:
            return {
                bg: 'bg-green-100',
                text: 'text-green-700',
                border: 'border-green-200',
                icon: CheckCircle,
            };
        case 52:
            return {
                bg: 'bg-red-100',
                text: 'text-red-700',
                border: 'border-red-200',
                icon: XCircle,
            };
        case 1:
            return {
                bg: 'bg-yellow-100',
                text: 'text-yellow-700',
                border: 'border-yellow-200',
                icon: Clock,
            };
        default:
            return {
                bg: 'bg-gray-100',
                text: 'text-gray-700',
                border: 'border-gray-200',
                icon: HelpCircle,
            };
    }
};

export const ExistingFiles = () => {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const loadDocuments = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetchDocuments();
            if (response.error_message) {
                setError(response.error_message);
                setDocuments([]);
                return;
            }
            setDocuments(response.tool_payload?.documents || []);
        } catch (err) {
            console.error('Failed to load documents:', err);
            setError(err instanceof Error ? err.message : 'Failed to load documents');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadDocuments();
    }, []);

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadDocuments();
    };

    const handleDelete = async (documentId: string) => {
        // TODO: Implement delete functionality
        console.log('Delete document:', documentId);
    };

    const handleView = async (documentId: string) => {
        // TODO: Implement view functionality
        console.log('View document:', documentId);
    };

    if (loading && !refreshing) {
        return (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
                        <p className="text-gray-600">Loading your documents...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                        <p className="text-gray-800 font-semibold mb-2">Failed to load documents</p>
                        <p className="text-sm text-gray-600 mb-4">{error}</p>
                        <button
                            onClick={handleRefresh}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Try Again
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
                        <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Your Documents</h2>
                        <p className="text-sm text-gray-600">
                            {documents.length} {documents.length === 1 ? 'file' : 'files'} stored
                        </p>
                    </div>
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors group disabled:opacity-50"
                    title="Refresh documents"
                >
                    <RefreshCw
                        className={`w-5 h-5 text-gray-600 group-hover:text-blue-600 ${refreshing ? 'animate-spin' : ''
                            }`}
                    />
                </button>
            </div>

            {/* Documents List */}
            {documents.length === 0 ? (
                <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <FileText className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-600 mb-2">No documents yet</p>
                    <p className="text-sm text-gray-500">Upload your first document to get started</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {documents.map((doc) => {
                        const fileColors = getFileIconColor(doc.file_name);
                        const complianceStyles = getComplianceStyles(doc.compliance_status);
                        const ComplianceIcon = complianceStyles.icon;
                        const isExpanded = selectedFile === doc.document_id;

                        return (
                            <div
                                key={doc.document_id}
                                className="border border-gray-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-md transition-all duration-200"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    {/* File Icon & Info */}
                                    <div className="flex items-start gap-3 flex-1 min-w-0">
                                        <div className={`w-12 h-12 ${fileColors.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                                            <FileText className={`w-6 h-6 ${fileColors.icon}`} />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            {/* File Name & Status */}
                                            <div className="flex items-start gap-2 mb-2">
                                                <h3 className="font-semibold text-gray-800 truncate flex-1">
                                                    {doc.file_name}
                                                </h3>
                                                <span className="text-xl" title={doc.status_label}>
                                                    {doc.status_emoji}
                                                </span>
                                            </div>

                                            {/* Compliance Badge */}
                                            <div className="mb-2">
                                                <span
                                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${complianceStyles.bg} ${complianceStyles.text} ${complianceStyles.border}`}
                                                >
                                                    <ComplianceIcon className="w-3.5 h-3.5" />
                                                    {doc.status_label}
                                                </span>
                                            </div>

                                            {/* File Metadata */}
                                            <div className="flex items-center gap-3 text-sm text-gray-600">
                                                <span className="font-medium">{doc.formatted_size}</span>
                                                <span className="text-gray-400">•</span>
                                                <span>{doc.formatted_date}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                        <button
                                            onClick={() => handleView(doc.document_id)}
                                            className="p-2 hover:bg-blue-50 rounded-lg transition-colors group"
                                            title="View Document"
                                        >
                                            <Eye className="w-4 h-4 text-gray-600 group-hover:text-blue-600" />
                                        </button>
                                        <button
                                            onClick={() => setSelectedFile(isExpanded ? null : doc.document_id)}
                                            className="p-2 hover:bg-indigo-50 rounded-lg transition-colors group"
                                            title={isExpanded ? "Hide Details" : "Show Details"}
                                        >
                                            {isExpanded ? (
                                                <ChevronUp className="w-4 h-4 text-gray-600 group-hover:text-indigo-600" />
                                            ) : (
                                                <ChevronDown className="w-4 h-4 text-gray-600 group-hover:text-indigo-600" />
                                            )}
                                        </button>
                                        <button
                                            onClick={() => handleDelete(doc.document_id)}
                                            className="p-2 hover:bg-red-50 rounded-lg transition-colors group"
                                            title="Delete Document"
                                        >
                                            <Trash2 className="w-4 h-4 text-gray-600 group-hover:text-red-600" />
                                        </button>
                                    </div>
                                </div>

                                {/* Expanded Details */}
                                {isExpanded && (
                                    <div className="mt-4 pt-4 border-t border-gray-200 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 space-y-3">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-xs font-medium text-gray-500 mb-1">Document ID</p>
                                                    <p className="text-sm font-mono text-gray-800 truncate" title={doc.document_id}>
                                                        {doc.document_id}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-medium text-gray-500 mb-1">File Type</p>
                                                    <p className="text-sm text-gray-800">{doc.file_type}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-medium text-gray-500 mb-1">Size</p>
                                                    <p className="text-sm text-gray-800">
                                                        {doc.formatted_size} ({doc.document_size.toLocaleString()} bytes)
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-medium text-gray-500 mb-1">Upload Date</p>
                                                    <p className="text-sm text-gray-800">{doc.formatted_date}</p>
                                                </div>
                                                <div className="col-span-2">
                                                    <p className="text-xs font-medium text-gray-500 mb-1">Compliance Status</p>
                                                    <div className="flex items-center gap-2">
                                                        <span
                                                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border ${complianceStyles.bg} ${complianceStyles.text} ${complianceStyles.border}`}
                                                        >
                                                            <ComplianceIcon className="w-4 h-4" />
                                                            {doc.status_label}
                                                        </span>
                                                        <span className="text-gray-600 text-sm">
                                                            ({doc.compliance_status})
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};