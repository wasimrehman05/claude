import React, { useEffect, useRef, useState, useCallback } from 'react';
import Head from 'next/head';
import ChatInput from '../components/ChatInput';
import MessageList from '../components/MessageList';
import ArtifactViewer, { Artifact } from '../components/ArtifactViewer';
import { Loader2, Copy, X, Star } from 'lucide-react';
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

            <div className="h-screen flex justify-center w-screen px-8" style={{ backgroundColor: 'var(--claude-chat-bg)' }}>
                {/* Left Chat Panel - Dark Theme */}
                <div className={clsx(
                    "flex flex-col transition-all duration-300",
                    artifactViewerOpen ? "flex-1 max-w-4xl" : "w-full max-w-4xl"
                )}
                    style={{
                        backgroundColor: 'var(--claude-chat-bg)',
                        borderRight: artifactViewerOpen ? `1px solid var(--claude-chat-border)` : 'none'
                    }}>

                    {messages.length === 0 ? (
                        // Landing Page Layout
                        <div className="flex flex-col h-full justify-center">
                            {/* Top Section - Free Plan Button */}
                            <div className="flex justify-center pb-4">
                                <button className="px-4 py-2 rounded-lg text-sm transition-colors"
                                    style={{
                                        backgroundColor: '#262626',
                                        color: '#a0a0a0',
                                        border: '1px solid #404040'
                                    }}>
                                    <span>Free plan</span>
                                    <span className="inline-block w-2 h-2 rounded-full bg-green-500 ml-2 mr-2"></span>
                                    <span className="text-blue-400 underline">Upgrade</span>
                                </button>
                            </div>

                            {/* Greeting Message */}
                            <div className="flex items-center justify-center gap-3 mb-4">
                                <svg
                                    height="3em"
                                    style={{
                                        flex: "none",
                                        lineHeight: 1,
                                    }}
                                    viewBox="0 0 24 24"
                                    width="3em"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <title>{"Claude"}</title>
                                    <path
                                        d="M4.709 15.955l4.72-2.647.08-.23-.08-.128H9.2l-.79-.048-2.698-.073-2.339-.097-2.266-.122-.571-.121L0 11.784l.055-.352.48-.321.686.06 1.52.103 2.278.158 1.652.097 2.449.255h.389l.055-.157-.134-.098-.103-.097-2.358-1.596-2.552-1.688-1.336-.972-.724-.491-.364-.462-.158-1.008.656-.722.881.06.225.061.893.686 1.908 1.476 2.491 1.833.365.304.145-.103.019-.073-.164-.274-1.355-2.446-1.446-2.49-.644-1.032-.17-.619a2.97 2.97 0 01-.104-.729L6.283.134 6.696 0l.996.134.42.364.62 1.414 1.002 2.229 1.555 3.03.456.898.243.832.091.255h.158V9.01l.128-1.706.237-2.095.23-2.695.08-.76.376-.91.747-.492.584.28.48.685-.067.444-.286 1.851-.559 2.903-.364 1.942h.212l.243-.242.985-1.306 1.652-2.064.73-.82.85-.904.547-.431h1.033l.76 1.129-.34 1.166-1.064 1.347-.881 1.142-1.264 1.7-.79 1.36.073.11.188-.02 2.856-.606 1.543-.28 1.841-.315.833.388.091.395-.328.807-1.969.486-2.309.462-3.439.813-.042.03.049.061 1.549.146.662.036h1.622l3.02.225.79.522.474.638-.079.485-1.215.62-1.64-.389-3.829-.91-1.312-.329h-.182v.11l1.093 1.068 2.006 1.81 2.509 2.33.127.578-.322.455-.34-.049-2.205-1.657-.851-.747-1.926-1.62h-.128v.17l.444.649 2.345 3.521.122 1.08-.17.353-.608.213-.668-.122-1.374-1.925-1.415-2.167-1.143-1.943-.14.08-.674 7.254-.316.37-.729.28-.607-.461-.322-.747.322-1.476.389-1.924.315-1.53.286-1.9.17-.632-.012-.042-.14.018-1.434 1.967-2.18 2.945-1.726 1.845-.414.164-.717-.37.067-.662.401-.589 2.388-3.036 1.44-1.882.93-1.086-.006-.158h-.055L4.132 18.56l-1.13.146-.487-.456.061-.746.231-.243 1.908-1.312-.006.006z"
                                        fill="#D97757"
                                        fillRule="nonzero"
                                    />
                                </svg>
                                <h1 className="text-[36px] font-serif" style={{ color: '#F5F5F5' }}>
                                    Hi there! How can I help you?
                                </h1>
                            </div>

                            {/* Centered Chat Input */}
                            <div className="flex justify-center mb-4">
                                <div className="w-full max-w-2xl">
                                    <ChatInput
                                        onSend={sendMessage}
                                        isSending={isStreaming}
                                        onStop={stopStream}
                                    />
                                </div>
                            </div>

                            {/* Suggestion Chips */}
                            <div className="flex flex-wrap justify-center gap-3">
                                {[
                                    { icon: 'PenTool', text: "Write" },
                                    { icon: 'GraduationCap', text: "Learn" },
                                    { icon: 'Code', text: "Code" },
                                    { icon: 'Coffee', text: "Life stuff" },
                                    { icon: 'Lightbulb', text: "Claude's choice" }
                                ].map((suggestion, index) => (
                                    <button
                                        key={index}
                                        className="flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors hover:bg-gray-800/50"
                                        style={{
                                            borderColor: '#404040',
                                            color: '#f5f5f5'
                                        }}
                                    >
                                        <span className="text-sm">{suggestion.text}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        // Normal Chat Layout
                        <>
                            {/* Chat Messages */}
                            <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-6">
                                <div className="max-w-3xl mx-auto">
                                    <MessageList
                                        messages={messages}
                                        artifacts={artifacts}
                                        onSelectMessage={handleSelectMessage}
                                        selectedMessageId={selectedMessageId}
                                    />
                                    {isStreaming && (
                                        <div className="flex justify-center py-4">
                                            <div className="flex items-center gap-2 text-gray-400">
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                <span className="text-sm">Claude is thinking...</span>
                                            </div>
                                        </div>
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>
                            </div>

                            {/* Chat Input at Bottom */}
                            <ChatInput
                                onSend={sendMessage}
                                isSending={isStreaming}
                                onStop={stopStream}
                            />
                        </>
                    )}
                </div>

                {/* Right Artifact Panel */}
                <AnimatePresence>
                    {artifactViewerOpen && selectedArtifact && (
                        <motion.div
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: '500px', opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                            className="hidden lg:flex flex-col ml-8"
                            style={{
                                backgroundColor: 'var(--claude-artifact-bg)',
                                minWidth: '500px',
                                maxWidth: '500px'
                            }}
                        >
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
                                style={{ backgroundColor: 'var(--claude-artifact-bg)' }}
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