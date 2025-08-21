import React, { useState, useRef, useEffect } from 'react';
import { Send, Square, Loader2, Plus, Link } from 'lucide-react';
import { clsx } from 'clsx';

interface ChatInputProps {
    onSend: (message: string) => Promise<void>;
    isSending?: boolean;
    onStop?: () => void;
}

export default function ChatInput({ onSend, isSending = false, onStop }: ChatInputProps) {
    const [value, setValue] = useState('');
    const [rows, setRows] = useState(1);
    const [isClient, setIsClient] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            const scrollHeight = textareaRef.current.scrollHeight;
            const lineHeight = 24;
            const minHeight = lineHeight;
            const maxHeight = lineHeight * 6;

            const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
            textareaRef.current.style.height = `${newHeight}px`;

            const newRows = Math.ceil(newHeight / lineHeight);
            setRows(newRows);
        }
    }, [value]);

    const handleSubmit = async () => {
        const trimmedValue = value.trim();
        if (!trimmedValue || isSending) return;

        setValue('');
        setRows(1);

        if (textareaRef.current) {
            textareaRef.current.style.height = '24px';
        }
        await onSend(trimmedValue);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            if (e.shiftKey) {
                return;
            } else if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                handleSubmit();
            } else {
                if (isClient && window.innerWidth > 768) {
                    e.preventDefault();
                    handleSubmit();
                }
            }
        }
    };

    const handleStop = () => {
        if (onStop) {
            onStop();
        }
    };

    const canSend = value.trim().length > 0 && !isSending;
    const showStop = isSending && onStop;

    return (
        <div
            className="flex-shrink-0 px-4 py-4"
        >
            <div className="max-w-3xl  mx-auto  w-full">
                <div className="relative">
                    {/* Input container */}
                    <div
                        className="relative flex flex-col justify-end rounded-2xl transition-all duration-200 px-2"
                        style={{
                            backgroundColor: 'var(--claude-chat-input-bg)',
                            border: '1px solid #404040',
                            boxShadow: 'var(--claude-shadow)',
                        }}
                    >

                        {/* Textarea */}
                        <div className="flex-1 min-w-0 p-2">
                            <textarea
                                ref={textareaRef}
                                value={value}
                                onChange={(e) => setValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Reply to Claude..."
                                className="w-full resize-none bg-transparent outline-none text-sm leading-6 pt-3 pr-4"
                                style={{
                                    color: '#ffffff',
                                    minHeight: '24px',
                                    maxHeight: '144px'
                                }}
                                rows={1}
                            />
                        </div>

                        <div className="flex justify-between">
                            {/* Left action buttons */}
                            <div className="flex items-center gap-1 p-2">
                                <button
                                    className="p-1.5 rounded-md hover:bg-gray-700 transition-colors"
                                    style={{ color: '#ffffff', border: '1px solid #404040' }}
                                    title="Add attachment"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                                <button
                                    className="p-1.5 rounded-md hover:bg-gray-700 transition-colors"
                                    style={{ color: '#ffffff', border: '1px solid #404040' }}
                                    title="Add link"
                                >
                                    <Link className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Right side - Model selector and send button */}
                            <div className="flex items-center gap-2 p-2">
                                {/* Model selector */}
                                <button
                                    className="flex items-center gap-1 text-sm hover:bg-gray-700 px-2 py-1 rounded transition-colors"
                                    style={{ color: '#ffffff' }}
                                >
                                    <span>Claude Sonnet 4</span>
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>

                                {/* Send/Stop button */}
                                <button
                                    onClick={showStop ? handleStop : handleSubmit}
                                    disabled={!canSend && !showStop}
                                    className={clsx(
                                        "p-2 rounded-lg transition-all duration-200 flex items-center justify-center",
                                        canSend || showStop
                                            ? "hover:scale-105"
                                            : "opacity-50 cursor-not-allowed"
                                    )}
                                    style={{
                                        backgroundColor: canSend || showStop ? 'var(--claude-accent)' : '#404040',
                                        color: 'white'
                                    }}
                                >
                                    {isSending ? (
                                        <Square className="w-4 h-4" />
                                    ) : (
                                        <Send className="w-4 h-4" />
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}