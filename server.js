/**
 * Zynapse ImageKit Authentication Server
 * Production Version
 * 
 * Features:
 * - Secure ImageKit authentication
 * - File upload handling
 * - File deletion
 * - Rate limiting
 * - CORS support
 * - Error handling
 * - Health monitoring
 */

require('dotenv').config();
const express = require("express");
const ImageKit = require("imagekit");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();

// ====================
// Configuration
// ====================

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const MAX_FILE_SIZE = process.env.MAX_FILE_SIZE || 100 * 1024 * 1024; // 100MB default
const UPLOAD_FOLDER = process.env.UPLOAD_FOLDER || '/zynapse';

// ====================
// Middleware
// ====================

// Security headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https://ik.imagekit.io"],
            connectSrc: ["'self'"]
        }
    },
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration
const corsOptions = {
    origin: function (origin, callback) {
        // Allow all origins in development
        if (NODE_ENV === 'development') {
            callback(null, true);
        } else {
            // In production, specify allowed origins
            const allowedOrigins = [
                'https://yourdomain.com',
                'https://www.yourdomain.com',
                'https://zynapse-app.com'
            ];
            
            if (!origin || allowedOrigins.indexOf(origin) !== -1) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        }
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400 // 24 hours
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: NODE_ENV === 'development' ? 1000 : 100, // limit each IP to 100 requests per windowMs
    message: {
        status: 429,
        error: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

app.use('/auth', limiter);
app.use('/upload', limiter);

// Request logging middleware
app.use((req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
    });
    
    next();
});

// ====================
// ImageKit Configuration
// ====================

// Validate environment variables
const requiredEnvVars = ['IMAGEKIT_PUBLIC_KEY', 'IMAGEKIT_PRIVATE_KEY', 'IMAGEKIT_URL_ENDPOINT'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
    console.error('Missing required environment variables:', missingEnvVars);
    process.exit(1);
}

// Initialize ImageKit
const imagekit = new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
});

// Test ImageKit connection
imagekit.listFiles({}, function(error, result) {
    if (error) {
        console.error('ImageKit connection test failed:', error.message);
    } else {
        console.log('ImageKit connection successful');
    }
});

// ====================
// File Upload Configuration
// ====================

// Configure multer for file uploads
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    // Allowed file types
    const allowedMimeTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        'video/mp4',
        'video/mpeg',
        'video/ogg',
        'video/webm',
        'video/quicktime',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only images, videos, and documents are allowed.'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: parseInt(MAX_FILE_SIZE),
        files: 1
    }
});

// ====================
// Utility Functions
// ====================

/**
 * Validate upload request
 */
const validateUploadRequest = (req) => {
    if (!req.file) {
        throw new Error('No file uploaded');
    }
    
    if (!req.body.fileName || req.body.fileName.trim() === '') {
        throw new Error('File name is required');
    }
    
    // Validate file name for security
    const fileName = req.body.fileName.trim();
    if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
        throw new Error('Invalid file name');
    }
    
    return true;
};

/**
 * Generate secure file name
 */
const generateSecureFileName = (originalName, userId = 'anonymous') => {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = path.extname(originalName);
    const baseName = path.basename(originalName, extension).replace(/[^a-zA-Z0-9]/g, '_');
    
    return `${baseName}_${userId}_${timestamp}_${randomString}${extension}`;
};

/**
 * Sanitize folder path
 */
const sanitizeFolderPath = (folder) => {
    if (!folder) return UPLOAD_FOLDER;
    
    // Remove any unsafe characters
    let safeFolder = folder.replace(/\.\./g, '').replace(/\/\//g, '/');
    
    // Ensure it starts with the base folder
    if (!safeFolder.startsWith(UPLOAD_FOLDER)) {
        safeFolder = path.join(UPLOAD_FOLDER, safeFolder);
    }
    
    return safeFolder;
};

// ====================
// API Routes
// ====================

/**
 * Health Check Endpoint
 */
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'Zynapse ImageKit Server',
        environment: NODE_ENV,
        version: '1.0.0'
    });
});

/**
 * ImageKit Authentication Endpoint
 */
app.get('/auth', async (req, res) => {
    try {
        const authParams = imagekit.getAuthenticationParameters();
        
        res.status(200).json({
            success: true,
            ...authParams,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Auth error:', error);
        
        res.status(500).json({
            success: false,
            error: 'Authentication failed',
            message: error.message
        });
    }
});

/**
 * File Upload Endpoint
 */
app.post('/upload', upload.single('file'), async (req, res) => {
    try {
        // Validate request
        validateUploadRequest(req);
        
        const file = req.file;
        let fileName = req.body.fileName;
        let folder = req.body.folder || UPLOAD_FOLDER;
        
        // Generate secure file name if not provided
        if (!fileName || fileName.trim() === '') {
            fileName = generateSecureFileName(file.originalname, req.body.userId);
        }
        
        // Sanitize folder path
        folder = sanitizeFolderPath(folder);
        
        console.log(`Uploading file: ${fileName} to folder: ${folder}, Size: ${file.size} bytes`);
        
        // Prepare tags
        const tags = ['zynapse'];
        if (req.body.tags) {
            try {
                const additionalTags = JSON.parse(req.body.tags);
                if (Array.isArray(additionalTags)) {
                    tags.push(...additionalTags);
                }
            } catch (error) {
                console.warn('Failed to parse tags:', error.message);
            }
        }
        
        // Upload to ImageKit
        const uploadResult = await new Promise((resolve, reject) => {
            imagekit.upload({
                file: file.buffer,
                fileName: fileName,
                folder: folder,
                tags: tags,
                useUniqueFileName: false,
                isPrivateFile: false,
                overwriteFile: false,
                overwriteAITags: false,
                overwriteTags: false,
                overwriteCustomMetadata: false,
                customMetadata: req.body.metadata ? JSON.parse(req.body.metadata) : {}
            }, (error, result) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(result);
                }
            });
        });
        
        // Prepare response
        const response = {
            success: true,
            fileId: uploadResult.fileId,
            name: uploadResult.name,
            url: uploadResult.url,
            thumbnailUrl: uploadResult.thumbnailUrl,
            filePath: uploadResult.filePath,
            size: uploadResult.size,
            fileType: uploadResult.fileType,
            tags: uploadResult.tags,
            timestamp: new Date().toISOString()
        };
        
        console.log(`Upload successful: ${fileName}, File ID: ${uploadResult.fileId}`);
        
        res.status(200).json(response);
        
    } catch (error) {
        console.error('Upload error:', error);
        
        let statusCode = 500;
        let errorMessage = 'File upload failed';
        
        if (error.message === 'No file uploaded') {
            statusCode = 400;
            errorMessage = error.message;
        } else if (error.message === 'File name is required') {
            statusCode = 400;
            errorMessage = error.message;
        } else if (error.message === 'Invalid file name') {
            statusCode = 400;
            errorMessage = error.message;
        } else if (error.message.includes('File too large')) {
            statusCode = 413;
            errorMessage = `File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`;
        } else if (error.message.includes('Invalid file type')) {
            statusCode = 415;
            errorMessage = error.message;
        }
        
        res.status(statusCode).json({
            success: false,
            error: errorMessage,
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * File Delete Endpoint
 */
app.post('/delete', async (req, res) => {
    try {
        const { fileId } = req.body;
        
        if (!fileId) {
            return res.status(400).json({
                success: false,
                error: 'File ID is required'
            });
        }
        
        console.log(`Deleting file with ID: ${fileId}`);
        
        // Delete from ImageKit
        const deleteResult = await new Promise((resolve, reject) => {
            imagekit.deleteFile(fileId, (error, result) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(result);
                }
            });
        });
        
        res.status(200).json({
            success: true,
            message: 'File deleted successfully',
            fileId: fileId,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Delete error:', error);
        
        res.status(500).json({
            success: false,
            error: 'File deletion failed',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Get File Details Endpoint
 */
app.get('/file/:fileId', async (req, res) => {
    try {
        const { fileId } = req.params;
        
        if (!fileId) {
            return res.status(400).json({
                success: false,
                error: 'File ID is required'
            });
        }
        
        // Get file details from ImageKit
        const fileDetails = await new Promise((resolve, reject) => {
            imagekit.getFileDetails(fileId, (error, result) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(result);
                }
            });
        });
        
        res.status(200).json({
            success: true,
            file: fileDetails,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Get file details error:', error);
        
        res.status(500).json({
            success: false,
            error: 'Failed to get file details',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * List Files Endpoint
 */
app.get('/files', async (req, res) => {
    try {
        const { folder, limit = 100, skip = 0 } = req.query;
        
        const options = {
            limit: parseInt(limit),
            skip: parseInt(skip)
        };
        
        if (folder) {
            options.path = folder;
        }
        
        // List files from ImageKit
        const files = await new Promise((resolve, reject) => {
            imagekit.listFiles(options, (error, result) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(result);
                }
            });
        });
        
        res.status(200).json({
            success: true,
            files: files,
            count: files.length,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('List files error:', error);
        
        res.status(500).json({
            success: false,
            error: 'Failed to list files',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Batch Upload Endpoint
 */
app.post('/batch-upload', upload.array('files', 10), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No files uploaded'
            });
        }
        
        const files = req.files;
        const folder = req.body.folder || UPLOAD_FOLDER;
        const results = [];
        const errors = [];
        
        console.log(`Batch upload: ${files.length} files to folder: ${folder}`);
        
        // Process each file
        for (const file of files) {
            try {
                const fileName = generateSecureFileName(file.originalname);
                const sanitizedFolder = sanitizeFolderPath(folder);
                
                const uploadResult = await new Promise((resolve, reject) => {
                    imagekit.upload({
                        file: file.buffer,
                        fileName: fileName,
                        folder: sanitizedFolder,
                        tags: ['zynapse', 'batch-upload'],
                        useUniqueFileName: false
                    }, (error, result) => {
                        if (error) {
                            reject(error);
                        } else {
                            resolve(result);
                        }
                    });
                });
                
                results.push({
                    originalName: file.originalname,
                    fileName: uploadResult.name,
                    fileId: uploadResult.fileId,
                    url: uploadResult.url,
                    size: uploadResult.size,
                    success: true
                });
                
            } catch (error) {
                errors.push({
                    originalName: file.originalname,
                    error: error.message,
                    success: false
                });
            }
        }
        
        res.status(200).json({
            success: true,
            total: files.length,
            successful: results.length,
            failed: errors.length,
            results: results,
            errors: errors,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Batch upload error:', error);
        
        res.status(500).json({
            success: false,
            error: 'Batch upload failed',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// ====================
// Error Handling Middleware
// ====================

// 404 Handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: req.originalUrl,
        timestamp: new Date().toISOString()
    });
});

// Global error handler
app.use((error, req, res, next) => {
    console.error('Global error handler:', error);
    
    // Multer errors
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({
                success: false,
                error: `File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`,
                timestamp: new Date().toISOString()
            });
        }
        
        return res.status(400).json({
            success: false,
            error: 'File upload error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
    
    // Default error
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: NODE_ENV === 'development' ? error.message : 'An unexpected error occurred',
        timestamp: new Date().toISOString()
    });
});

// ====================
// Server Startup
// ====================

// Graceful shutdown
const gracefulShutdown = () => {
    console.log('Received shutdown signal, closing server gracefully...');
    
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
    
    // Force shutdown after 10 seconds
    setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, 10000);
};

// Start server
const server = app.listen(PORT, () => {
    console.log(`
    ===========================================
    Zynapse ImageKit Server
    ===========================================
    Environment: ${NODE_ENV}
    Server URL: http://localhost:${PORT}
    Health Check: http://localhost:${PORT}/health
    Auth Endpoint: http://localhost:${PORT}/auth
    Upload Endpoint: http://localhost:${PORT}/upload
    Max File Size: ${MAX_FILE_SIZE / (1024 * 1024)}MB
    ===========================================
    `);
});

// Handle shutdown signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = app;
