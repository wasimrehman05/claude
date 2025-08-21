/**
 * Gemini 2.5 API integration for streaming AI responses
 * Generates streaming tokens and code artifacts using Google's Generative AI
 */

import { config } from 'dotenv';
config();

import { GoogleGenerativeAI } from '@google/generative-ai';
import { parseArtifactsFromText, Artifact } from '../utils/parser';
import pino from 'pino';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

type StreamDelta = { type: 'delta', text: string };
type StreamArtifact = { type: 'artifact', artifact: Artifact };
type StreamItem = StreamDelta | StreamArtifact;

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is required');
}
const genAI = new GoogleGenerativeAI(apiKey);

const SYSTEM_PROMPT = `You are Claude, an AI assistant created by Anthropic. You are helpful, harmless, and honest.

When generating code, always wrap it in triple backticks with the appropriate language identifier. For web projects, create separate files:

For HTML projects, structure your response like this:
\`\`\`html
<!-- index.html -->
<!DOCTYPE html>
<html>...</html>
\`\`\`

\`\`\`css
/* styles.css */
body { ... }
\`\`\`

\`\`\`javascript
// script.js
function example() { ... }
\`\`\`

When modifying existing code, use the SAME filename in comments to update the existing file instead of creating duplicates.

Always include:
- Complete, working code
- Proper file structure (HTML, CSS, JS separately when applicable)
- Modern best practices
- Responsive design for web projects
- Clear comments explaining key functionality
- Error handling where appropriate

The user will be able to see a live preview that combines all files automatically.`;

export async function* startGeminiStream(
    prompt: string, 
    conversationHistory: Array<{ role: 'user' | 'assistant', content: string }> = []
): AsyncGenerator<StreamItem> {
    try {
        const model = genAI.getGenerativeModel({ 
            model: 'gemini-2.5-flash',
            systemInstruction: SYSTEM_PROMPT
        });

        const history = conversationHistory.map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
        }));

        const chat = model.startChat({
            history: history as any,
            generationConfig: {
                maxOutputTokens: 8192,
                temperature: 0.7,
                topP: 0.8,
                topK: 40,
            },
        });

        logger.info('Starting Gemini stream for prompt', { promptLength: prompt.length });

        const result = await chat.sendMessageStream(prompt);

        let fullResponse = '';
        
        for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            if (chunkText) {
                fullResponse += chunkText;
                yield { type: 'delta', text: chunkText };
            }
        }

        const artifacts = parseArtifactsFromText(fullResponse);
        
        for (const artifact of artifacts) {
            yield { type: 'artifact', artifact };
        }

        logger.info('Gemini stream completed', { 
            responseLength: fullResponse.length, 
            artifactsFound: artifacts.length 
        });

    } catch (error) {
        logger.error('Error in Gemini stream:', {
            error: error instanceof Error ? error.message : error,
            stack: error instanceof Error ? error.stack : undefined
        });
        
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        yield { 
            type: 'delta', 
            text: `I apologize, but I encountered an error: ${errorMessage}. Please try again.` 
        };
    }
}

export const startMockStream = startGeminiStream;
