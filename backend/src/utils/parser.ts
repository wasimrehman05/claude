export type Artifact = { 
    id?: string;
    filename: string; 
    language?: string; 
    content: string; 
    updatedAt?: string;
    isNew?: boolean;
};

export function parseArtifactsFromText(text: string): Artifact[] {
    const artifacts: Artifact[] = [];
    const fenceRE = /```(\w+)?\n([\s\S]*?)```/g;
    let match;
    let i = 1;
    
    while ((match = fenceRE.exec(text)) !== null) {
        const lang = match[1] || undefined;
        const content = match[2].trim();
        
        if (!content) continue;
        
        const filename = guessFilename(lang, i, content);
        artifacts.push({ 
            filename, 
            language: lang, 
            content,
            updatedAt: new Date().toISOString(),
            isNew: true
        });
        i++;
    }
    return artifacts;
}

function extractFilenameFromComment(content: string, language?: string): string | null {
    const patterns = [
        /\/\*\s*([^*\s]+\.(html?|css|js|jsx|ts|tsx|py|java|cpp|c|go|rs|rb|php))\s*\*\//i,
        /\/\/\s*([^\/\s]+\.(html?|css|js|jsx|ts|tsx|py|java|cpp|c|go|rs|rb|php))/i,
        /<!--\s*([^>\s]+\.(html?|css|js|jsx|ts|tsx|py|java|cpp|c|go|rs|rb|php))\s*-->/i,
        /#\s*([^#\s]+\.(html?|css|js|jsx|ts|tsx|py|java|cpp|c|go|rs|rb|php))/i,
    ];
    
    for (const pattern of patterns) {
        const match = content.match(pattern);
        if (match) {
            return match[1];
        }
    }
    
    return null;
}

function guessFilename(lang: string | undefined, i: number, content: string): string {
    const commentFilename = extractFilenameFromComment(content, lang);
    if (commentFilename) {
        return commentFilename;
    }
    
    if (!lang) {
        if (content.includes('<!DOCTYPE') || content.includes('<html')) {
            return i === 1 ? 'index.html' : `page-${i}.html`;
        }
        if (content.includes('body {') || content.includes('@media')) {
            return i === 1 ? 'styles.css' : `style-${i}.css`;
        }
        if (content.includes('function ') || content.includes('const ') || content.includes('=>')) {
            return i === 1 ? 'script.js' : `script-${i}.js`;
        }
        return `file-${i}.txt`;
    }
    
    const map: Record<string, string> = { 
        html: i === 1 ? 'index.html' : `page-${i}.html`,
        css: i === 1 ? 'styles.css' : `style-${i}.css`,
        js: i === 1 ? 'script.js' : `script-${i}.js`,
        javascript: i === 1 ? 'script.js' : `script-${i}.js`,
        jsx: i === 1 ? 'App.jsx' : `Component-${i}.jsx`,
        tsx: i === 1 ? 'App.tsx' : `Component-${i}.tsx`,
        ts: i === 1 ? 'main.ts' : `module-${i}.ts`,
        py: i === 1 ? 'main.py' : `script-${i}.py`,
        python: i === 1 ? 'main.py' : `script-${i}.py`,
        java: i === 1 ? 'Main.java' : `Class-${i}.java`,
        cpp: i === 1 ? 'main.cpp' : `program-${i}.cpp`,
        c: i === 1 ? 'main.c' : `program-${i}.c`,
        go: i === 1 ? 'main.go' : `module-${i}.go`,
        rs: i === 1 ? 'main.rs' : `module-${i}.rs`,
        rust: i === 1 ? 'main.rs' : `module-${i}.rs`,
        rb: i === 1 ? 'main.rb' : `script-${i}.rb`,
        ruby: i === 1 ? 'main.rb' : `script-${i}.rb`,
        php: i === 1 ? 'index.php' : `page-${i}.php`,
    };
    
    return map[lang.toLowerCase()] || `file-${i}.${lang}`;
}
