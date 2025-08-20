import express, { Request, Response } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { json } from 'body-parser';
import pino from 'pino';
import dotenv from 'dotenv';
import { chatRouter } from './routes/chat';

// Load environment variables
dotenv.config();

const logger = pino({ 
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV !== 'production' ? {
        target: 'pino-pretty',
        options: { colorize: true }
    } : undefined
});

// Validate required environment variables
if (!process.env.GEMINI_API_KEY) {
    logger.error('GEMINI_API_KEY environment variable is required');
    process.exit(1);
}

const app = express();

// Security middleware
app.use(helmet({
    contentSecurityPolicy: false, // Allow for iframe previews
    crossOriginEmbedderPolicy: false
}));

// Body parsing
app.use(json({ limit: '10mb' }));

// CORS configuration
const allowedOrigins = process.env.TRUSTED_ORIGIN 
    ? process.env.TRUSTED_ORIGIN.split(',')
    : ['http://localhost:3000', 'http://127.0.0.1:3000'];

app.use(cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || '120', 10),
    message: {
        error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests, please try again later.'
        }
    },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api', limiter);

// Health check endpoint
app.get('/api/healthz', (_req: Request, res: Response) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0'
    });
});

// API routes
app.use('/api/v1', chatRouter);

// Global error handler
app.use((err: any, req: Request, res: Response, next: any) => {
    logger.error('Unhandled error:', err);
    res.status(500).json({
        error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: process.env.NODE_ENV === 'production' 
                ? 'Internal server error' 
                : err.message
        }
    });
});

// 404 handler
app.use('*', (req: Request, res: Response) => {
    res.status(404).json({
        error: {
            code: 'NOT_FOUND',
            message: 'Endpoint not found'
        }
    });
});

const port: number = parseInt(process.env.PORT || '4000', 10);

app.listen(port, () => {
    logger.info(`🚀 AI Coding Agent API listening on http://localhost:${port}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
