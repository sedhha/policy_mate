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
    X
} from 'lucide-react';
import { useAgentStore } from '@/stores/agentStore';
import { useAuthStore } from '@/stores/authStore';

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

const getComplianceStyles = (status: number) => {
    switch (status) {
        case 51:
            return {
                bg: 'bg-emerald-500',
                text: 'text-emerald-700',
                lightBg: 'bg-emerald-50',
                border: 'border-emerald-200',
                icon: CheckCircle,
            };
        case 52:
            return {
                bg: 'bg-red-500',
                text: 'text-red-700',
                lightBg: 'bg-red-50',
                border: 'border-red-200',
                icon: XCircle,
            };
        case 1:
            return {
                bg: 'bg-amber-500',
                text: 'text-amber-700',
                lightBg: 'bg-amber-50',
                border: 'border-amber-200',
                icon: Clock,
            };
        case 12:
            return {
                bg: 'bg-blue-500',
                text: 'text-blue-700',
                lightBg: 'bg-blue-50',
                border: 'border-blue-200',
                icon: Loader2,
            };
        default:
            return {
                bg: 'bg-slate-500',
                text: 'text-slate-700',
                lightBg: 'bg-slate-50',
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
        console.log('Delete document:', documentId);
    };

    const handleView = async (documentId: string) => {
        console.log('View document:', documentId);
    };

    const handleStartChat = () => {
        if (selectedDocument) {
            router.push('/chat');
        }
    };

    const handleStartAnalysis = () => {
        if (selectedDocument) {
            const payload = {
                document_id: selectedDocument.document_id,
                totalPages: selectedDocument.pages || 0,
                s3_key: selectedDocument.s3_key,
                s3_bucket: selectedDocument.s3_bucket,
            };
            const base64Payload = btoa(JSON.stringify(payload));
            router.push(`/analyse?payload=${base64Payload}`);
        }
    };

    const filteredDocuments = documents.filter(doc =>
        doc.file_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Calculate stats
    const stats = {
        total: documents.length,
        compliant: documents.filter(d => d.compliance_status === 51).length,
        pending: documents.filter(d => d.compliance_status === 1).length,
        nonCompliant: documents.filter(d => d.compliance_status === 52).length
    };

    if (loading) {
        return (
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
                <div className="flex items-center justify-center py-16">
                    <div className="text-center">
                        <div className="relative w-20 h-20 mx-auto mb-6">
                            <div className="absolute inset-0 rounded-full border-4 border-blue-100"></div>
                            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 border-r-blue-400 animate-spin"></div>
                            <div className="absolute inset-3 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 animate-pulse flex items-center justify-center">
                                <FileText className="w-6 h-6 text-white" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <p className="text-lg font-semibold text-slate-800 animate-pulse">
                                Loading documents
                            </p>
                            <p className="text-sm text-slate-500">
                                Please wait while we fetch your files...
                            </p>
                        </div>

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
                        <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <AlertCircle className="w-8 h-8 text-red-500" />
                        </div>
                        <p className="text-slate-800 font-semibold text-lg mb-2">Failed to load documents</p>
                        <p className="text-sm text-slate-600 mb-4">{error}</p>
                        <button
                            onClick={handleRefresh}
                            className="px-6 py-3 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl inline-flex items-center gap-2 font-semibold"
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
            {/* Stats Bar */}
            {documents.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="bg-white rounded-2xl p-5 shadow-md border border-slate-200 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-600 font-medium mb-1">Total Documents</p>
                                <p className="text-3xl font-bold text-slate-800">{stats.total}</p>
                            </div>
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                                <FileText className="w-6 h-6 text-white" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-5 shadow-md border border-emerald-200 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-emerald-600 font-medium mb-1">Compliant</p>
                                <p className="text-3xl font-bold text-emerald-700">{stats.compliant}</p>
                            </div>
                            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                                <CheckCircle className="w-6 h-6 text-white" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-5 shadow-md border border-amber-200 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-amber-600 font-medium mb-1">Pending</p>
                                <p className="text-3xl font-bold text-amber-700">{stats.pending}</p>
                            </div>
                            <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
                                <Clock className="w-6 h-6 text-white" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-5 shadow-md border border-red-200 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-red-600 font-medium mb-1">Non-Compliant</p>
                                <p className="text-3xl font-bold text-red-700">{stats.nonCompliant}</p>
                            </div>
                            <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                                <XCircle className="w-6 h-6 text-white" />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Documents List */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
                {/* Header with Action Buttons */}
                <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
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

                    <div className="flex items-center gap-3">
                        {selectedDocument && (
                            <>
                                <button
                                    onClick={handleStartChat}
                                    className="px-5 py-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-2 group hover:scale-[1.02] animate-in fade-in slide-in-from-right-4 duration-300"
                                >
                                    <MessageSquare className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                    Start Chat
                                </button>
                                <button
                                    onClick={handleStartAnalysis}
                                    className="px-5 py-2.5 bg-gradient-to-br from-amber-400 to-orange-500 text-white rounded-xl font-semibold hover:from-amber-500 hover:to-orange-600 transition-all shadow-lg hover:shadow-xl flex items-center gap-2 group hover:scale-[1.02] animate-in fade-in slide-in-from-right-4 duration-300"
                                    style={{ animationDelay: '50ms' }}
                                >
                                    <Zap className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                    Start Live Analysis
                                </button>
                            </>
                        )}
                        <button
                            onClick={handleRefresh}
                            disabled={loading}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors group disabled:opacity-50"
                            title="Refresh documents"
                        >
                            <RefreshCw
                                className={`w-5 h-5 text-slate-600 group-hover:text-blue-600 transition-colors ${loading ? 'animate-spin' : ''}`}
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
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 rounded-lg transition-colors"
                            >
                                <X className="w-4 h-4 text-slate-600" />
                            </button>
                        )}
                    </div>
                )}

                {/* Documents Grid */}
                {documents.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <FileText className="w-10 h-10 text-slate-400" />
                        </div>
                        <p className="text-slate-600 text-lg mb-2">No documents yet</p>
                        <p className="text-sm text-slate-500">Upload your first document to get started</p>
                    </div>
                ) : filteredDocuments.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <Search className="w-10 h-10 text-slate-400" />
                        </div>
                        <p className="text-slate-600 text-lg mb-2">No documents match your search</p>
                        <p className="text-sm text-slate-500">Try a different search term</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {filteredDocuments.map((doc, index) => {
                            const fileColors = getFileIconColor(doc.file_name);
                            const complianceStyles = getComplianceStyles(doc.compliance_status);
                            const ComplianceIcon = complianceStyles.icon;
                            const isExpanded = selectedFile === doc.document_id;
                            const isSelected = selectedDocument?.document_id === doc.document_id;

                            return (
                                <div
                                    key={doc.document_id}
                                    onClick={() => setSelectedDocument(isSelected ? undefined : doc)}
                                    style={{ animationDelay: `${index * 50}ms` }}
                                    className={`group cursor-pointer bg-white rounded-2xl p-5 border-2 transition-all duration-300 hover:shadow-xl animate-in fade-in slide-in-from-bottom-4 ${isSelected
                                        ? 'border-blue-500 shadow-xl scale-[1.02] ring-4 ring-blue-100'
                                        : 'border-slate-200 hover:border-blue-300 shadow-md hover:scale-[1.02]'
                                        }`}
                                >
                                    {/* Document Icon & Status */}
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-12 h-12 ${fileColors.bg} rounded-xl flex items-center justify-center border ${fileColors.border} transition-transform group-hover:scale-110`}>
                                                <FileText className={`w-6 h-6 ${fileColors.icon}`} />
                                            </div>
                                            <div className={`w-3 h-3 rounded-full ${complianceStyles.bg} animate-pulse`}></div>
                                        </div>
                                        <span className="text-2xl" title={doc.status_label}>{doc.status_emoji}</span>
                                    </div>

                                    {/* Document Name */}
                                    <h4 className="font-bold text-slate-800 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                                        {doc.file_name}
                                    </h4>

                                    {/* Status Badge */}
                                    <div className="mb-4">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${complianceStyles.lightBg} ${complianceStyles.text} ${complianceStyles.border}`}>
                                            <ComplianceIcon className="w-3.5 h-3.5" />
                                            {doc.status_label}
                                        </span>
                                    </div>

                                    {/* Metadata */}
                                    <div className="flex items-center justify-between text-sm text-slate-600 mb-4">
                                        <span className="font-medium">{doc.formatted_size}</span>
                                        <span>{doc.formatted_date}</span>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleView(doc.document_id);
                                            }}
                                            className="flex-1 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-all text-sm font-medium flex items-center justify-center gap-1 hover:scale-105"
                                        >
                                            <Eye className="w-4 h-4" />
                                            View
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedFile(isExpanded ? null : doc.document_id);
                                            }}
                                            className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg transition-all hover:scale-105"
                                            title={isExpanded ? "Hide Details" : "Show Details"}
                                        >
                                            {isExpanded ? (
                                                <ChevronUp className="w-4 h-4" />
                                            ) : (
                                                <ChevronDown className="w-4 h-4" />
                                            )}
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(doc.document_id);
                                            }}
                                            className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition-all hover:scale-105"
                                            title="Delete Document"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
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
                                                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border ${complianceStyles.lightBg} ${complianceStyles.text} ${complianceStyles.border}`}
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