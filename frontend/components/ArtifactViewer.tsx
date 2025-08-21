import React, { useState, useEffect, useCallback } from 'react';
import { Editor } from '@monaco-editor/react';
import { X, Code2, Eye, Download, Copy, Check, ChevronDown, ChevronUp, FileCode2 } from 'lucide-react';
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
    const [editedContent, setEditedContent] = useState<string>('');
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [artifactListOpen, setArtifactListOpen] = useState(false);

    useEffect(() => {
        setSelectedArtifact(artifact);
        setEditedContent('');
        setHasUnsavedChanges(false);
    }, [artifact]);

    const currentContent = hasUnsavedChanges ? editedContent : selectedArtifact.content;

    const hasHtmlArtifact = allArtifacts.some(a =>
        a.language?.toLowerCase() === 'html' ||
        a.filename.endsWith('.html') ||
        a.content.includes('<html') ||
        a.content.includes('<!DOCTYPE')
    );
    const canPreview = hasHtmlArtifact;

    const getEditorLanguage = () => {
        const lang = selectedArtifact.language?.toLowerCase();
        const fileExt = selectedArtifact.filename.split('.').pop()?.toLowerCase();

        if (lang === 'javascript' || lang === 'js' || fileExt === 'js') return 'javascript';
        if (lang === 'typescript' || lang === 'ts' || fileExt === 'ts') return 'typescript';
        if (lang === 'html' || fileExt === 'html') return 'html';
        if (lang === 'css' || fileExt === 'css') return 'css';
        if (lang === 'python' || lang === 'py' || fileExt === 'py') return 'python';
        if (lang === 'json' || fileExt === 'json') return 'json';
        if (lang === 'xml' || fileExt === 'xml') return 'xml';
        if (lang === 'sql' || fileExt === 'sql') return 'sql';

        return 'plaintext';
    };

    const handleEditorChange = useCallback((value: string | undefined) => {
        if (value !== undefined && value !== selectedArtifact.content) {
            setEditedContent(value);
            setHasUnsavedChanges(true);
        }
    }, [selectedArtifact.content]);

    const saveChanges = useCallback(() => {
        if (onUpdateArtifact && hasUnsavedChanges && selectedArtifact.id) {
            onUpdateArtifact(selectedArtifact.id, editedContent);
            setHasUnsavedChanges(false);
        }
    }, [onUpdateArtifact, hasUnsavedChanges, editedContent, selectedArtifact.id]);

    const discardChanges = useCallback(() => {
        setEditedContent('');
        setHasUnsavedChanges(false);
    }, []);

    const copyToClipboard = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(currentContent);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy text:', err);
        }
    }, [currentContent]);

    const downloadAllFiles = useCallback(async () => {
        try {
            const zip = new JSZip();

            // Add all artifacts to the zip
            allArtifacts.forEach(artifact => {
                zip.file(artifact.filename, artifact.content);
            });

            // Generate the zip file
            const zipBlob = await zip.generateAsync({ type: 'blob' });

            // Create download link
            const url = URL.createObjectURL(zipBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${title || 'project'}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Failed to create zip file:', err);
        }
    }, [allArtifacts, title]);

    const createCombinedPreview = useCallback(() => {
        const htmlArtifact = allArtifacts.find(a =>
            a.language?.toLowerCase() === 'html' ||
            a.filename.endsWith('.html') ||
            a.content.includes('<html')
        );

        if (!htmlArtifact) return currentContent;

        let htmlContent = htmlArtifact.content;
        const cssArtifacts = allArtifacts.filter(a =>
            a.language?.toLowerCase() === 'css' || a.filename.endsWith('.css')
        );
        const jsArtifacts = allArtifacts.filter(a =>
            a.language?.toLowerCase() === 'javascript' ||
            a.language?.toLowerCase() === 'js' ||
            a.filename.endsWith('.js')
        );

        const viewportAndCss = cssArtifacts.length > 0
            ? `  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <style>\n${cssArtifacts.map(a => a.content).join('\n\n')}\n  </style>`
            : `  <meta name="viewport" content="width=device-width, initial-scale=1.0">`;

        if (htmlContent.includes('</head>')) {
            htmlContent = htmlContent.replace('</head>', `${viewportAndCss}\n</head>`);
        } else if (htmlContent.includes('<head>')) {
            htmlContent = htmlContent.replace('<head>', `<head>\n${viewportAndCss}`);
        } else {
            const headTag = `<head>\n${viewportAndCss}\n</head>\n`;
            if (htmlContent.includes('<html>')) {
                htmlContent = htmlContent.replace('<html>', `<html>\n${headTag}`);
            } else {
                htmlContent = `<!DOCTYPE html>\n<html>\n${headTag}${htmlContent}\n</html>`;
            }
        }

        if (jsArtifacts.length > 0) {
            const combinedJS = jsArtifacts.map(a => a.content).join('\n\n');
            if (htmlContent.includes('</body>')) {
                htmlContent = htmlContent.replace('</body>', `  <script>\n${combinedJS}\n  </script>\n</body>`);
            } else {
                htmlContent += `\n<script>\n${combinedJS}\n</script>`;
            }
        }

        return htmlContent;
    }, [allArtifacts, currentContent]);

    return (
        <div className="h-full flex flex-col" style={{ backgroundColor: 'var(--claude-chat-bg)' }}>
            {/* Artifact Navigation */}
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

            {/* Collapsible File List */}
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

            {/* Header with Title and Tab Bar */}
            {/* <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--claude-chat-border)', backgroundColor: 'var(--claude-chat-surface)' }}>
                <div className="flex items-center gap-4">
                    <h3 className="text-lg font-semibold" style={{ color: 'var(--claude-chat-text)' }}>
                        {selectedArtifact?.filename || 'No file selected'}
                    </h3>
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
            </div> */}

            {/* Tab Bar */}
            {/* <div className="flex border-b" style={{ borderColor: 'var(--claude-chat-border)', backgroundColor: 'var(--claude-chat-bg)' }}>
                <button
                    onClick={() => setActiveTab('code')}
                    className={clsx(
                        "px-4 py-2 text-sm font-medium transition-colors",
                        activeTab === 'code'
                            ? "border-b-2 text-white"
                            : "text-gray-400 hover:text-gray-300 hover:bg-gray-700"
                    )}
                    style={{
                        borderColor: activeTab === 'code' ? 'var(--claude-accent)' : 'transparent',
                        backgroundColor: activeTab === 'code' ? 'var(--claude-chat-surface)' : 'transparent'
                    }}
                >
                    Code
                </button>
                {hasHtmlArtifact && (
                    <button
                        onClick={() => setActiveTab('preview')}
                        className={clsx(
                            "px-4 py-2 text-sm font-medium transition-colors",
                            activeTab === 'preview'
                                ? "border-b-2 text-white"
                                : "text-gray-400 hover:text-gray-300 hover:bg-gray-700"
                        )}
                        style={{
                            borderColor: activeTab === 'preview' ? 'var(--claude-accent)' : 'transparent',
                            backgroundColor: activeTab === 'preview' ? 'var(--claude-chat-surface)' : 'transparent'
                        }}
                    >
                        Preview
                    </button>
                )}
            </div> */}

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

            {/* Content Area */}
            <div className="flex-1 overflow-hidden" style={{ backgroundColor: 'var(--claude-chat-bg)' }}>
                {activeTab === 'code' && selectedArtifact && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.2 }}
                        className="h-full relative"
                    >
                        {/* Copy Button */}
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

                        {/* Monaco Editor */}
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
