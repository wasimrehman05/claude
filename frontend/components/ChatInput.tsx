import React, { useState, useRef, useEffect } from 'react';
import { Send, Square, Loader2 } from 'lucide-react';
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
            const lineHeight = 24; // line height in pixels
            const minHeight = lineHeight; // minimum 1 row
            const maxHeight = lineHeight * 6; // maximum 6 rows
            

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
            className="flex-shrink-0 px-6 py-4"
            style={{ 
                backgroundColor: 'var(--claude-chat-bg)',
                borderTop: `1px solid var(--claude-chat-border)`
            }}
        >
            <div className="relative">
                {/* Input container */}
                <div 
                    className="relative flex items-end rounded-2xl transition-all duration-200"
                    style={{ 
                        backgroundColor: 'var(--claude-chat-surface)',
                        border: `1px solid var(--claude-chat-border)`,
                        boxShadow: 'var(--claude-shadow)',
                    }}
                >
                    <textarea
                        ref={textareaRef}
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Message Claude..."
                        className={clsx(
                            "flex-1 resize-none border-0 bg-transparent focus:ring-0 focus:outline-none scrollbar-thin",
                            "text-base placeholder:text-gray-500 leading-6"
                        )}
                        style={{ 
                            color: 'var(--claude-chat-text)',
                            height: '24px',
                            lineHeight: '24px',
                            overflow: 'hidden',
                            padding: '16px 10px 16px 10px',
                        }}
                        rows={rows}
                        disabled={isSending}
                    />
                    
                    {/* Send/Stop button */}
                    <div className="flex items-end p-3">
                        {showStop ? (
                            <button
                                onClick={handleStop}
                                className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-200 text-gray-600 hover:bg-gray-300 transition-colors"
                                title="Stop generation"
                            >
                                <Square className="w-4 h-4" />
                            </button>
                        ) : (
                            <button
                                onClick={handleSubmit}
                                disabled={!canSend}
                                className={clsx(
                                    "flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200",
                                    canSend
                                        ? "text-white hover:scale-105"
                                        : "bg-gray-200 text-gray-400 cursor-not-allowed"
                                )}
                                style={{
                                    backgroundColor: canSend ? 'var(--claude-accent)' : undefined
                                }}
                                title={canSend ? "Send message" : "Type a message to send"}
                            >
                                {isSending ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Send className="w-4 h-4" />
                                )}
                            </button>
                        )}
                    </div>
                </div>

                {/* Keyboard shortcuts hint */}
                <div className="flex justify-between items-center mt-3 px-2">
                    <div 
                        className="text-xs"
                        style={{ color: 'var(--claude-chat-text-muted)' }}
                    >
                        {isClient && window.innerWidth > 768 ? (
                            <>
                                <kbd 
                                    className="px-1.5 py-0.5 text-xs font-medium rounded border"
                                    style={{ 
                                        color: 'var(--claude-chat-text-secondary)',
                                        backgroundColor: 'var(--claude-chat-surface)',
                                        borderColor: 'var(--claude-chat-border)'
                                    }}
                                >
                                    Enter
                                </kbd>
                                {' '}to send, {' '}
                                <kbd 
                                    className="px-1.5 py-0.5 text-xs font-medium rounded border"
                                    style={{ 
                                        color: 'var(--claude-chat-text-secondary)',
                                        backgroundColor: 'var(--claude-chat-surface)',
                                        borderColor: 'var(--claude-chat-border)'
                                    }}
                                >
                                    Shift + Enter
                                </kbd>
                                {' '}for new line
                            </>
                        ) : (
                            'Enter to send, Shift+Enter for new line'
                        )}
                    </div>
                    
                    <div 
                        className="text-xs"
                        style={{ color: 'var(--claude-chat-text-muted)' }}
                    >
                        {value.length}
                    </div>
                </div>
            </div>
        </div>
    );
}