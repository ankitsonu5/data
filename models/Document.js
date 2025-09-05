const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Document title is required'],
        trim: true,
        maxlength: [200, 'Title cannot be more than 200 characters']
    },
    description: {
        type: String,
        trim: true,
        maxlength: [1000, 'Description cannot be more than 1000 characters']
    },
    fileName: {
        type: String,
        required: [true, 'File name is required']
    },
    originalName: {
        type: String,
        required: [true, 'Original file name is required']
    },
    filePath: {
        type: String,
        required: [true, 'File path is required']
    },
    fileSize: {
        type: Number,
        required: [true, 'File size is required']
    },
    mimeType: {
        type: String,
        required: [true, 'MIME type is required']
    },
    fileExtension: {
        type: String,
        required: [true, 'File extension is required']
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: [true, 'Category is required']
    },
    tags: [{
        type: String,
        trim: true
    }],
    metadata: {
        author: String,
        subject: String,
        keywords: [String],
        createdDate: Date,
        modifiedDate: Date,
        pageCount: Number,
        wordCount: Number
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Uploader is required']
    },
    department: {
        type: String,
        trim: true
    },
    version: {
        type: Number,
        default: 1
    },
    status: {
        type: String,
        enum: ['draft', 'pending', 'approved', 'rejected', 'archived'],
        default: 'pending'
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedAt: {
        type: Date
    },
    rejectionReason: {
        type: String,
        trim: true
    },
    expiryDate: {
        type: Date
    },
    isPublic: {
        type: Boolean,
        default: false
    },
    downloadCount: {
        type: Number,
        default: 0
    },
    viewCount: {
        type: Number,
        default: 0
    },
    shareCount: {
        type: Number,
        default: 0
    },
    permissions: {
        read: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }],
        write: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }],
        delete: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }]
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    deletedAt: {
        type: Date
    },
    deletedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Indexes for better query performance
documentSchema.index({ title: 'text', description: 'text', tags: 'text' });
documentSchema.index({ uploadedBy: 1 });
documentSchema.index({ category: 1 });
documentSchema.index({ status: 1 });
documentSchema.index({ department: 1 });
documentSchema.index({ createdAt: -1 });
documentSchema.index({ isActive: 1, isDeleted: 1 });
documentSchema.index({ expiryDate: 1 });

// Virtual for file URL
documentSchema.virtual('fileUrl').get(function() {
    return `/api/documents/${this._id}/download`;
});

// Virtual for preview URL
documentSchema.virtual('previewUrl').get(function() {
    return `/api/documents/${this._id}/preview`;
});

// Method to check if user has permission
documentSchema.methods.hasPermission = function(userId, permission = 'read') {
    // Admin and document owner always have full access
    if (this.uploadedBy.toString() === userId.toString()) {
        return true;
    }
    
    // Check specific permissions
    if (this.permissions[permission]) {
        return this.permissions[permission].includes(userId);
    }
    
    return false;
};

// Method to increment counters
documentSchema.methods.incrementCounter = function(counterType) {
    this[counterType] = (this[counterType] || 0) + 1;
    return this.save();
};

// Pre-save middleware
documentSchema.pre('save', function(next) {
    if (this.isModified('status') && this.status === 'approved') {
        this.approvedAt = new Date();
    }
    next();
});

// Ensure virtual fields are serialized
documentSchema.set('toJSON', {
    virtuals: true,
    transform: function(doc, ret) {
        delete ret._id;
        delete ret.__v;
        return ret;
    }
});

module.exports = mongoose.model('Document', documentSchema);
