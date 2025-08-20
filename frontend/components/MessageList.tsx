import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { User, Bot, Copy, Check, FileCode2, ExternalLink } from 'lucide-react';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';

type Message = {
    id: string;
    role: 'user' | 'assistant' | 'system';
    text: string;
    artifactIds?: string[];
    displayText?: string;
    artifactTitle?: string;
};

export type Artifact = {
    id?: string;
    filename: string;
    language?: string;
    content: string;
    updatedAt?: string;
    isNew?: boolean;
};

interface MessageListProps {
    messages: Message[];
    artifacts?: Artifact[];
    onSelectMessage?: (messageId: string) => void;
    selectedMessageId?: string | null;
}

export default function MessageList({
    messages,
    artifacts = [],
    onSelectMessage,
    selectedMessageId
}: MessageListProps) {
    const [copiedId, setCopiedId] = React.useState<string | null>(null);

    const copyToClipboard = async (text: string, messageId: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedId(messageId);
            setTimeout(() => setCopiedId(null), 2000);
        } catch (err) {
            console.error('Failed to copy text:', err);
        }
    };


    const getMessageArtifacts = (messageIndex: number) => {
        if (!artifacts || artifacts.length === 0) return [];

        const message = messages[messageIndex];
        if (message.role !== 'assistant') return [];


        if (message.artifactIds && message.artifactIds.length > 0) {
            const messageArtifacts = artifacts.filter(artifact =>
                message.artifactIds!.includes(artifact.id!)
            );



            return messageArtifacts;
        }

        return [];
    };

    if (messages.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
                <div className="max-w-lg mx-auto">
                    <div
                        className="w-14 h-14 mx-auto mb-6 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                        style={{ backgroundColor: 'var(--claude-accent)' }}
                    >
                        C
                    </div>
                    <h2
                        className="text-2xl font-medium mb-3 tracking-tight"
                        style={{ color: 'var(--claude-chat-text)' }}
                    >
                        Hello, I'm Claude
                    </h2>
                    <p
                        className="text-base leading-relaxed mb-6"
                        style={{ color: 'var(--claude-chat-text-secondary)' }}
                    >
                        I'm an AI assistant created by Anthropic. I can help you with coding, writing, analysis, math, and much more.
                    </p>
                    <div
                        className="text-left rounded-lg p-4"
                        style={{
                            backgroundColor: 'var(--claude-chat-surface)',
                            border: `1px solid var(--claude-chat-border)`
                        }}
                    >
                        <p
                            className="text-sm mb-2 font-medium"
                            style={{ color: 'var(--claude-chat-text)' }}
                        >
                            Try asking me to:
                        </p>
                        <ul
                            className="text-sm space-y-1"
                            style={{ color: 'var(--claude-chat-text-secondary)' }}
                        >
                            <li>• Create a complete web application</li>
                            <li>• Write and explain code in any language</li>
                            <li>• Analyze data and create visualizations</li>
                            <li>• Help with debugging and optimization</li>
                        </ul>
                    </div>



                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col">
            {messages.map((message, index) => (
                <div key={message.id} className="group">
                    <div
                        className="px-6 py-6 border-b"
                        style={{
                            borderColor: 'var(--claude-chat-border)'
                        }}
                    >
                        <div className="max-w-5xl mx-auto flex gap-4"
                            style={{
                                backgroundColor: message.role === 'user'
                                    ? 'var(--claude-chat-surface)'
                                    : 'var(--claude-chat-bg)',
                                // borderRadius:  '10px 10px 10px 10px'
                            }}
                        >
                            {/* Avatar */}
                            <div className="flex-shrink-0">
                                <div className={clsx(
                                    "w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm",
                                    message.role === 'user'
                                        ? "bg-blue-500"
                                        : ""
                                )}

                                >
                                    {message.role === 'user' && (
                                        <User className="w-4 h-4" />
                                    )}
                                </div>
                            </div>

                            {/* Message Content */}
                            <div className="flex-1 min-w-0 relative">
                                {message.role === 'user' ? (
                                    <div
                                        className="text-base leading-relaxed"
                                        style={{ color: 'var(--claude-chat-text)' }}
                                    >
                                        {message.text}
                                    </div>
                                ) : (
                                    <div
                                        className="prose prose-claude max-w-none"
                                        style={{
                                            color: 'var(--claude-chat-text)',
                                            fontSize: '15px',
                                            lineHeight: '1.6'
                                        }}
                                    >
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                            rehypePlugins={[rehypeHighlight]}
                                            components={{
                                                code: ({ inline, className, children, ...props }: any) => {
                                                    const match = /language-(\w+)/.exec(className || '');
                                                    const language = match ? match[1] : '';

                                                    if (!inline && language) {
                                                        return (
                                                            <div className="relative my-4">
                                                                <div
                                                                    className="flex justify-between items-center px-4 py-2 rounded-t-lg text-sm"
                                                                    style={{
                                                                        backgroundColor: '#2d3748',
                                                                        color: 'white'
                                                                    }}
                                                                >
                                                                    <span className="font-mono text-gray-300">{language}</span>
                                                                    <button
                                                                        onClick={() => copyToClipboard(String(children), `${message.id}-${language}`)}
                                                                        className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                                                                    >
                                                                        {copiedId === `${message.id}-${language}` ? (
                                                                            <>
                                                                                <Check className="w-3 h-3" />
                                                                                Copied
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <Copy className="w-3 h-3" />
                                                                                Copy
                                                                            </>
                                                                        )}
                                                                    </button>
                                                                </div>
                                                                <pre
                                                                    className="p-4 rounded-b-lg overflow-x-auto font-mono text-sm"
                                                                    style={{
                                                                        backgroundColor: '#1a202c',
                                                                        color: '#e2e8f0'
                                                                    }}
                                                                >
                                                                    <code {...props}>{children}</code>
                                                                </pre>
                                                            </div>
                                                        );
                                                    }
                                                    return (
                                                        <code
                                                            className="px-1.5 py-0.5 rounded font-mono text-sm"
                                                            style={{
                                                                backgroundColor: 'var(--claude-code-bg)',
                                                                color: 'var(--claude-text-primary)'
                                                            }}
                                                            {...props}
                                                        >
                                                            {children}
                                                        </code>
                                                    );
                                                },
                                                p: ({ children }) => (
                                                    <p
                                                        className="mb-4 last:mb-0"
                                                        style={{ color: 'var(--claude-text-primary)' }}
                                                    >
                                                        {children}
                                                    </p>
                                                ),
                                                h1: ({ children }) => (
                                                    <h1
                                                        className="text-xl font-semibold mb-4 mt-6 first:mt-0"
                                                        style={{ color: 'var(--claude-text-primary)' }}
                                                    >
                                                        {children}
                                                    </h1>
                                                ),
                                                h2: ({ children }) => (
                                                    <h2
                                                        className="text-lg font-semibold mb-3 mt-5 first:mt-0"
                                                        style={{ color: 'var(--claude-text-primary)' }}
                                                    >
                                                        {children}
                                                    </h2>
                                                ),
                                                h3: ({ children }) => (
                                                    <h3
                                                        className="text-base font-semibold mb-2 mt-4 first:mt-0"
                                                        style={{ color: 'var(--claude-text-primary)' }}
                                                    >
                                                        {children}
                                                    </h3>
                                                ),
                                                ul: ({ children }) => (
                                                    <ul
                                                        className="list-disc list-inside mb-4 space-y-1"
                                                        style={{ color: 'var(--claude-text-primary)' }}
                                                    >
                                                        {children}
                                                    </ul>
                                                ),
                                                ol: ({ children }) => (
                                                    <ol
                                                        className="list-decimal list-inside mb-4 space-y-1"
                                                        style={{ color: 'var(--claude-text-primary)' }}
                                                    >
                                                        {children}
                                                    </ol>
                                                ),
                                                blockquote: ({ children }) => (
                                                    <blockquote
                                                        className="border-l-4 pl-4 my-4 italic"
                                                        style={{
                                                            borderColor: 'var(--claude-accent)',
                                                            color: 'var(--claude-text-secondary)'
                                                        }}
                                                    >
                                                        {children}
                                                    </blockquote>
                                                ),
                                                table: ({ children }) => (
                                                    <div className="overflow-x-auto my-4">
                                                        <table
                                                            className="min-w-full divide-y"
                                                            style={{ borderColor: 'var(--claude-border)' }}
                                                        >
                                                            {children}
                                                        </table>
                                                    </div>
                                                ),
                                                th: ({ children }) => (
                                                    <th
                                                        className="px-3 py-2 text-left text-sm font-medium"
                                                        style={{
                                                            backgroundColor: 'var(--claude-code-bg)',
                                                            color: 'var(--claude-text-primary)',
                                                            borderColor: 'var(--claude-border)'
                                                        }}
                                                    >
                                                        {children}
                                                    </th>
                                                ),
                                                td: ({ children }) => (
                                                    <td
                                                        className="px-3 py-2 text-sm border-b"
                                                        style={{
                                                            color: 'var(--claude-text-primary)',
                                                            borderColor: 'var(--claude-border)'
                                                        }}
                                                    >
                                                        {children}
                                                    </td>
                                                ),
                                            }}
                                        >
                                            {message.displayText || message.text}
                                        </ReactMarkdown>
                                    </div>
                                )}

                                {/* Interactive Artifacts */}
                                {message.role === 'assistant' && (() => {
                                    const messageArtifacts = getMessageArtifacts(index);
                                    if (messageArtifacts.length === 0) return null;

                                    return (
                                        <div className="mt-4">
                                            <motion.button
                                                onClick={() => onSelectMessage?.(message.id)}
                                                className={clsx(
                                                    "flex items-center gap-3 w-full p-3 rounded-lg border transition-all duration-200 text-left",
                                                    selectedMessageId === message.id
                                                        ? "bg-orange-50 border-orange-200 shadow-sm"
                                                        : "bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm"
                                                )}
                                                whileHover={{ scale: 1.01 }}
                                                whileTap={{ scale: 0.99 }}
                                            >
                                                <div className="flex-shrink-0">
                                                    <div
                                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
                                                        style={{ backgroundColor: 'var(--claude-accent)' }}
                                                    >
                                                        <FileCode2 className="w-4 h-4" />
                                                    </div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <h4
                                                            className="font-medium text-sm truncate text-gray-800"
                                                        >
                                                            {message.artifactTitle || (
                                                                messageArtifacts.length === 1
                                                                    ? messageArtifacts[0].filename
                                                                    : `${messageArtifacts.length} files`
                                                            )}
                                                        </h4>
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span
                                                            className="text-xs text-gray-500"
                                                        >
                                                            Interactive Artifact • {messageArtifacts.length} file{messageArtifacts.length !== 1 ? 's' : ''}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex-shrink-0">
                                                    <ExternalLink className="w-4 h-4 text-gray-400" />
                                                </div>
                                            </motion.button>

                                        </div>
                                    );
                                })()}

                                {/* Copy button for assistant messages */}
                                {message.role === 'assistant' && (
                                    <button
                                        onClick={() => copyToClipboard(message.text, message.id)}
                                        className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-gray-100"
                                        title="Copy message"
                                    >
                                        {copiedId === message.id ? (
                                            <Check className="w-4 h-4 text-green-600" />
                                        ) : (
                                            <Copy className="w-4 h-4 text-gray-500" />
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}