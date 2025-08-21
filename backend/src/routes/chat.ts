import { config } from 'dotenv';
config();

import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { startGeminiStream } from '../services/gemini-mock';
import { Artifact } from '../utils/parser';
import pino from 'pino';

const router = express.Router();
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
    id: string;
}

interface ChatSession {
    messages: ChatMessage[];
    createdAt: string;
    lastActivity: string;
    artifacts: Artifact[];
}

const sessionStore = new Map<string, ChatSession>();

const SESSION_CLEANUP_INTERVAL = 24 * 60 * 60 * 1000;
const SESSION_EXPIRY = 24 * 60 * 60 * 1000;

setInterval(() => {
    const now = Date.now();
    for (const [sessionId, session] of sessionStore.entries()) {
        if (now - new Date(session.lastActivity).getTime() > SESSION_EXPIRY) {
            sessionStore.delete(sessionId);
            logger.info(`Cleaned up expired session: ${sessionId}`);
        }
    }
}, SESSION_CLEANUP_INTERVAL);

router.post('/chat', (req: Request, res: Response) => {
    try {
        const { message, sessionId } = req.body;
        
        if (!message || typeof message !== 'string' || message.trim().length === 0) {
            return res.status(400).json({ 
                error: { 
                    code: 'INVALID_INPUT', 
                    message: 'Message is required and cannot be empty' 
                } 
            });
        }

        if (message.length > 32000) {
            return res.status(400).json({ 
                error: { 
                    code: 'MESSAGE_TOO_LONG', 
                    message: 'Message exceeds maximum length of 32,000 characters' 
                } 
            });
        }

        const sid = sessionId || uuidv4();
        const now = new Date().toISOString();
        
        let session = sessionStore.get(sid);
        if (!session) {
            session = {
                messages: [],
                createdAt: now,
                lastActivity: now,
                artifacts: []
            };
        }

        const userMessage: ChatMessage = {
            role: 'user',
            content: message.trim(),
            timestamp: now,
            id: uuidv4()
        };

        session.messages.push(userMessage);
        session.lastActivity = now;
        sessionStore.set(sid, session);

        logger.info(`Chat message received for session ${sid}`, { 
            messageLength: message.length,
            sessionMessageCount: session.messages.length 
        });

        res.json({ 
            sessionId: sid, 
            streamUrl: `/api/v1/stream/${sid}`,
            messageCount: session.messages.length
        });

    } catch (error) {
        logger.error('Error in chat endpoint:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to process chat message'
            }
        });
    }
});

router.get('/stream/:sessionId', async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;
        
        if (!sessionId) {
            return res.status(400).json({ 
                error: { 
                    code: 'INVALID_INPUT', 
                    message: 'Session ID is required' 
                } 
            });
        }

        res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        res.flushHeaders?.();

        const session = sessionStore.get(sessionId);
        if (!session) {
            res.write(`event: error\n`);
            res.write(`data: ${JSON.stringify({ 
                type: 'error', 
                message: 'Session not found. Please start a new conversation.' 
            })}\n\n`);
            return res.end();
        }

        session.lastActivity = new Date().toISOString();
        sessionStore.set(sessionId, session);

        const userMessages = session.messages.filter(m => m.role === 'user');
        if (userMessages.length === 0) {
            res.write(`event: error\n`);
            res.write(`data: ${JSON.stringify({ 
                type: 'error', 
                message: 'No user message found in session' 
            })}\n\n`);
            return res.end();
        }

        const latestUserMessage = userMessages[userMessages.length - 1];
        
        const conversationHistory = session.messages
            .slice(0, -1)
            .filter(m => m.role !== 'system')
            .map(m => ({ 
                role: m.role as 'user' | 'assistant', 
                content: m.content 
            }));

        logger.info(`Starting stream for session ${sessionId}`, {
            historyLength: conversationHistory.length,
            promptLength: latestUserMessage.content.length
        });

        const stream = startGeminiStream(latestUserMessage.content, conversationHistory);

        let assistantResponse = '';
        const assistantMessage: ChatMessage = {
            role: 'assistant',
            content: '',
            timestamp: new Date().toISOString(),
            id: uuidv4()
        };

        req.on('close', () => {
            logger.info(`Client disconnected from stream ${sessionId}`);
        });

        for await (const item of stream) {
            if (req.destroyed) {
                logger.info(`Stream ${sessionId} terminated - client disconnected`);
                break;
            }

            if (item.type === 'delta') {
                assistantResponse += item.text;
                res.write(`event: delta\n`);
                res.write(`data: ${JSON.stringify({ 
                    type: 'delta', 
                    delta: item.text,
                    messageId: assistantMessage.id
                })}\n\n`);
            } else if (item.type === 'artifact') {
                session.artifacts.push(item.artifact);
                sessionStore.set(sessionId, session);

                res.write(`event: artifact\n`);
                res.write(`data: ${JSON.stringify({ 
                    type: 'artifact', 
                    artifact: item.artifact 
                })}\n\n`);
            }
        }

        assistantMessage.content = assistantResponse;
        session.messages.push(assistantMessage);
        session.lastActivity = new Date().toISOString();
        sessionStore.set(sessionId, session);

        res.write(`event: done\n`);
        res.write(`data: ${JSON.stringify({ 
            type: 'done',
            messageId: assistantMessage.id,
            totalLength: assistantResponse.length
        })}\n\n`);
        
        res.end();

        logger.info(`Stream completed for session ${sessionId}`, {
            responseLength: assistantResponse.length,
            artifactsGenerated: session.artifacts.length
        });

    } catch (error) {
        logger.error('Error in stream endpoint:', error);
        
        try {
            res.write(`event: error\n`);
            res.write(`data: ${JSON.stringify({ 
                type: 'error', 
                message: 'An error occurred while processing your request. Please try again.' 
            })}\n\n`);
            res.end();
        } catch (writeError) {
            logger.error('Failed to write error to stream:', writeError);
        }
    }
});

export { router as chatRouter };
