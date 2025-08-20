import React, { useState,useEffect, useCallback } from 'react';
import { Editor } from '@monaco-editor/react';
import { X, Code2, Eye, Download, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

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

    const downloadFile = useCallback(() => {
        const blob = new Blob([currentContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = selectedArtifact.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, [currentContent, selectedArtifact.filename]);


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
        <div className="h-full flex flex-col"
            style={{ backgroundColor: 'var(--claude-artifact-bg)' }}>

            {/* Artifact Navigation */}
            {allArtifacts.length > 1 && (
                <div
                    className="border-b"
                    style={{ borderColor: 'var(--claude-border)' }}
                >
                    <button
                        onClick={() => setArtifactListOpen(!artifactListOpen)}
                        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                    >
                        <span
                            className="text-sm font-medium"
                            style={{ color: 'var(--claude-artifact-text-secondary)', border: '1px solid var(--claude-border)' }}
                        >
                            Artifacts ({allArtifacts.length})
                        </span>
                        {artifactListOpen ? (
                            <ChevronUp className="w-4 h-4 text-gray-500" />
                        ) : (
                            <ChevronDown className="w-4 h-4 text-gray-500" />
                        )}
                    </button>
                    <AnimatePresence>
                        {artifactListOpen && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                            >
                                <div className="px-4 pb-4 space-y-2 max-h-48 overflow-y-auto">
                                    {allArtifacts.map((art) => (
                                        <button
                                            key={art.id}
                                            onClick={() => {
                                                setSelectedArtifact(art);
                                                setEditedContent('');
                                                setHasUnsavedChanges(false);
                                                setArtifactListOpen(false);
                                                onSelectArtifact?.(art.id!);
                                            }}
                                            className={clsx(
                                                "w-full text-left p-3 rounded-lg border transition-colors",
                                                art.id === selectedArtifact.id
                                                    ? "bg-orange-50 border-orange-200"
                                                    : "bg-white border-gray-200 hover:border-gray-300"
                                            )}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <div
                                                        className="font-medium text-sm"
                                                        style={{ color: 'black' }}
                                                    >
                                                        {art.filename}
                                                    </div>
                                                </div>
                                                {art.isNew && (
                                                    <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
                                                        New
                                                    </span>
                                                )}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}

            {/* Header with Title and Tab Bar */}
            <div
                className="border-b"
                style={{ borderColor: 'var(--claude-artifact-border)' }}
            >
                {/* Title Section */}
                {title && (
                    <div className="px-6 py-3 border-b" style={{ borderColor: 'var(--claude-artifact-border)' }}>
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
                            <button
                                onClick={onClose}
                                className="p-1 rounded-md hover:bg-gray-100 transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                    </div>
                )}
                
                {/* Tab Bar */}
                <div className="flex items-center justify-between px-6 py-3">
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
                    {hasUnsavedChanges && (
                        <>
                            <button
                                onClick={discardChanges}
                                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                            >
                                Discard
                            </button>
                            <button
                                onClick={saveChanges}
                                className="px-3 py-1.5 text-sm text-white rounded-lg transition-colors"
                                style={{ backgroundColor: 'var(--claude-accent)' }}
                            >
                                Save
                            </button>
                        </>
                    )}

                    <button
                        onClick={copyToClipboard}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50 transition-colors"
                        style={{
                            borderColor: 'var(--claude-border)',
                            color: 'var(--claude-text-secondary)'
                        }}
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

                    <button
                        onClick={downloadFile}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50 transition-colors"
                        style={{
                            borderColor: 'var(--claude-border)',
                            color: 'var(--claude-text-secondary)'
                        }}
                    >
                        <Download className="w-4 h-4" />
                        Download
                    </button>
                </div>
            </div>
        </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden">
                <AnimatePresence mode="wait">
                    {activeTab === 'code' && (
                        <motion.div
                            key="code"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="h-full"
                        >
                            <Editor
                                height="100%"
                                language={getEditorLanguage()}
                                value={currentContent}
                                onChange={handleEditorChange}
                                theme="vs-dark"
                                options={{
                                    readOnly: false,
                                    minimap: { enabled: false },
                                    fontSize: 14,
                                    lineNumbers: 'on',
                                    roundedSelection: false,
                                    scrollBeyondLastLine: false,
                                    automaticLayout: true,
                                    wordWrap: 'on',
                                    padding: { top: 16, bottom: 16 },
                                }}
                            />
                        </motion.div>
                    )}
                    {activeTab === 'preview' && canPreview && (
                        <motion.div
                            key="preview"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="h-full flex flex-col"
                        >
                            <div
                                className="px-4 py-2 text-xs border-b"
                                style={{
                                    backgroundColor: 'var(--claude-code-bg)',
                                    borderColor: 'var(--claude-border)',
                                    color: 'var(--claude-text-muted)'
                                }}
                            >
                                {allArtifacts.length > 1 ? (
                                    `Live preview: ${allArtifacts.length} files integrated`
                                ) : (
                                    `Preview: ${selectedArtifact.filename}`
                                )}
                            </div>
                            <div className="flex-1">
                                <iframe
                                    srcDoc={createCombinedPreview()}
                                    className="w-full h-full border-0"
                                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                                    title={`Preview of ${selectedArtifact.filename}`}
                                    scrolling="yes"
                                />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
