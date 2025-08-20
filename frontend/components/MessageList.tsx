import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { User, Bot, Copy, Check, FileCode2, ExternalLink, Star, Bookmark, ThumbsUp, ThumbsDown, RotateCcw } from 'lucide-react';
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
                        <p className="text-sm" style={{ color: 'var(--claude-chat-text-secondary)' }}>
                            <strong>Claude can make mistakes.</strong> Please double-check responses.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {messages.map((message, index) => {
                const messageArtifacts = getMessageArtifacts(index);
                const hasCodeBlocks = message.text.includes('```');

                return (
                    <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="group"
                    >
                        {message.role === 'user' ? (
                            // User Message
                            <div className="flex items-start gap-3">
                                <div
                                    className="w-8 h-8 rounded-full flex items-center justify-center text-white font-medium text-sm flex-shrink-0"
                                    style={{ backgroundColor: '#404040' }}
                                >
                                    WR
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div
                                        className="inline-block px-4 py-2 rounded-2xl"
                                        style={{
                                            backgroundColor: 'var(--claude-chat-surface)',
                                            border: `1px solid var(--claude-chat-border)`
                                        }}
                                    >
                                        <p className="text-sm" style={{ color: 'var(--claude-chat-text)' }}>
                                            {message.text}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            // Assistant Message
                            <div className="flex items-start gap-3">
                                <div
                                    className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                                    style={{ backgroundColor: 'var(--claude-accent)' }}
                                >
                                    C
                                </div>
                                <div className="flex-1 min-w-0 space-y-4">
                                    {/* Message Content */}
                                    <div className="prose prose-claude max-w-none">
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                            rehypePlugins={[rehypeHighlight]}
                                            components={{
                                                pre: ({ children, ...props }) => (
                                                    <div
                                                        className="relative rounded-lg overflow-hidden my-4"
                                                        style={{
                                                            backgroundColor: 'var(--claude-chat-surface)',
                                                            border: `1px solid var(--claude-chat-border)`
                                                        }}
                                                    >
                                                        <div className="flex items-center justify-between px-4 py-2 border-b"
                                                            style={{ borderColor: 'var(--claude-chat-border)' }}>
                                                            <span className="text-sm font-medium" style={{ color: 'var(--claude-chat-text)' }}>
                                                                {message.artifactTitle || 'Code'}
                                                            </span>
                                                            <button
                                                                onClick={() => copyToClipboard(message.text, message.id)}
                                                                className="p-1 rounded hover:bg-gray-700 transition-colors"
                                                                style={{ color: 'var(--claude-chat-text-secondary)' }}
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
                                                    <p {...props} className="text-sm leading-relaxed" style={{ color: 'var(--claude-chat-text)' }}>
                                                        {children}
                                                    </p>
                                                )
                                            }}
                                        >
                                            {message.displayText || message.text}
                                        </ReactMarkdown>
                                    </div>

                                    {/* Interactive Artifact Button */}
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

                                    {/* Message Actions */}
                                    <div className="flex items-center gap-4 pt-2">
                                        <div className="flex items-center gap-1">
                                            <Star className="w-4 h-4" style={{ color: 'var(--claude-accent)' }} />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button className="p-1 rounded hover:bg-gray-700 transition-colors" style={{ color: 'var(--claude-chat-text-secondary)' }}>
                                                <Bookmark className="w-4 h-4" />
                                            </button>
                                            <button className="p-1 rounded hover:bg-gray-700 transition-colors" style={{ color: 'var(--claude-chat-text-secondary)' }}>
                                                <ThumbsUp className="w-4 h-4" />
                                            </button>
                                            <button className="p-1 rounded hover:bg-gray-700 transition-colors" style={{ color: 'var(--claude-chat-text-secondary)' }}>
                                                <ThumbsDown className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button className="flex items-center gap-1 text-sm hover:bg-gray-700 px-2 py-1 rounded transition-colors" style={{ color: 'var(--claude-chat-text-secondary)' }}>
                                                <span>Retry</span>
                                                <RotateCcw className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Disclaimer */}
                                    <p className="text-xs" style={{ color: 'var(--claude-chat-text-muted)' }}>
                                        Claude can make mistakes. Please double-check responses.
                                    </p>
                                </div>
                            </div>
                        )}
                    </motion.div>
                );
            })}
        </div>
    );
}