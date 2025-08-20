import React, { useEffect, useRef, useState, useCallback } from 'react';
import Head from 'next/head';
import ChatInput from '../components/ChatInput';
import MessageList from '../components/MessageList';
import ArtifactViewer, { Artifact } from '../components/ArtifactViewer';
import { Loader2, Copy, X } from 'lucide-react';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import { separateTextFromCode } from '../utils/messageParser';
import { extractArtifactTitle, generateFallbackTitle } from '../utils/titleExtractor';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type Message = {
    id: string;
    role: 'user' | 'assistant' | 'system';
    text: string;
    artifactIds?: string[];  // Track which artifacts belong to this message
    displayText?: string;    // Text to display (without code blocks)
    artifactTitle?: string;  // Extracted title for the artifacts
};

export default function Home() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [isStreaming, setIsStreaming] = useState(false);
    const [artifacts, setArtifacts] = useState<Artifact[]>([]);
    const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
    const [artifactViewerOpen, setArtifactViewerOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const eventsRef = useRef<EventSource | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);


    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);


    useEffect(() => {
        if (artifacts.length > 0 && !artifactViewerOpen && !selectedMessageId) {

            const firstArtifact = artifacts[0];
            const owningMessage = messages.find(msg =>
                msg.artifactIds?.includes(firstArtifact.id!)
            );
            if (owningMessage) {
                setSelectedMessageId(owningMessage.id);
                setArtifactViewerOpen(true);
            }
        }
    }, [artifacts.length, artifactViewerOpen, selectedMessageId, messages]);

    const startStream = useCallback(async (sid: string) => {
        const streamUrl = `${API_BASE}/api/v1/stream/${sid}`;

        try {
            const es = new EventSource(streamUrl);
            eventsRef.current = es;
            setIsStreaming(true);


            const assistantMessageId = `msg-${Date.now()}`;
            let assistantMessage = {
                id: assistantMessageId,
                role: 'assistant' as const,
                text: '',
                displayText: '',
                artifactIds: []
            };
            setMessages(prev => [...prev, assistantMessage]);

            es.addEventListener('delta', (ev: MessageEvent) => {
                try {
                    const d = JSON.parse(ev.data);
                    const delta = d.delta;
                    setMessages(prev =>
                        prev.map(msg => {
                            if (msg.id === assistantMessageId) {
                                const fullText = msg.text + delta;
                                const { displayText, hasCodeBlocks } = separateTextFromCode(fullText);
                                return {
                                    ...msg,
                                    text: fullText,
                                    displayText: displayText
                                };
                            }
                            return msg;
                        })
                    );
                } catch (e) {
                    console.error('Error parsing delta:', e);
                }
            });

            es.addEventListener('artifact', (ev: MessageEvent) => {
                try {
                    const d = JSON.parse(ev.data);
                    const artifact: Artifact = d.artifact;



                    const artifactId = `artifact-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;


                    setArtifacts(prev => {
                        const newArtifact = {
                            ...artifact,
                            id: artifactId,
                            isNew: true,
                            updatedAt: new Date().toISOString()
                        };
                        return [...prev, newArtifact];
                    });


                    setMessages(prev =>
                        prev.map(msg => {
                            if (msg.id === assistantMessageId) {
                                const currentArtifactIds = msg.artifactIds || [];
                                if (!currentArtifactIds.includes(artifactId)) {
                                    return {
                                        ...msg,
                                        artifactIds: [...currentArtifactIds, artifactId]
                                    };
                                }
                            }
                            return msg;
                        })
                    );
                } catch (e) {
                    console.error('Error parsing artifact:', e);
                }
            });

            es.addEventListener('done', () => {
                setIsStreaming(false);
                es.close();
                eventsRef.current = null;


                setArtifacts(currentArtifacts => {
                    setMessages(prev =>
                        prev.map(msg => {
                            if (msg.id === assistantMessageId && msg.artifactIds && msg.artifactIds.length > 0) {

                                const extractedTitle = extractArtifactTitle(msg.text);


                                const artifactTitle = extractedTitle || (() => {
                                    const messageArtifacts = currentArtifacts.filter(a =>
                                        msg.artifactIds!.includes(a.id!)
                                    );
                                    return generateFallbackTitle(messageArtifacts);
                                })();

                                return {
                                    ...msg,
                                    artifactTitle
                                };
                            }
                            return msg;
                        })
                    );
                    return currentArtifacts; // Return unchanged artifacts
                });
            });

            es.addEventListener('error', (error) => {
                console.error('EventSource error:', error);
                setIsStreaming(false);
                es.close();
                eventsRef.current = null;
            });

        } catch (error) {
            console.error('Error starting stream:', error);
            setError('Failed to start response stream');
            setIsStreaming(false);
        }
    }, []);

    const stopStream = useCallback(() => {
        if (eventsRef.current) {
            eventsRef.current.close();
            eventsRef.current = null;
            setIsStreaming(false);
        }
    }, []);

    const sendMessage = useCallback(async (messageText: string) => {
        try {
            setError(null);


            const userMessage: Message = {
                id: `msg-${Date.now()}`,
                role: 'user',
                text: messageText
            };
            setMessages(prev => [...prev, userMessage]);


            const res = await fetch(`${API_BASE}/api/v1/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId, message: messageText })
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error?.message || `HTTP ${res.status}`);
            }

            const body = await res.json();
            const sid = body.sessionId;
            setSessionId(sid);


            await startStream(sid);

        } catch (error) {
            console.error('Error sending message:', error);
            setError(error instanceof Error ? error.message : 'Failed to send message');
            setIsStreaming(false);
        }
    }, [sessionId, startStream]);

    const handleUpdateArtifact = useCallback((artifactId: string, newContent: string) => {
        setArtifacts(prev =>
            prev.map((artifact) =>
                artifact.id === artifactId
                    ? { ...artifact, content: newContent }
                    : artifact
            )
        );
    }, []);

    const handleSelectMessage = useCallback((messageId: string) => {
        setSelectedMessageId(messageId);
        setArtifactViewerOpen(true);
    }, []);


    const selectedMessage = selectedMessageId
        ? messages.find(msg => msg.id === selectedMessageId)
        : null;


    const getMessageArtifacts = useCallback((): Artifact[] => {
        if (!selectedMessageId || !selectedMessage) return [];

        if (!selectedMessage.artifactIds || selectedMessage.artifactIds.length === 0) {
            return [];
        }


        return artifacts.filter(artifact =>
            artifact.id && selectedMessage.artifactIds!.includes(artifact.id)
        );
    }, [selectedMessageId, selectedMessage, artifacts]);

    const messageArtifacts = getMessageArtifacts();
    const selectedArtifact = messageArtifacts.length > 0 ? messageArtifacts[0] : null;

    return (
        <>
            <Head>
                <title>Claude</title>
                <meta name="description" content="AI assistant by Anthropic" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <link rel="icon" href="/favicon.ico" />
            </Head>

            <div className="h-screen flex" style={{ backgroundColor: 'var(--claude-chat-bg)', width: '100vw' }}>
                                {/* Left Chat Panel - Dark Theme */}
                <div className={clsx(
                    "flex flex-col transition-all duration-300",
                    artifactViewerOpen ? "w-3/5" : "w-full"
                )}
                style={{ 
                    backgroundColor: 'var(--claude-chat-bg)'
                }}>
                    {/* Chat Header */}
                                        <header 
                        className="flex-shrink-0 px-6 py-4"
                        style={{ 
                            backgroundColor: 'var(--claude-chat-bg)'
                        }}
                    >
                        <div className="flex items-center gap-3">
                            <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                                style={{ backgroundColor: 'var(--claude-accent)' }}
                            >
                                C
                            </div>
                            <h1
                                className="text-lg font-medium tracking-tight"
                                style={{ color: 'var(--claude-chat-text)' }}
                            >
                                Claude
                            </h1>
                        </div>
                    </header>

                    {/* Error Banner */}
                    {error && (
                        <div className="bg-red-50 border-b border-red-200 px-4 py-3">
                            <div className="max-w-4xl mx-auto flex items-center gap-2 text-red-800 text-sm">
                                <span className="font-medium">Error:</span>
                                <span>{error}</span>
                                <button
                                    onClick={() => setError(null)}
                                    className="ml-auto text-red-600 hover:text-red-800 text-lg"
                                >
                                    ×
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Chat Messages */}
                    <div className="flex-1 overflow-y-auto scrollbar-thin">
                        <div className="min-h-full">
                            <MessageList
                                messages={messages}
                                artifacts={artifacts}
                                onSelectMessage={handleSelectMessage}
                                selectedMessageId={selectedMessageId}
                            />
                            {isStreaming && (
                                <div className="flex justify-center py-4">
                                    <div className="flex items-center gap-2 text-gray-500">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span className="text-sm">Claude is thinking...</span>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    </div>

                    {/* Chat Input */}
                    <ChatInput
                        onSend={sendMessage}
                        isSending={isStreaming}
                        onStop={stopStream}
                    />
                </div>

                {/* Right Artifact Panel */}
                <AnimatePresence>
                    {artifactViewerOpen && selectedArtifact && (
                        <motion.div
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: 'auto', opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                            className="hidden lg:flex flex-col w-2/5"
                            style={{ backgroundColor: 'var(--claude-artifact-bg)' }}
                        >
                            {/* Artifact Header */}
                            <div
                                className="flex items-center justify-between px-6 py-4 border-b"
                                style={{
                                    backgroundColor: 'var(--claude-artifact-header-bg)',
                                    borderColor: 'var(--claude-artifact-border)'
                                }}
                            >
                                <div className="flex items-center gap-3">

                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border hover:bg-gray-50 transition-colors"
                                        style={{
                                            borderColor: 'var(--claude-artifact-border)',
                                            color: 'var(--claude-artifact-text-secondary)'
                                        }}
                                    >
                                        <Copy className="w-4 h-4" />
                                        Copy
                                    </button>
                                    <button
                                        className="flex items-center gap-2 px-3 py-1.5 text-sm text-white rounded-lg transition-colors"
                                        style={{ backgroundColor: 'var(--claude-accent)' }}
                                    >
                                        Publish
                                    </button>
                                    <button
                                        onClick={() => setArtifactViewerOpen(false)}
                                        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                                        style={{ color: 'var(--claude-artifact-text-secondary)' }}
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <ArtifactViewer
                                artifact={selectedArtifact}
                                allArtifacts={messageArtifacts}
                                title={selectedMessage?.artifactTitle}
                                onClose={() => setArtifactViewerOpen(false)}
                                onUpdateArtifact={handleUpdateArtifact}
                                onSelectArtifact={(artifactId) => {

                                }}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Mobile Artifact Overlay */}
                <AnimatePresence>
                    {artifactViewerOpen && selectedArtifact && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="lg:hidden fixed inset-0 z-50 bg-black bg-opacity-50"
                            onClick={() => setArtifactViewerOpen(false)}
                        >
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.95, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="absolute inset-4 bg-white rounded-lg shadow-2xl overflow-hidden"
                                onClick={(e) => e.stopPropagation()}
                                style={{ backgroundColor: 'var(--claude-surface)' }}
                            >
                                <ArtifactViewer
                                    artifact={selectedArtifact}
                                    allArtifacts={messageArtifacts}
                                    title={selectedMessage?.artifactTitle}
                                    onClose={() => setArtifactViewerOpen(false)}
                                    onUpdateArtifact={handleUpdateArtifact}
                                    onSelectArtifact={() => { }}
                                />
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </>
    );
}