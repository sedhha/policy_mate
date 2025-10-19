// filePath: policy_mate_ui/src/components/Dashboard/ExistingFileViewer.tsx
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    FileText,
    Eye,
    Trash2,
    CheckCircle,
    AlertCircle,
    XCircle,
    RefreshCw,
    Loader2,
    ChevronDown,
    ChevronUp,
    Clock,
    HelpCircle,
    MessageSquare,
    Zap,
    Search,
    Filter
} from 'lucide-react';
import { Document } from '@/types';
import { useAgentStore } from '@/stores/agentStore';
import { useAuthStore } from '@/stores/authStore';

// Helper to get file type icon color based on file extension
const getFileIconColor = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
        case 'pdf':
            return { bg: 'bg-gradient-to-br from-red-50 to-red-100', icon: 'text-red-600', border: 'border-red-200' };
        case 'doc':
        case 'docx':
            return { bg: 'bg-gradient-to-br from-blue-50 to-blue-100', icon: 'text-blue-600', border: 'border-blue-200' };
        case 'xls':
        case 'xlsx':
            return { bg: 'bg-gradient-to-br from-green-50 to-green-100', icon: 'text-green-600', border: 'border-green-200' };
        case 'txt':
            return { bg: 'bg-gradient-to-br from-gray-50 to-gray-100', icon: 'text-gray-600', border: 'border-gray-200' };
        default:
            return { bg: 'bg-gradient-to-br from-purple-50 to-purple-100', icon: 'text-purple-600', border: 'border-purple-200' };
    }
};

// Helper to get compliance status badge styles
const getComplianceStyles = (status: number) => {
    switch (status) {
        case 51:
            return {
                bg: 'bg-emerald-50',
                text: 'text-emerald-700',
                border: 'border-emerald-200',
                icon: CheckCircle,
            };
        case 52:
            return {
                bg: 'bg-red-50',
                text: 'text-red-700',
                border: 'border-red-200',
                icon: XCircle,
            };
        case 1:
            return {
                bg: 'bg-amber-50',
                text: 'text-amber-700',
                border: 'border-amber-200',
                icon: Clock,
            };
        default:
            return {
                bg: 'bg-slate-50',
                text: 'text-slate-700',
                border: 'border-slate-200',
                icon: HelpCircle,
            };
    }
};

export const ExistingFiles = () => {
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const router = useRouter();

    const { idToken } = useAuthStore();

    const {
        documents,
        selectedDocument,
        setSelectedDocument,
        loadDocuments,
        agentStates
    } = useAgentStore();

    const loading = agentStates.listDocs.loading;
    const error = agentStates.listDocs.error;

    useEffect(() => {
        if (idToken) { loadDocuments(); }
    }, [loadDocuments, idToken]);

    const handleRefresh = async () => {
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

    const handleStartChat = () => {
        if (selectedDocument) {
            router.push('/chat');
        }
    };

    const handleStartAnalysis = () => {
        if (selectedDocument) {
            // TODO: Navigate to analysis page or trigger analysis
            console.log('Start analysis for:', selectedDocument.document_id);
        }
    };

    const filteredDocuments = documents.filter(doc =>
        doc.file_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
                <div className="flex items-center justify-center py-16">
                    <div className="text-center">
                        {/* Modern animated loader */}
                        <div className="relative w-20 h-20 mx-auto mb-6">
                            {/* Outer rotating ring */}
                            <div className="absolute inset-0 rounded-full border-4 border-blue-100"></div>
                            {/* Animated gradient ring */}
                            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 border-r-blue-400 animate-spin"></div>
                            {/* Inner pulsing circle */}
                            <div className="absolute inset-3 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 animate-pulse flex items-center justify-center">
                                <FileText className="w-6 h-6 text-white" />
                            </div>
                        </div>

                        {/* Loading text with fade animation */}
                        <div className="space-y-2">
                            <p className="text-lg font-semibold text-slate-800 animate-pulse">
                                Loading documents
                            </p>
                            <p className="text-sm text-slate-500">
                                Please wait while we fetch your files...
                            </p>
                        </div>

                        {/* Optional: Animated dots */}
                        <div className="flex items-center justify-center gap-1.5 mt-4">
                            <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                            <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                            <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
                <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                        <p className="text-slate-800 font-semibold mb-2">Failed to load documents</p>
                        <p className="text-sm text-slate-600 mb-4">{error}</p>
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
        <div className="space-y-6">
            {/* Action Banner - Shows when a document is selected */}
            {selectedDocument && (
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-6 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center justify-between gap-6 flex-wrap">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                                <FileText className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <p className="text-white/80 text-sm font-medium mb-1">Selected Document</p>
                                <p className="text-white text-xl font-bold truncate max-w-md">{selectedDocument.file_name}</p>
                                <p className="text-white/70 text-sm mt-1">Ready for analysis</p>
                            </div>
                        </div>

                        <div className="flex gap-3 flex-wrap">
                            <button
                                onClick={handleStartChat}
                                className="px-6 py-3 bg-white text-blue-600 rounded-xl font-semibold hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl flex items-center gap-2 group"
                            >
                                <MessageSquare className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                Start Chat
                            </button>
                            <button
                                onClick={handleStartAnalysis}
                                className="px-6 py-3 bg-gradient-to-br from-amber-400 to-orange-500 text-white rounded-xl font-semibold hover:from-amber-500 hover:to-orange-600 transition-all shadow-lg hover:shadow-xl flex items-center gap-2 group"
                            >
                                <Zap className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                Start Live Analysis
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Documents List */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
                            <FileText className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-800">Your Documents</h3>
                            <p className="text-sm text-slate-600">
                                {documents.length} {documents.length === 1 ? 'file' : 'files'} stored
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={handleRefresh}
                            disabled={loading}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors group disabled:opacity-50"
                            title="Refresh documents"
                        >
                            <RefreshCw
                                className={`w-5 h-5 text-slate-600 group-hover:text-blue-600 ${loading ? 'animate-spin' : ''}`}
                            />
                        </button>
                    </div>
                </div>

                {/* Search */}
                {documents.length > 0 && (
                    <div className="relative mb-6">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search documents..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                    </div>
                )}

                {/* Documents Grid */}
                {documents.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <FileText className="w-8 h-8 text-slate-400" />
                        </div>
                        <p className="text-slate-600 mb-2">No documents yet</p>
                        <p className="text-sm text-slate-500">Upload your first document to get started</p>
                    </div>
                ) : filteredDocuments.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-slate-600">No documents match your search</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredDocuments.map((doc) => {
                            const fileColors = getFileIconColor(doc.file_name);
                            const complianceStyles = getComplianceStyles(doc.compliance_status);
                            const ComplianceIcon = complianceStyles.icon;
                            const isExpanded = selectedFile === doc.document_id;
                            const isSelected = selectedDocument?.document_id === doc.document_id;

                            return (
                                <div
                                    key={doc.document_id}
                                    onClick={() => setSelectedDocument(doc)}
                                    className={`group cursor-pointer rounded-xl border-2 p-4 transition-all duration-200 ${isSelected
                                        ? 'border-blue-500 bg-blue-50 shadow-lg'
                                        : 'border-slate-200 hover:border-blue-300 hover:shadow-md bg-white'
                                        }`}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        {/* File Icon & Info */}
                                        <div className="flex items-start gap-4 flex-1 min-w-0">
                                            <div className={`w-14 h-14 ${fileColors.bg} rounded-xl flex items-center justify-center flex-shrink-0 border ${fileColors.border}`}>
                                                <FileText className={`w-7 h-7 ${fileColors.icon}`} />
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                {/* File Name & Status */}
                                                <div className="flex items-start gap-2 mb-2">
                                                    <h4 className="font-semibold text-slate-800 truncate flex-1">
                                                        {doc.file_name}
                                                    </h4>
                                                    <span className="text-xl flex-shrink-0" title={doc.status_label}>
                                                        {doc.status_emoji}
                                                    </span>
                                                </div>

                                                {/* Compliance Badge */}
                                                <div className="mb-3">
                                                    <span
                                                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${complianceStyles.bg} ${complianceStyles.text} ${complianceStyles.border}`}
                                                    >
                                                        <ComplianceIcon className="w-3.5 h-3.5" />
                                                        {doc.status_label}
                                                    </span>
                                                </div>

                                                {/* File Metadata */}
                                                <div className="flex items-center gap-3 text-sm text-slate-600">
                                                    <span className="font-medium">{doc.formatted_size}</span>
                                                    <span className="text-slate-400">•</span>
                                                    <span>{doc.formatted_date}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleView(doc.document_id);
                                                }}
                                                className="p-2 hover:bg-blue-50 rounded-lg transition-colors group/btn"
                                                title="View Document"
                                            >
                                                <Eye className="w-4 h-4 text-slate-600 group-hover/btn:text-blue-600" />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedFile(isExpanded ? null : doc.document_id);
                                                }}
                                                className="p-2 hover:bg-indigo-50 rounded-lg transition-colors group/btn"
                                                title={isExpanded ? "Hide Details" : "Show Details"}
                                            >
                                                {isExpanded ? (
                                                    <ChevronUp className="w-4 h-4 text-slate-600 group-hover/btn:text-indigo-600" />
                                                ) : (
                                                    <ChevronDown className="w-4 h-4 text-slate-600 group-hover/btn:text-indigo-600" />
                                                )}
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDelete(doc.document_id);
                                                }}
                                                className="p-2 hover:bg-red-50 rounded-lg transition-colors group/btn"
                                                title="Delete Document"
                                            >
                                                <Trash2 className="w-4 h-4 text-slate-600 group-hover/btn:text-red-600" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Expanded Details */}
                                    {isExpanded && (
                                        <div className="mt-4 pt-4 border-t border-slate-200 animate-in fade-in slide-in-from-top-2 duration-200">
                                            <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-4 space-y-3">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <p className="text-xs font-medium text-slate-500 mb-1">Document ID</p>
                                                        <p className="text-sm font-mono text-slate-800 truncate" title={doc.document_id}>
                                                            {doc.document_id}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-medium text-slate-500 mb-1">File Type</p>
                                                        <p className="text-sm text-slate-800">{doc.file_type}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-medium text-slate-500 mb-1">Size</p>
                                                        <p className="text-sm text-slate-800">
                                                            {doc.formatted_size} ({doc.document_size.toLocaleString()} bytes)
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-medium text-slate-500 mb-1">Upload Date</p>
                                                        <p className="text-sm text-slate-800">{doc.formatted_date}</p>
                                                    </div>
                                                    <div className="col-span-2">
                                                        <p className="text-xs font-medium text-slate-500 mb-1">Compliance Status</p>
                                                        <div className="flex items-center gap-2">
                                                            <span
                                                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border ${complianceStyles.bg} ${complianceStyles.text} ${complianceStyles.border}`}
                                                            >
                                                                <ComplianceIcon className="w-4 h-4" />
                                                                {doc.status_label}
                                                            </span>
                                                            <span className="text-slate-600 text-sm">
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
        </div>
    );
};