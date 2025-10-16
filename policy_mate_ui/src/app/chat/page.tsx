'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAgentStore } from '@/stores/agentStore';
import {
    ArrowLeft,
    FileText,
    MessageSquare,
    Send,
    Loader2,
    Sparkles,
    Bot,
    User,
    Copy,
    Check,
    FileCode,
    Hash,
    ChevronRight,
    Quote,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';
import 'katex/dist/katex.min.css';

const dummyMarkdownResponse = `## Document Analysis Complete

The document **sample_compliance_document.pdf** has been thoroughly analyzed using our advanced AI system.

### Executive Summary

This comprehensive analysis covers multiple aspects of your document:

- **Compliance Status**: Currently marked as Unknown
- **Document Size**: 4.7 KB
- **Last Updated**: Oct 15, 2025
- **Risk Level**: Low to Medium

### Key Findings

#### 1. Document Structure

The document follows a standard compliance format with the following sections:

1. Introduction and scope
2. Regulatory requirements
3. Implementation guidelines
4. Monitoring and reporting

#### 2. Compliance Gaps Identified

> **Important Note**: Several areas require immediate attention to ensure full compliance with current regulations.

We've identified **3 critical gaps** that need addressing:

- Missing signature fields in Section 4.2
- Outdated reference to 2023 regulations (should cite 2024 amendments)
- Incomplete risk assessment matrix

### Technical Details

Here's a sample code snippet for automated compliance checking:

\`\`\`python
def check_compliance(document):
    """
    Automated compliance checker
    """
    gaps = []
    
    if not document.has_signatures():
        gaps.append("Missing signatures")
    
    if document.regulation_year < 2024:
        gaps.append("Outdated regulations")
    
    return {
        'status': 'incomplete' if gaps else 'compliant',
        'gaps': gaps,
        'confidence': 0.87
    }
\`\`\`

For inline code references, use \`document.validate()\` to run validation checks.

### Compliance Metrics

| Metric | Current Value | Target | Status |
| --- | --- | --- | --- |
| Documentation Coverage | 85% | 95% | ⚠️ Needs Improvement |
| Regulatory Alignment | 92% | 100% | ✅ Good |
| Audit Readiness | 78% | 90% | ⚠️ Needs Work |
| Data Privacy Score | 95% | 95% | ✅ Excellent |

### Recommendations

***Strong emphasis***: The following actions are *highly recommended*:

1. **Update Regulatory References**
   - Replace 2023 citations with current 2024 amendments
   - Review Section 3.4 for outdated terminology
   - Add missing compliance checkpoints

2. **Complete Documentation**
   - Add digital signature fields
   - Include attestation statements
   - Update risk assessment matrices

3. **Schedule Follow-up Review**
   - Conduct quarterly compliance audits
   - Implement continuous monitoring
   - Set up automated alerts for policy changes

### External Resources

For more information, please refer to:

- [ISO 27001 Compliance Guide](https://www.iso.org/standard/27001)
- [GDPR Documentation](https://gdpr.eu)
- [Internal Compliance Portal](https://compliance.yourcompany.com)

---

### Mathematical Formulas

The compliance score is calculated using:

$$
ComplianceScore = \\frac{\\sum_{i=1}^{n} w_i \\cdot s_i}{\\sum_{i=1}^{n} w_i} \\times 100
$$

Where $w_i$ represents the weight of each criterion and $s_i$ is the individual score.

### Nested Lists

Document hierarchy breakdown:

- **Top Level Requirements**
  - Regulatory Compliance
    - Federal regulations
    - State-specific requirements
    - Industry standards
  - Internal Policies
    - Corporate governance
    - Data protection
    - Employee conduct
- **Supporting Documentation**
  - Audit trails
  - Change logs
  - Approval records

### Code Block with Different Languages

JavaScript example:

\`\`\`javascript
// Compliance validation middleware
const validateCompliance = async (req, res, next) => {
  const document = req.body.document;
  const result = await complianceEngine.analyze(document);
  
  if (result.status === 'non-compliant') {
    return res.status(400).json({
      error: 'Compliance check failed',
      gaps: result.gaps
    });
  }
  
  next();
};
\`\`\`

SQL query for audit logs:

\`\`\`sql
SELECT 
  document_id,
  compliance_status,
  last_reviewed,
  reviewer_name
FROM compliance_audits
WHERE status = 'pending'
  AND last_reviewed < DATE_SUB(NOW(), INTERVAL 90 DAY)
ORDER BY last_reviewed ASC;
\`\`\`

### Special Formatting

This is a paragraph with **bold text**, *italic text*, and ***bold italic text***. You can also use \`inline code\` within sentences.

> This is a blockquote that contains important information about compliance requirements.
> 
> It can span multiple paragraphs and include **formatted text**.

### Multiple Blockquotes

> **Warning**: Failure to address these gaps may result in non-compliance penalties.

> **Tip**: Use our automated compliance checker to monitor document status in real-time.

### Final Notes

#### Quick Action Items

- [ ] Review identified gaps
- [ ] Update regulatory references  
- [ ] Schedule compliance audit
- [ ] Notify stakeholders

---

**Document ID**: \`ed9dbabf-517f-4a77-b3f4-dc5b8c44be9c\`  
**Analysis Date**: October 16, 2025  
**Confidence Score**: 87.5%

*This analysis was generated by Compliance Copilot AI v2.1*`;

// Custom components for markdown rendering - FIXED for hydration
const MarkdownComponents = {
    h1: ({ children, ...props }: React.HTMLProps<HTMLHeadingElement>) => (
        <h1
            className='text-2xl md:text-3xl font-bold text-gray-900 mb-4 mt-6 pb-2 border-b border-gray-200 first:mt-0'
            {...props}>
            {children}
        </h1>
    ),
    h2: ({ children, ...props }: React.HTMLProps<HTMLHeadingElement>) => (
        <h2
            className='text-xl md:text-2xl font-semibold text-gray-800 mb-3 mt-5 flex items-center gap-2 first:mt-0'
            {...props}>
            <Hash className='w-4 h-4 md:w-5 md:h-5 text-blue-500 opacity-50' />
            {children}
        </h2>
    ),
    h3: ({ children, ...props }: React.HTMLProps<HTMLHeadingElement>) => (
        <h3
            className='text-lg md:text-xl font-semibold text-gray-700 mb-2 mt-4 first:mt-0'
            {...props}>
            {children}
        </h3>
    ),
    h4: ({ children, ...props }: React.HTMLProps<HTMLHeadingElement>) => (
        <h4
            className='text-base md:text-lg font-semibold text-gray-700 mb-2 mt-3 first:mt-0'
            {...props}>
            {children}
        </h4>
    ),
    p: ({ children, ...props }: React.HTMLProps<HTMLParagraphElement>) => (
        <p
            className='text-sm md:text-base text-gray-700 leading-relaxed mb-4 last:mb-0'
            {...props}>
            {children}
        </p>
    ),
    ul: ({ children, ...props }: React.HTMLProps<HTMLUListElement>) => (
        <ul className='space-y-2 mb-4 ml-2 md:ml-4' {...props}>
            {children}
        </ul>
    ),
    ol: ({ children, ...props }: React.OlHTMLAttributes<HTMLOListElement>) => (
        <ol
            className='space-y-2 mb-4 ml-2 md:ml-4 list-decimal list-inside'
            {...props}>
            {children}
        </ol>
    ),
    li: ({ children, ...props }: React.HTMLProps<HTMLLIElement>) => (
        <li
            className='flex items-start gap-2 text-sm md:text-base text-gray-700'
            {...props}>
            <ChevronRight className='w-3 h-3 md:w-4 md:h-4 text-blue-500 mt-0.5 flex-shrink-0' />
            <span className='flex-1'>{children}</span>
        </li>
    ),
    blockquote: ({ children, ...props }: React.HTMLProps<HTMLQuoteElement>) => (
        <blockquote
            className='border-l-4 border-blue-500 bg-blue-50 pl-3 md:pl-4 py-2 md:py-3 pr-3 md:pr-4 mb-4 rounded-r-lg'
            {...props}>
            <div className='flex gap-2'>
                <Quote className='w-4 h-4 md:w-5 md:h-5 text-blue-600 opacity-50 flex-shrink-0 mt-1' />
                <div className='text-sm md:text-base text-gray-700 italic flex-1'>
                    {children}
                </div>
            </div>
        </blockquote>
    ),
    code: ({
        inline,
        className,
        children,
        ...props
    }: React.HTMLProps<HTMLElement> & { inline?: boolean }) => {
        const [copied, setCopied] = useState(false);

        const handleCopy = () => {
            navigator.clipboard.writeText(String(children));
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        };

        if (inline) {
            return (
                <code
                    className='px-1.5 py-0.5 bg-gray-100 text-purple-600 rounded text-xs md:text-sm font-mono'
                    {...props}>
                    {children}
                </code>
            );
        }

        // Block code - return fragment to avoid nesting issues
        return (
            <>
                <div className='relative group mb-4 not-prose'>
                    <div className='absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10'>
                        <button
                            onClick={handleCopy}
                            className='p-1.5 md:p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors'>
                            {copied ? (
                                <Check className='w-3 h-3 md:w-4 md:h-4 text-green-400' />
                            ) : (
                                <Copy className='w-3 h-3 md:w-4 md:h-4 text-gray-400' />
                            )}
                        </button>
                    </div>
                    <div className='bg-gray-900 rounded-lg overflow-hidden'>
                        <div className='flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-gray-800 border-b border-gray-700'>
                            <FileCode className='w-3 h-3 md:w-4 md:h-4 text-gray-400' />
                            <span className='text-xs text-gray-400 font-mono'>
                                {className?.replace('language-', '') || 'code'}
                            </span>
                        </div>
                        <pre className='p-3 md:p-4 overflow-x-auto'>
                            <code
                                className='text-xs md:text-sm font-mono text-gray-300'
                                {...props}>
                                {children}
                            </code>
                        </pre>
                    </div>
                </div>
            </>
        );
    },
    pre: ({ children }: React.HTMLProps<HTMLPreElement>) => {
        // Just return children to avoid double-wrapping
        return <>{children}</>;
    },
    a: ({ children, href, ...props }: React.HTMLProps<HTMLAnchorElement>) => (
        <a
            href={href}
            target='_blank'
            rel='noopener noreferrer'
            className='text-blue-600 hover:text-blue-800 underline decoration-blue-300 hover:decoration-blue-500 transition-colors break-words'
            {...props}>
            {children}
        </a>
    ),
    table: ({ children, ...props }: React.HTMLProps<HTMLTableElement>) => (
        <div className='overflow-x-auto mb-4 -mx-2 md:mx-0'>
            <table
                className='min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg'
                {...props}>
                {children}
            </table>
        </div>
    ),
    thead: ({ children, ...props }: React.HTMLProps<HTMLTableSectionElement>) => (
        <thead className='bg-gray-50' {...props}>
            {children}
        </thead>
    ),
    th: ({ children, ...props }: React.HTMLProps<HTMLTableCellElement>) => (
        <th
            className='px-3 md:px-4 py-2 md:py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider'
            {...props}>
            {children}
        </th>
    ),
    td: ({ children, ...props }: React.HTMLProps<HTMLTableCellElement>) => (
        <td
            className='px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm text-gray-700 border-t border-gray-100'
            {...props}>
            {children}
        </td>
    ),
    hr: () => <hr className='my-4 md:my-6 border-gray-200' />,
    strong: ({ children, ...props }: React.HTMLProps<HTMLElement>) => (
        <strong className='font-semibold text-gray-900' {...props}>
            {children}
        </strong>
    ),
    em: ({ children, ...props }: React.HTMLProps<HTMLElement>) => (
        <em className='italic text-gray-700' {...props}>
            {children}
        </em>
    ),
};

export default function ChatPage() {
    const router = useRouter();
    const { selectedDocument, sendChatMessage, agentStates } = useAgentStore();
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState<
        Array<{ role: 'user' | 'assistant'; content: string; isLoading?: boolean }>
    >([]);
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when new messages arrive
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (!selectedDocument) {
            router.push('/');
        }
    }, [selectedDocument, router]);

    // Auto-resize textarea with better constraints
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            const newHeight = Math.min(textareaRef.current.scrollHeight, 150);
            textareaRef.current.style.height = `${newHeight}px`;
        }
    }, [message]);

    const handleSendMessage = async (e: React.FormEvent | null) => {
        if (e) e.preventDefault();
        if (!message.trim() || !selectedDocument || agentStates.chat.loading)
            return;

        const userMessage = message.trim();

        // Add user message to chat
        setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
        setMessage('');
        setIsTyping(true);

        // Add a loading placeholder for assistant response
        setMessages((prev) => [
            ...prev,
            {
                role: 'assistant',
                content: '',
                isLoading: true,
            },
        ]);

        // Send message to agent with document context
        const response = await sendChatMessage(
            userMessage,
            selectedDocument.document_id
        );

        setIsTyping(false);

        // Remove loading placeholder and add actual response
        setMessages((prev) => {
            const messagesWithoutLoading = prev.filter((msg) => !msg.isLoading);

            if (response) {
                const assistantMessage =
                    response.summarised_markdown || 'No response from agent';

                return [
                    ...messagesWithoutLoading,
                    {
                        role: 'assistant',
                        content: assistantMessage,
                    },
                ];
            } else {
                return [
                    ...messagesWithoutLoading,
                    {
                        role: 'assistant',
                        content:
                            agentStates.chat.error ||
                            '❌ Failed to get response from agent. Please try again.',
                    },
                ];
            }
        });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage(null);
        }
    };

    if (!selectedDocument) {
        return null;
    }

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
            {/* Fixed Header */}
            <div className="flex-shrink-0 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm z-10">
                <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
                    <button
                        onClick={() => router.push('/')}
                        className="p-2 hover:bg-gray-100 rounded-xl transition"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-700" />
                    </button>
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="relative">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                                <FileText className="w-5 h-5 text-white" />
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                        </div>
                        <div className="truncate">
                            <h1 className="text-base md:text-lg font-bold text-gray-900 truncate flex items-center gap-2">
                                {selectedDocument.file_name}
                                <Sparkles className="w-4 h-4 text-yellow-500" />
                            </h1>
                            <p className="text-xs text-gray-600">AI-Powered Document Analysis</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Chat Section */}
            <div className="flex flex-col flex-1 min-h-0">
                {/* Scrollable Conversation Area */}
                <div
                    ref={messagesContainerRef}
                    className="flex-1 overflow-y-auto px-4 py-6 scroll-smooth"
                    style={{
                        scrollbarWidth: 'thin',
                        scrollbarColor: '#CBD5E1 transparent',
                        overscrollBehavior: 'contain',
                    }}
                >
                    <div className="flex flex-col items-center space-y-6">
                        {messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center text-gray-600">
                                <MessageSquare className="w-10 h-10 text-blue-500 mb-2" />
                                <p>
                                    Ask a question about <b>{selectedDocument.file_name}</b> to begin
                                </p>
                            </div>
                        ) : (
                            <>
                                {messages.map((msg, idx) => (
                                    <div key={idx} className="w-full flex justify-center">
                                        <div
                                            className={`w-full max-w-[90%] sm:max-w-[75%] md:max-w-[70%] flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'
                                                }`}
                                        >
                                            <div
                                                className={`break-words rounded-2xl shadow-md px-4 py-3 ${msg.role === 'user'
                                                    ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white max-w-[80%]'
                                                    : 'bg-white border border-gray-100 text-gray-900 w-full'
                                                    }`}
                                                style={{
                                                    alignSelf:
                                                        msg.role === 'user' ? 'flex-end' : 'flex-start',
                                                    width:
                                                        msg.role === 'user'
                                                            ? 'auto'
                                                            : '100%', // assistant fills width, user shrinks
                                                }}
                                            >
                                                {msg.isLoading ? (
                                                    <span className="text-sm text-gray-400">Typing...</span>
                                                ) : msg.role === 'assistant' ? (
                                                    <div className="prose prose-slate max-w-none">
                                                        <ReactMarkdown
                                                            remarkPlugins={[remarkGfm, remarkMath]}
                                                            rehypePlugins={[rehypeKatex, rehypeHighlight]}
                                                            components={MarkdownComponents}
                                                        >
                                                            {msg.content}
                                                        </ReactMarkdown>
                                                    </div>
                                                ) : (
                                                    <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </>
                        )}
                    </div>
                </div>

                {/* Fixed Input Area */}
                <div className="flex-shrink-0 border-t border-gray-200 bg-gray-50 p-4">
                    <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                        <textarea
                            ref={textareaRef}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask a question about this document..."
                            rows={1}
                            style={{ maxHeight: '150px' }}
                            className="flex-1 resize-none border border-gray-300 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                            type="submit"
                            disabled={!message.trim() || agentStates.chat.loading}
                            className="px-5 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold hover:scale-105 transition-all"
                        >
                            <Send className="w-4 h-4 inline-block mr-1" />
                            Send
                        </button>
                    </form>
                    <p className="text-xs text-gray-500 text-center mt-2">
                        Press <kbd className="px-1 bg-gray-200 rounded">Enter</kbd> to send,{' '}
                        <kbd className="px-1 bg-gray-200 rounded">Shift+Enter</kbd> for new line
                    </p>
                </div>
            </div>
        </div>
    );







}
