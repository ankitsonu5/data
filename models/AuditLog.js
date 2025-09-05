const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User is required']
    },
    action: {
        type: String,
        required: [true, 'Action is required'],
        enum: [
            // Authentication actions
            'login', 'logout', 'password_change', 'password_reset',
            
            // Document actions
            'document_upload', 'document_view', 'document_download', 
            'document_update', 'document_delete', 'document_share',
            'document_approve', 'document_reject', 'document_archive',
            
            // Version actions
            'version_create', 'version_rollback', 'version_delete',
            
            // Category actions
            'category_create', 'category_update', 'category_delete',
            
            // User management actions
            'user_create', 'user_update', 'user_delete', 'user_activate', 'user_deactivate',
            
            // Permission actions
            'permission_grant', 'permission_revoke',
            
            // System actions
            'system_backup', 'system_restore', 'system_maintenance'
        ]
    },
    resource: {
        type: String,
        enum: ['document', 'user', 'category', 'system', 'version'],
        required: [true, 'Resource type is required']
    },
    resourceId: {
        type: mongoose.Schema.Types.ObjectId,
        required: function() {
            return this.resource !== 'system';
        }
    },
    details: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    ipAddress: {
        type: String,
        required: [true, 'IP address is required']
    },
    userAgent: {
        type: String,
        required: [true, 'User agent is required']
    },
    sessionId: {
        type: String
    },
    status: {
        type: String,
        enum: ['success', 'failure', 'warning'],
        default: 'success'
    },
    errorMessage: {
        type: String
    },
    duration: {
        type: Number // in milliseconds
    },
    timestamp: {
        type: Date,
        default: Date.now,
        required: true
    }
}, {
    timestamps: false // We're using custom timestamp field
});

// Indexes for better query performance
auditLogSchema.index({ user: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ resource: 1, resourceId: 1, timestamp: -1 });
auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ ipAddress: 1 });
auditLogSchema.index({ status: 1 });

// Static method to log an action
auditLogSchema.statics.logAction = async function(logData) {
    try {
        const log = new this({
            user: logData.userId,
            action: logData.action,
            resource: logData.resource,
            resourceId: logData.resourceId,
            details: logData.details || {},
            ipAddress: logData.ipAddress,
            userAgent: logData.userAgent,
            sessionId: logData.sessionId,
            status: logData.status || 'success',
            errorMessage: logData.errorMessage,
            duration: logData.duration,
            timestamp: new Date()
        });
        
        await log.save();
        return log;
    } catch (error) {
        console.error('Failed to create audit log:', error);
        // Don't throw error to avoid breaking the main operation
        return null;
    }
};

// Static method to get user activity
auditLogSchema.statics.getUserActivity = function(userId, options = {}) {
    const query = { user: userId };
    
    if (options.startDate) {
        query.timestamp = { $gte: options.startDate };
    }
    
    if (options.endDate) {
        query.timestamp = { ...query.timestamp, $lte: options.endDate };
    }
    
    if (options.action) {
        query.action = options.action;
    }
    
    if (options.resource) {
        query.resource = options.resource;
    }
    
    return this.find(query)
        .populate('user', 'name email')
        .sort({ timestamp: -1 })
        .limit(options.limit || 100);
};

// Static method to get resource activity
auditLogSchema.statics.getResourceActivity = function(resource, resourceId, options = {}) {
    const query = { resource, resourceId };
    
    if (options.startDate) {
        query.timestamp = { $gte: options.startDate };
    }
    
    if (options.endDate) {
        query.timestamp = { ...query.timestamp, $lte: options.endDate };
    }
    
    return this.find(query)
        .populate('user', 'name email')
        .sort({ timestamp: -1 })
        .limit(options.limit || 50);
};

// Static method to get system statistics
auditLogSchema.statics.getSystemStats = function(startDate, endDate) {
    const matchStage = {
        timestamp: {
            $gte: startDate,
            $lte: endDate
        }
    };
    
    return this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: {
                    action: '$action',
                    status: '$status'
                },
                count: { $sum: 1 },
                avgDuration: { $avg: '$duration' }
            }
        },
        {
            $group: {
                _id: '$_id.action',
                total: { $sum: '$count' },
                success: {
                    $sum: {
                        $cond: [{ $eq: ['$_id.status', 'success'] }, '$count', 0]
                    }
                },
                failure: {
                    $sum: {
                        $cond: [{ $eq: ['$_id.status', 'failure'] }, '$count', 0]
                    }
                },
                avgDuration: { $avg: '$avgDuration' }
            }
        },
        { $sort: { total: -1 } }
    ]);
};

// Ensure virtual fields are serialized
auditLogSchema.set('toJSON', {
    transform: function(doc, ret) {
        delete ret._id;
        delete ret.__v;
        return ret;
    }
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
