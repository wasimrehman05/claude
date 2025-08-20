

export function extractArtifactTitle(responseText: string): string | null {

    const textWithoutCode = responseText.replace(/```[\s\S]*?```/g, '').trim();
    
    const patterns = [
        /here'?s\s+a\s+(?:complete|simple|basic|working)?\s*([^,.!?]+?)(?:\s+(?:application|app|project|game|website|tool|calculator|component))/i,
        /i'?ll\s+create\s+a\s+([^,.!?]+?)(?:\s+for\s+you)?[,.!]/i,
        /this\s+is\s+a\s+([^,.!?]+?)[,.!]/i,
        /^([^,.!?]+?)(?:\s+(?:implementation|application|app|project|game|website|tool|calculator|component))/i,
        /(?:building|creating|making)\s+a\s+([^,.!?]+?)[,.!]/i,
    ];
    
    for (const pattern of patterns) {
        const match = textWithoutCode.match(pattern);
        if (match && match[1]) {
            let title = match[1].trim();
            

            title = cleanTitle(title);
            

            if (isValidTitle(title)) {
                return title;
            }
        }
    }
    

    const firstSentence = textWithoutCode.split(/[.!?]/)[0];
    if (firstSentence) {
        const projectKeywords = [
            'calculator', 'todo', 'to-do', 'tic-tac-toe', 'weather', 'clock', 
            'timer', 'counter', 'quiz', 'game', 'chat', 'form', 'dashboard',
            'portfolio', 'blog', 'shop', 'cart', 'gallery', 'slider', 'carousel'
        ];
        
        for (const keyword of projectKeywords) {
            if (firstSentence.toLowerCase().includes(keyword)) {
                return capitalizeTitle(keyword.replace(/-/g, ' '));
            }
        }
    }
    
    return null;
}

function cleanTitle(title: string): string {

    title = title
        .replace(/\b(?:web|html|css|javascript|js|react|vue|angular|simple|basic|complete|working)\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
    

    title = title.replace(/^(?:a|an|the)\s+/i, '');
    
    return title;
}

function isValidTitle(title: string): boolean {

    return title.length >= 3 && 
           title.length <= 50 && 
           /[a-zA-Z]/.test(title) &&
           !title.toLowerCase().includes('undefined') &&
           !title.toLowerCase().includes('null');
}

function capitalizeTitle(title: string): string {
    return title
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}


export function generateFallbackTitle(artifacts: Array<{filename: string, language?: string}>): string {
    if (artifacts.length === 0) return 'Code Project';
    
    const hasHtml = artifacts.some(a => a.language === 'html' || a.filename.endsWith('.html'));
    const hasCss = artifacts.some(a => a.language === 'css' || a.filename.endsWith('.css'));
    const hasJs = artifacts.some(a => a.language === 'javascript' || a.filename.endsWith('.js'));
    const hasPython = artifacts.some(a => a.language === 'python' || a.filename.endsWith('.py'));
    const hasReact = artifacts.some(a => a.filename.endsWith('.jsx') || a.filename.endsWith('.tsx'));
    
    if (hasReact) return 'React Application';
    if (hasHtml && hasCss && hasJs) return 'Web Application';
    if (hasHtml && hasCss) return 'Web Page';
    if (hasHtml) return 'HTML Project';
    if (hasPython) return 'Python Project';
    if (hasJs) return 'JavaScript Project';
    

    if (artifacts.length === 1) return 'Code File';
    return `Code Project (${artifacts.length} files)`;
}
