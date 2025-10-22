"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react";

type DiagramType =
    | "overview"
    | "frontend"
    | "backend"
    | "agents"
    | "upload"
    | "storage"
    | "auth";

interface Section {
    id: DiagramType;
    title: string;
    description: string;
    mermaidFile: string;
    highlights: string[];
}

const sections: Section[] = [
    {
        id: "overview",
        title: "System Overview",
        description:
            "High-level architecture showing all major components and their interactions",
        mermaidFile: "system-overview.mmd",
        highlights: [
            "Next.js 15 App Router with TypeScript",
            "AWS Bedrock multi-agent system",
            "DynamoDB + S3 storage",
            "Web URL Config for long-running requests",
        ],
    },
    {
        id: "frontend",
        title: "Frontend Architecture",
        description:
            "Next.js 15 application structure with pages, components, and state management",
        mermaidFile: "frontend-architecture.mmd",
        highlights: [
            "Zustand state management (authStore + agentStore)",
            "AWS Cognito direct integration",
            "Tailwind CSS styling with Biome linting",
            "3 main pages: Dashboard, Chat UI, Interactive Mode",
        ],
    },
    {
        id: "backend",
        title: "Lambda Handlers",
        description:
            "AWS Lambda functions handling file operations, agent invocation, and status checks",
        mermaidFile: "backend-lambda-architecture.mmd",
        highlights: [
            "agent_v2_handler: Supervisor agent orchestration",
            "file_upload_handler: Pre-signed S3 URLs with deduplication",
            "annotations_handler: Bookmark management proxy",
            "Deployment: ./deploy.sh with MD5 caching",
        ],
    },
    {
        id: "agents",
        title: "Multi-Agent Orchestration",
        description:
            "Tool-agent pattern with supervisor routing to specialized child agents",
        mermaidFile: "agent-orchestration.mmd",
        highlights: [
            "Supervisor Agent: Smart router (Claude Haiku)",
            "Compliance Agent: Document analysis + framework checks",
            "Annotations Agent: Bookmark CRUD + conversations",
            "Drafting Agent: Policy generation (sub-agent)",
        ],
    },
    {
        id: "upload",
        title: "Upload to Analysis Flow",
        description:
            "Complete document lifecycle from user upload to AI-generated insights",
        mermaidFile: "upload-to-analysis-flow.mmd",
        highlights: [
            "Hash-based deduplication before upload",
            "Direct S3 upload via pre-signed URLs",
            "Cached analysis (doc_id#framework_id)",
            "Real-time status: uploading → uploaded → analyzed",
        ],
    },
    {
        id: "storage",
        title: "Data Storage Architecture",
        description:
            "DynamoDB tables, S3 bucket structure, and OpenSearch indices (deprecated)",
        mermaidFile: "data-storage-architecture.mmd",
        highlights: [
            "6 DynamoDB tables: Files, User_Files, Annotations, Cache, Controls, Conversations",
            "S3 structure: standard-docs/ + manual-docs/",
            "Annotation GSI for fast document queries",
            "OpenSearch not used in current MVP",
        ],
    },
    {
        id: "auth",
        title: "Authentication Flow",
        description:
            "AWS Cognito JWT-based authentication with multi-layer validation",
        mermaidFile: "authentication-flow.mmd",
        highlights: [
            "AWS Cognito User Pool with email verification",
            "JWT ID tokens stored in sessionStorage (Zustand)",
            "@require_cognito_auth decorator validates tokens",
            "Protected routes with LayoutWrapper",
        ],
    },
];

const ArchitectureDiagram = () => {
    const [expandedSections, setExpandedSections] = useState<DiagramType[]>([
        "overview",
    ]);

    const toggleSection = (id: DiagramType) => {
        setExpandedSections((prev) =>
            prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
        );
    };

    const openDiagram = (mermaidFile: string) => {
        window.open(`/docs/v2/${mermaidFile}`, "_blank");
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-5xl font-bold text-white mb-4">
                        Policy Mate Architecture
                    </h1>
                    <p className="text-xl text-slate-300 max-w-3xl mx-auto">
                        AI-Powered Compliance Co-Pilot built with AWS Bedrock, Next.js 15,
                        and Multi-Agent Orchestration
                    </p>
                    <div className="mt-6 flex justify-center gap-4">
                        <a
                            href="https://github.com/sedhha/policy_mate"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
                        >
                            <ExternalLink className="w-5 h-5" />
                            View on GitHub
                        </a>
                        <a
                            href="/docs/v2"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
                        >
                            <ExternalLink className="w-5 h-5" />
                            Browse Diagrams
                        </a>
                    </div>
                </div>

                {/* Tech Stack Overview */}
                <div className="mb-12 bg-slate-800/50 backdrop-blur-lg rounded-2xl p-8 border border-purple-500/20">
                    <h2 className="text-3xl font-bold text-white mb-6">Tech Stack</h2>
                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="bg-slate-700/50 rounded-xl p-6">
                            <h3 className="text-xl font-semibold text-purple-400 mb-3">
                                Frontend
                            </h3>
                            <ul className="space-y-2 text-slate-300">
                                <li>• Next.js 15 (App Router)</li>
                                <li>• TypeScript + Tailwind CSS</li>
                                <li>• Zustand (State Management)</li>
                                <li>• PDF.js (Document Rendering)</li>
                                <li>• Biome (Linting)</li>
                            </ul>
                        </div>
                        <div className="bg-slate-700/50 rounded-xl p-6">
                            <h3 className="text-xl font-semibold text-purple-400 mb-3">
                                Backend
                            </h3>
                            <ul className="space-y-2 text-slate-300">
                                <li>• AWS Lambda (Python 3.12)</li>
                                <li>• AWS Bedrock (Claude)</li>
                                <li>• Strands + AgentCore</li>
                                <li>• DynamoDB + S3</li>
                                <li>• API Gateway</li>
                            </ul>
                        </div>
                        <div className="bg-slate-700/50 rounded-xl p-6">
                            <h3 className="text-xl font-semibold text-purple-400 mb-3">
                                AI Agents
                            </h3>
                            <ul className="space-y-2 text-slate-300">
                                <li>• Supervisor Agent (Router)</li>
                                <li>• Compliance Agent</li>
                                <li>• Annotations Agent</li>
                                <li>• Drafting Agent</li>
                                <li>• Claude Haiku/Sonnet</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Interactive Sections */}
                <div className="space-y-6">
                    {sections.map((section) => {
                        const isExpanded = expandedSections.includes(section.id);
                        return (
                            <div
                                key={section.id}
                                className="bg-slate-800/50 backdrop-blur-lg rounded-2xl border border-purple-500/20 overflow-hidden transition-all duration-300 hover:border-purple-500/40"
                            >
                                {/* Section Header */}
                                <button
                                    type="button"
                                    onClick={() => toggleSection(section.id)}
                                    className="w-full px-8 py-6 flex items-center justify-between hover:bg-slate-700/30 transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 bg-purple-600/20 rounded-lg">
                                            {isExpanded ? (
                                                <ChevronDown className="w-6 h-6 text-purple-400" />
                                            ) : (
                                                <ChevronRight className="w-6 h-6 text-purple-400" />
                                            )}
                                        </div>
                                        <div className="text-left">
                                            <h3 className="text-2xl font-bold text-white">
                                                {section.title}
                                            </h3>
                                            <p className="text-slate-400 mt-1">
                                                {section.description}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            openDiagram(section.mermaidFile);
                                        }}
                                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                        View Diagram
                                    </button>
                                </button>

                                {/* Expanded Content */}
                                {isExpanded && (
                                    <div className="px-8 pb-8 border-t border-slate-700/50">
                                        <div className="mt-6">
                                            <h4 className="text-lg font-semibold text-purple-300 mb-4">
                                                Key Highlights
                                            </h4>
                                            <ul className="space-y-3">
                                                {section.highlights.map((highlight, idx) => (
                                                    <li
                                                        key={idx}
                                                        className="flex items-start gap-3 text-slate-300"
                                                    >
                                                        <span className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0" />
                                                        <span>{highlight}</span>
                                                    </li>
                                                ))}
                                            </ul>

                                            {/* Mermaid Preview Link */}
                                            <div className="mt-6 p-4 bg-slate-900/50 rounded-xl border border-purple-500/20">
                                                <p className="text-slate-400 mb-2">
                                                    <strong className="text-purple-300">
                                                        Mermaid Diagram:
                                                    </strong>{" "}
                                                    <code className="text-sm bg-slate-800 px-2 py-1 rounded">
                                                        docs/v2/{section.mermaidFile}
                                                    </code>
                                                </p>
                                                <p className="text-sm text-slate-500">
                                                    View the full interactive Mermaid diagram by clicking
                                                    "View Diagram" button above, or open it in your IDE
                                                    with Mermaid preview extension.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="mt-12 text-center text-slate-400">
                    <p>
                        Built with ❤️ using AWS Bedrock, Strands AgentCore, and Next.js 15
                    </p>
                    <p className="mt-2 text-sm">
                        See{" "}
                        <a
                            href="/docs/v2/flow_charts"
                            className="text-purple-400 hover:text-purple-300"
                        >
                            docs/v2/
                        </a>{" "}
                        for detailed architecture diagrams
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ArchitectureDiagram;