import React, { useState, useEffect, useCallback } from 'react';
import { Editor } from '@monaco-editor/react';
import { X, Code2, Eye, Download, Copy, Check, ChevronDown, FileCode2 } from 'lucide-react';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import JSZip from 'jszip';

export type Artifact = {
    id?: string;
    filename: string;
    language?: string;
    content: string;
    updatedAt?: string;
    isNew?: boolean;
};

interface ArtifactViewerProps {
    artifact: Artifact;
    allArtifacts?: Artifact[];
    title?: string;
    onClose: () => void;
    onUpdateArtifact?: (artifactId: string, newContent: string) => void;
    onSelectArtifact?: (artifactId: string) => void;
}

export default function ArtifactViewer({
    artifact,
    allArtifacts = [],
    title,
    onClose,
    onUpdateArtifact,
    onSelectArtifact
}: ArtifactViewerProps) {

    const [selectedArtifact, setSelectedArtifact] = useState<Artifact>(artifact);
    const [activeTab, setActiveTab] = useState<'code' | 'preview'>(() => {
        const hasHtml = allArtifacts.some(a =>
            a.language?.toLowerCase() === 'html' ||
            a.filename.endsWith('.html') ||
            a.content.includes('<html') ||
            a.content.includes('<!DOCTYPE')
        );
        return hasHtml ? 'preview' : 'code';
    });
    const [copied, setCopied] = useState(false);
    const [artifactListOpen, setArtifactListOpen] = useState(false);

    useEffect(() => {
        setSelectedArtifact(artifact);
    }, [artifact]);

    const hasHtmlArtifact = allArtifacts.some(a =>
        a.language?.toLowerCase() === 'html' ||
        a.filename.endsWith('.html') ||
        a.content.includes('<html') ||
        a.content.includes('<!DOCTYPE')
    );
    const canPreview = hasHtmlArtifact;

    const copyToClipboard = async () => {
        if (!selectedArtifact) return;
        
        try {
            await navigator.clipboard.writeText(selectedArtifact.content);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy text:', err);
        }
    };

    const downloadAllFiles = async () => {
        try {
            const zip = new JSZip();

            allArtifacts.forEach(artifact => {
                zip.file(artifact.filename, artifact.content);
            });

            const zipBlob = await zip.generateAsync({ type: 'blob' });

            const url = URL.createObjectURL(zipBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'artifacts.zip';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Failed to download files:', error);
        }
    };

    const createCombinedPreview = () => {
        const htmlArtifact = allArtifacts.find(a =>
            a.language?.toLowerCase() === 'html' ||
            a.filename.endsWith('.html') ||
            a.content.includes('<html') ||
            a.content.includes('<!DOCTYPE')
        );

        if (!htmlArtifact) return '';

        let htmlContent = htmlArtifact.content;

        const cssArtifacts = allArtifacts.filter(a =>
            a.language?.toLowerCase() === 'css' || a.filename.endsWith('.css')
        );

        const jsArtifacts = allArtifacts.filter(a =>
            a.language?.toLowerCase() === 'javascript' || 
            a.language?.toLowerCase() === 'js' || 
            a.filename.endsWith('.js')
        );

        if (cssArtifacts.length > 0) {
            const cssContent = cssArtifacts.map(a => a.content).join('\n');
            if (htmlContent.includes('</head>')) {
                htmlContent = htmlContent.replace('</head>', `<style>${cssContent}</style>\n</head>`);
            } else if (htmlContent.includes('<head>')) {
                htmlContent = htmlContent.replace('<head>', `<head>\n<style>${cssContent}</style>`);
            } else {
                htmlContent = htmlContent.replace('<body>', `<head>\n<style>${cssContent}</style>\n</head>\n<body>`);
            }
        }

        if (jsArtifacts.length > 0) {
            const jsContent = jsArtifacts.map(a => a.content).join('\n');
            if (htmlContent.includes('</body>')) {
                htmlContent = htmlContent.replace('</body>', `<script>${jsContent}</script>\n</body>`);
            } else {
                htmlContent = htmlContent + `\n<script>${jsContent}</script>`;
            }
        }

        if (!htmlContent.includes('<meta name="viewport"')) {
            htmlContent = htmlContent.replace('<head>', '<head>\n<meta name="viewport" content="width=device-width, initial-scale=1.0">');
        }

        return htmlContent;
    };

    return (
        <div className="h-full flex flex-col" style={{ backgroundColor: 'var(--claude-chat-bg)' }}>
            <div className="flex items-center justify-between py-4 px-0 border-b" style={{ borderColor: 'var(--claude-chat-border)', backgroundColor: 'var(--claude-chat-surface)' }}>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setArtifactListOpen(!artifactListOpen)}
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-800/50 transition-colors"
                        style={{ backgroundColor: 'var(--claude-chat-surface)' }}
                    >
                        <span className="text-sm font-medium" style={{ color: 'var(--claude-chat-text)' }}>
                            {title || 'Generated Artifacts'}
                        </span>
                        <ChevronDown
                            className={clsx("w-4 h-4 transition-transform", artifactListOpen && "rotate-180")}
                            style={{ color: 'var(--claude-chat-text-secondary)' }}
                        />
                    </button>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
                    style={{ color: 'var(--claude-chat-text-secondary)' }}
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            <AnimatePresence>
                {artifactListOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-b overflow-hidden"
                        style={{ borderColor: 'var(--claude-chat-border)', backgroundColor: 'var(--claude-chat-bg)' }}
                    >
                        <div className="p-4 space-y-2">
                            {allArtifacts.map((artifact) => (
                                <button
                                    key={artifact.id}
                                    onClick={() => setSelectedArtifact(artifact)}
                                    className={clsx(
                                        "w-full flex items-center justify-between p-3 rounded-lg border transition-all duration-200 text-left",
                                        selectedArtifact?.id === artifact.id
                                            ? "bg-orange-900/20 border-orange-500/30"
                                            : "bg-gray-800/50 border-gray-600 hover:border-gray-500 hover:bg-gray-800/70"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
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
                                                <span className="font-medium text-sm truncate" style={{ color: 'var(--claude-chat-text)' }}>
                                                    {artifact.filename}
                                                </span>
                                                {artifact.isNew && (
                                                    <span className="text-xs px-1.5 py-0.5 rounded-full border bg-green-900/30 text-green-400 border-green-700/30">
                                                        New
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs" style={{ color: 'var(--claude-chat-text-secondary)' }}>
                                                    {artifact.language || 'text'} • {artifact.content.length} chars
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="flex items-center justify-between px-1 py-4">
                <div
                    className="flex items-center gap-1 p-1 rounded-lg"
                    style={{ backgroundColor: 'var(--claude-artifact-surface)' }}
                >
                    <button
                        onClick={() => setActiveTab('code')}
                        className={clsx(
                            "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                            activeTab === 'code'
                                ? "shadow-sm"
                                : "hover:bg-gray-100"
                        )}
                        style={{
                            backgroundColor: activeTab === 'code' ? 'var(--claude-artifact-bg)' : 'transparent',
                            color: activeTab === 'code' ? 'var(--claude-artifact-text)' : 'var(--claude-artifact-text-secondary)'
                        }}
                    >
                        <Code2 className="w-4 h-4" />
                        Code
                    </button>
                    {canPreview && (
                        <button
                            onClick={() => setActiveTab('preview')}
                            className={clsx(
                                "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                                activeTab === 'preview'
                                    ? "shadow-sm"
                                    : "hover:bg-gray-100"
                            )}
                            style={{
                                backgroundColor: activeTab === 'preview' ? 'var(--claude-artifact-bg)' : 'transparent',
                                color: activeTab === 'preview' ? 'var(--claude-artifact-text)' : 'var(--claude-artifact-text-secondary)'
                            }}
                        >
                            <Eye className="w-4 h-4" />
                            Preview
                        </button>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={downloadAllFiles}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-800/50 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors"
                        style={{ color: 'white' }}
                    >
                        <Download className="w-4 h-4" />
                        Download All
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-hidden" style={{ backgroundColor: 'var(--claude-chat-bg)' }}>
                {activeTab === 'code' && selectedArtifact && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.2 }}
                        className="h-full relative"
                    >
                        <div className="absolute top-4 right-4 z-10">
                            <button
                                onClick={copyToClipboard}
                                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-800/80 backdrop-blur-sm border border-gray-600 rounded-lg hover:bg-gray-700/80 transition-colors"
                                style={{ color: 'white' }}
                            >
                                {copied ? (
                                    <>
                                        <Check className="w-4 h-4" />
                                        Copied
                                    </>
                                ) : (
                                    <>
                                        <Copy className="w-4 h-4" />
                                        Copy
                                    </>
                                )}
                            </button>
                        </div>

                        <div className="h-full">
                            <Editor
                                height="100%"
                                defaultLanguage={selectedArtifact.language || 'text'}
                                defaultValue={selectedArtifact.content}
                                theme="vs-dark"
                                options={{
                                    readOnly: false,
                                    minimap: { enabled: false },
                                    scrollBeyondLastLine: false,
                                    fontSize: 14,
                                    lineHeight: 20,
                                    wordWrap: 'on',
                                    automaticLayout: true,
                                }}
                                onChange={(value) => {
                                    if (value !== undefined) {
                                        onUpdateArtifact?.(selectedArtifact.id!, value);
                                    }
                                }}
                            />
                        </div>
                    </motion.div>
                )}

                {activeTab === 'preview' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.2 }}
                        className="h-full"
                    >
                        <iframe
                            srcDoc={createCombinedPreview()}
                            className="w-full h-full border-0"
                            title="Preview"
                            scrolling="yes"
                        />
                    </motion.div>
                )}
            </div>
        </div>
    );
}
