

export function separateTextFromCode(fullText: string): {
    displayText: string;
    hasCodeBlocks: boolean;
} {

    const codeBlockRegex = /```[\w]*\n[\s\S]*?\n```/g;
    const displayText = fullText.replace(codeBlockRegex, '').trim();
    const hasCodeBlocks = codeBlockRegex.test(fullText);
    
    return {
        displayText,
        hasCodeBlocks
    };
}

export function hasCodeInMessage(text: string): boolean {
    return /```[\s\S]*?```/.test(text);
}
