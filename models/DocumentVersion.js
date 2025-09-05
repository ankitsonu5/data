const mongoose = require('mongoose');

const documentVersionSchema = new mongoose.Schema({
    document: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Document',
        required: [true, 'Document reference is required']
    },
    version: {
        type: Number,
        required: [true, 'Version number is required']
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
    checksum: {
        type: String,
        required: [true, 'File checksum is required']
    },
    changes: {
        type: String,
        trim: true,
        maxlength: [1000, 'Changes description cannot be more than 1000 characters']
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Uploader is required']
    },
    uploadedAt: {
        type: Date,
        default: Date.now
    },
    metadata: {
        author: String,
        subject: String,
        keywords: [String],
        createdDate: Date,
        modifiedDate: Date,
        pageCount: Number,
        wordCount: Number
    },
    isActive: {
        type: Boolean,
        default: true
    },
    downloadCount: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Compound index for document and version
documentVersionSchema.index({ document: 1, version: 1 }, { unique: true });
documentVersionSchema.index({ document: 1, uploadedAt: -1 });
documentVersionSchema.index({ uploadedBy: 1 });
documentVersionSchema.index({ isActive: 1 });

// Virtual for file URL
documentVersionSchema.virtual('fileUrl').get(function() {
    return `/api/documents/${this.document}/versions/${this.version}/download`;
});

// Method to increment download counter
documentVersionSchema.methods.incrementDownloadCount = function() {
    this.downloadCount = (this.downloadCount || 0) + 1;
    return this.save();
};

// Static method to get latest version for a document
documentVersionSchema.statics.getLatestVersion = function(documentId) {
    return this.findOne({ 
        document: documentId, 
        isActive: true 
    }).sort({ version: -1 });
};

// Static method to get version history for a document
documentVersionSchema.statics.getVersionHistory = function(documentId) {
    return this.find({ 
        document: documentId, 
        isActive: true 
    })
    .populate('uploadedBy', 'name email')
    .sort({ version: -1 });
};

// Ensure virtual fields are serialized
documentVersionSchema.set('toJSON', {
    virtuals: true,
    transform: function(doc, ret) {
        delete ret._id;
        delete ret.__v;
        return ret;
    }
});

module.exports = mongoose.model('DocumentVersion', documentVersionSchema);
