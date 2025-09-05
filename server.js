require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const connectDB = require('./config/database');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const categoryRoutes = require('./routes/categories');
const documentRoutes = require('./routes/documents');

// Connect to MongoDB
connectDB();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
    contentSecurityPolicy: false // Disable for development, enable in production
}));

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Resolve Angular build output directory robustly
const browserRoot = fs.existsSync(path.join(__dirname, 'public', 'browser', 'index.html'))
  ? path.join(__dirname, 'public', 'browser')
  : fs.existsSync(path.join(__dirname, 'public', 'browser', 'browser', 'index.html'))
    ? path.join(__dirname, 'public', 'browser', 'browser')
    : path.join(__dirname, 'public', 'browser');

// Serve static files from resolved directory without auto-index
console.log('Static root resolved to:', browserRoot);
app.use(express.static(browserRoot, { index: false }));

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/documents', documentRoutes);

// API Routes
app.get('/api', (req, res) => {
    res.json({
        message: 'Welcome to Document Management System API!',
        status: 'Server is running successfully',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
});

app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        database: 'Connected'
    });
});

// Document Management System routes will be added here

// Serve Angular app for all non-API routes (single handler, Express v5 safe)
app.use((req, res) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({
            success: false,
            error: 'API route not found',
            path: req.originalUrl
        });
    }

    // Serve index.html from resolved browserRoot
    const indexPathPrimary = path.join(browserRoot, 'index.html');
    if (fs.existsSync(indexPathPrimary)) {
        return res.sendFile(indexPathPrimary);
    }

    // Fallback: try nested path if somehow misbuilt
    const nestedIndex = path.join(__dirname, 'public', 'browser', 'browser', 'index.html');
    if (fs.existsSync(nestedIndex)) {
        return res.sendFile(nestedIndex);
    }

    // If not found, return a clear error
    return res.status(500).json({
        error: 'Frontend build not found',
        tried: [indexPathPrimary, nestedIndex]
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Something went wrong!',
        message: err.message
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    console.log(`👥 Users API: http://localhost:${PORT}/api/users`);
});

module.exports = app;
