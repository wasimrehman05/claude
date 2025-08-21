import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { Copy, Check, FileCode2, ExternalLink, ThumbsUp, ThumbsDown, User } from 'lucide-react';
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

    return (
        <div className="space-y-6">
            {messages.map((message, index) => {
                const messageArtifacts = getMessageArtifacts(index);

                return (
                    <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="group"
                    >
                        {message.role === 'user' ? (
                            <div className="flex items-start gap-3">
                                <div className="flex-1 min-w-0">
                                    <div
                                        className="inline-block px-3 py-2 rounded-lg"
                                        style={{
                                            backgroundColor: '#141413'
                                        }}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium" style={{ backgroundColor: '#C2C0B6', color: '#000000', borderRadius: '50%', padding: '4px 4px' }}>
                                                <User />
                                            </span>
                                            <span className="text-sm" style={{ color: '#ffffff' }}>
                                                {message.text}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-start gap-3">
                                <div className="flex-1 min-w-0 space-y-3">
                                    <div className="prose prose-claude max-w-none" style={{ color: '#ffffff' }}>
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                            rehypePlugins={[rehypeHighlight]}
                                            components={{
                                                pre: ({ children, ...props }) => (
                                                    <div
                                                        className="relative rounded-lg overflow-hidden my-4"
                                                        style={{
                                                            backgroundColor: '#262626',
                                                            border: '1px solid #404040'
                                                        }}
                                                    >
                                                        <div className="flex items-center justify-between px-4 py-2.5 border-b"
                                                            style={{ borderColor: '#404040' }}>
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-medium" style={{ color: '#ffffff' }}>
                                                                    {message.artifactTitle || 'Code'}
                                                                </span>
                                                                <span className="text-xs" style={{ color: '#a0a0a0' }}>
                                                                    Code
                                                                </span>
                                                            </div>
                                                            <button
                                                                onClick={() => copyToClipboard(message.text, message.id)}
                                                                className="p-1 rounded hover:bg-gray-700 transition-colors"
                                                                style={{ color: '#a0a0a0' }}
                                                            >
                                                                {copiedId === message.id ? (
                                                                    <Check className="w-4 h-4" />
                                                                ) : (
                                                                    <Copy className="w-4 h-4" />
                                                                )}
                                                            </button>
                                                        </div>
                                                        <div
                                                            className="p-4"
                                                            style={{ backgroundColor: '#0d1117' }}
                                                        >
                                                            <pre {...props} className="text-sm text-white font-mono">
                                                                {children}
                                                            </pre>
                                                        </div>
                                                    </div>
                                                ),
                                                p: ({ children, ...props }) => (
                                                    <p {...props} className="text-sm leading-relaxed mb-3" style={{ color: '#ffffff' }}>
                                                        {children}
                                                    </p>
                                                ),
                                                h1: ({ children, ...props }) => (
                                                    <h1 {...props} className="text-2xl font-bold mb-4" style={{ color: '#ffffff' }}>
                                                        {children}
                                                    </h1>
                                                ),
                                                h2: ({ children, ...props }) => (
                                                    <h2 {...props} className="text-xl font-semibold mb-3" style={{ color: '#ffffff' }}>
                                                        {children}
                                                    </h2>
                                                ),
                                                h3: ({ children, ...props }) => (
                                                    <h3 {...props} className="text-lg font-medium mb-2" style={{ color: '#ffffff' }}>
                                                        {children}
                                                    </h3>
                                                ),
                                                ul: ({ children, ...props }) => (
                                                    <ul {...props} className="list-disc list-inside mb-3 space-y-1" style={{ color: '#ffffff' }}>
                                                        {children}
                                                    </ul>
                                                ),
                                                ol: ({ children, ...props }) => (
                                                    <ol {...props} className="list-decimal list-inside mb-3 space-y-1" style={{ color: '#ffffff' }}>
                                                        {children}
                                                    </ol>
                                                ),
                                                li: ({ children, ...props }) => (
                                                    <li {...props} className="text-sm" style={{ color: '#ffffff' }}>
                                                        {children}
                                                    </li>
                                                ),
                                                strong: ({ children, ...props }) => (
                                                    <strong {...props} className="font-semibold" style={{ color: '#ffffff' }}>
                                                        {children}
                                                    </strong>
                                                ),
                                                em: ({ children, ...props }) => (
                                                    <em {...props} className="italic" style={{ color: '#ffffff' }}>
                                                        {children}
                                                    </em>
                                                ),
                                                code: ({ children, ...props }) => (
                                                    <code {...props} className="px-1 py-0.5 rounded text-sm font-mono" style={{ backgroundColor: '#262626', color: '#ffffff' }}>
                                                        {children}
                                                    </code>
                                                ),
                                                blockquote: ({ children, ...props }) => (
                                                    <blockquote {...props} className="border-l-4 pl-4 my-3 italic" style={{ borderColor: '#404040', color: '#d1d5db' }}>
                                                        {children}
                                                    </blockquote>
                                                )
                                            }}
                                        >
                                            {message.displayText || message.text}
                                        </ReactMarkdown>
                                    </div>

                                    {message.role === 'assistant' && messageArtifacts.length > 0 && (
                                        <div className="mt-4">
                                            <motion.button
                                                onClick={() => onSelectMessage?.(message.id)}
                                                className={clsx(
                                                    "flex items-center gap-3 w-full p-3 rounded-lg border transition-all duration-200 text-left",
                                                    selectedMessageId === message.id
                                                        ? "bg-orange-900/20 border-orange-500/30 shadow-sm"
                                                        : "bg-gray-800/50 border-gray-600 hover:border-gray-500 hover:bg-gray-800/70"
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
                                                        <h4 className="font-medium text-sm truncate" style={{ color: 'var(--claude-chat-text)' }}>
                                                            {message.artifactTitle || (
                                                                messageArtifacts.length === 1
                                                                    ? messageArtifacts[0].filename
                                                                    : `${messageArtifacts.length} files`
                                                            )}
                                                        </h4>
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-xs" style={{ color: 'var(--claude-chat-text-secondary)' }}>
                                                            Interactive Artifact • {messageArtifacts.length} file{messageArtifacts.length !== 1 ? 's' : ''}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex-shrink-0">
                                                    <ExternalLink className="w-4 h-4" style={{ color: 'var(--claude-chat-text-secondary)' }} />
                                                </div>
                                            </motion.button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </motion.div>
                );
            })}
            {
                messages.length > 0 && (
                    <div className="flex flex-col justify-center items-end gap-1">
                        <div className="flex gap-3 pt-2">
                            <div className="flex items-center gap-2">
                                <button className="p-1 rounded hover:bg-gray-700 transition-colors" style={{ color: '#a0a0a0' }}>
                                    <ThumbsUp className="w-4 h-4" />
                                </button>
                                <button className="p-1 rounded hover:bg-gray-700 transition-colors" style={{ color: '#a0a0a0' }}>
                                    <ThumbsDown className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="flex items-center gap-1">
                                <button className="flex items-center gap-1 text-sm hover:bg-gray-700 px-2 py-1 rounded transition-colors" style={{ color: '#a0a0a0' }}>
                                    <span>Retry</span>
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                        <p className="text-xs" style={{ color: '#666666' }}>
                            Claude can make mistakes. Please double-check responses.
                        </p>
                    </div>
                )
            }
        </div>
    );
}