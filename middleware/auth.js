const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

// Protect routes - verify JWT token
exports.protect = async (req, res, next) => {
    let token;
    
    // Get token from header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }
    
    // Make sure token exists
    if (!token) {
        return res.status(401).json({
            success: false,
            error: 'Not authorized to access this route'
        });
    }
    
    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Get user from token
        const user = await User.findById(decoded.id).select('+password');
        
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'No user found with this token'
            });
        }
        
        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                error: 'User account is deactivated'
            });
        }
        
        // Add user to request object
        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            error: 'Not authorized to access this route'
        });
    }
};

// Grant access to specific roles
exports.authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: `User role ${req.user.role} is not authorized to access this route`
            });
        }
        next();
    };
};

// Check if user owns the resource or has admin/manager role
exports.checkOwnership = (resourceModel, resourceIdParam = 'id') => {
    return async (req, res, next) => {
        try {
            const resourceId = req.params[resourceIdParam];
            const resource = await resourceModel.findById(resourceId);
            
            if (!resource) {
                return res.status(404).json({
                    success: false,
                    error: 'Resource not found'
                });
            }
            
            // Admin and manager have access to all resources
            if (req.user.role === 'admin' || req.user.role === 'manager') {
                req.resource = resource;
                return next();
            }
            
            // Check if user owns the resource
            const ownerField = resource.uploadedBy || resource.createdBy || resource.user;
            if (ownerField && ownerField.toString() === req.user.id) {
                req.resource = resource;
                return next();
            }
            
            // Check if user has specific permissions (for documents)
            if (resource.hasPermission && resource.hasPermission(req.user.id, 'read')) {
                req.resource = resource;
                return next();
            }
            
            return res.status(403).json({
                success: false,
                error: 'Not authorized to access this resource'
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                error: 'Server error while checking ownership'
            });
        }
    };
};

// Audit logging middleware
exports.auditLog = (action, resource) => {
    return async (req, res, next) => {
        const startTime = Date.now();
        
        // Store original res.json to capture response
        const originalJson = res.json;
        let responseData = null;
        let statusCode = 200;
        
        res.json = function(data) {
            responseData = data;
            statusCode = res.statusCode;
            return originalJson.call(this, data);
        };
        
        // Continue with the request
        res.on('finish', async () => {
            const duration = Date.now() - startTime;
            const status = statusCode >= 400 ? 'failure' : 'success';
            
            // Only log if user is authenticated (except for login/register)
            if (!req.user && !['login', 'user_create'].includes(action)) {
                return;
            }

            // Only log if we have required fields
            const userId = req.user ? req.user.id : null;
            const resourceId = req.params.id || req.body.id || (req.user ? req.user.id : null) || 'system';

            if (userId && resourceId) {
                const logData = {
                    userId: userId,
                    action: action,
                    resource: resource,
                    resourceId: resourceId,
                    details: {
                        method: req.method,
                        url: req.originalUrl,
                        params: req.params,
                        query: req.query,
                        statusCode: statusCode,
                        responseSuccess: responseData ? responseData.success : null
                    },
                    ipAddress: req.ip || req.connection.remoteAddress || '127.0.0.1',
                    userAgent: req.get('User-Agent') || 'Unknown',
                    sessionId: req.sessionID || 'no-session',
                    status: status,
                    errorMessage: status === 'failure' && responseData ? responseData.error : null,
                    duration: duration
                };

                try {
                    await AuditLog.logAction(logData);
                } catch (error) {
                    console.error('Failed to create audit log:', error.message);
                }
            }
        });
        
        next();
    };
};

// Rate limiting for sensitive operations
exports.rateLimitSensitive = require('express-rate-limit')({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs
    message: {
        success: false,
        error: 'Too many attempts, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Rate limiting for general API
exports.rateLimitGeneral = require('express-rate-limit')({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
        success: false,
        error: 'Too many requests, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Validate request data
exports.validateRequest = (validationRules) => {
    return async (req, res, next) => {
        const { validationResult } = require('express-validator');
        
        // Run validations
        await Promise.all(validationRules.map(validation => validation.run(req)));
        
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors.array()
            });
        }
        
        next();
    };
};
