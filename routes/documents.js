const express = require('express');
const { body, query } = require('express-validator');
const path = require('path');
const fs = require('fs');
const Document = require('../models/Document');
const DocumentVersion = require('../models/DocumentVersion');
const Category = require('../models/Category');
const { protect, authorize, validateRequest, auditLog, checkOwnership } = require('../middleware/auth');
const { uploadSingle, uploadMultiple, generateChecksum, getFileMetadata, deleteFile } = require('../middleware/upload');

const router = express.Router();

// All routes are protected
router.use(protect);

// @desc    Upload document
// @route   POST /api/documents
// @access  Private
router.post('/',
    uploadSingle('file'),
    validateRequest([
        body('title').trim().isLength({ min: 2, max: 200 }).withMessage('Title must be between 2 and 200 characters'),
        body('description').optional().trim().isLength({ max: 1000 }).withMessage('Description too long'),
        body('category').isMongoId().withMessage('Valid category ID is required'),
        body('tags').optional().custom((value) => {
            if (typeof value === 'string') {
                try {
                    JSON.parse(value);
                    return true;
                } catch (e) {
                    throw new Error('Tags must be a valid JSON array');
                }
            }
            return Array.isArray(value);
        }).withMessage('Tags must be an array or valid JSON array string'),
        body('department').optional().trim(),
        body('expiryDate').optional().isISO8601().withMessage('Invalid expiry date format')
    ]),
    auditLog('document_upload', 'document'),
    async (req, res) => {
        try {
            let { title, description, category, tags, department, expiryDate } = req.body;

            // Parse tags if it's a JSON string
            if (typeof tags === 'string') {
                try {
                    tags = JSON.parse(tags);
                } catch (e) {
                    tags = [];
                }
            }
            
            // Check if category exists and user has upload permission
            const categoryDoc = await Category.findById(category);
            if (!categoryDoc) {
                // Clean up uploaded file
                await deleteFile(req.file.path);
                return res.status(400).json({
                    success: false,
                    error: 'Category not found'
                });
            }
            
            // Check file type against category restrictions
            const fileExtension = path.extname(req.file.originalname).toLowerCase().substring(1);
            if (categoryDoc.allowedFileTypes.length > 0 && 
                !categoryDoc.allowedFileTypes.includes(fileExtension)) {
                await deleteFile(req.file.path);
                return res.status(400).json({
                    success: false,
                    error: `File type .${fileExtension} not allowed in this category. Allowed types: ${categoryDoc.allowedFileTypes.join(', ')}`
                });
            }
            
            // Check file size against category restrictions
            if (req.file.size > categoryDoc.maxFileSize) {
                await deleteFile(req.file.path);
                return res.status(400).json({
                    success: false,
                    error: `File size exceeds category limit of ${Math.round(categoryDoc.maxFileSize / 1024 / 1024)}MB`
                });
            }
            
            // Generate file checksum
            const checksum = await generateChecksum(req.file.path);
            
            // Get file metadata
            const fileMetadata = getFileMetadata(req.file);
            
            // Create document
            const document = await Document.create({
                title,
                description,
                fileName: fileMetadata.fileName,
                originalName: fileMetadata.originalName,
                filePath: fileMetadata.filePath,
                fileSize: fileMetadata.fileSize,
                mimeType: fileMetadata.mimeType,
                fileExtension: fileMetadata.fileExtension,
                category,
                tags: tags || [],
                uploadedBy: req.user.id,
                department: department || req.user.department,
                expiryDate: expiryDate ? new Date(expiryDate) : null,
                status: categoryDoc.requiresApproval ? 'pending' : 'approved'
            });
            
            // Create initial version
            await DocumentVersion.create({
                document: document._id,
                version: 1,
                fileName: fileMetadata.fileName,
                originalName: fileMetadata.originalName,
                filePath: fileMetadata.filePath,
                fileSize: fileMetadata.fileSize,
                mimeType: fileMetadata.mimeType,
                checksum,
                uploadedBy: req.user.id,
                metadata: {
                    // Additional metadata can be extracted here
                    // using libraries like pdf-parse, mammoth, etc.
                }
            });
            
            // Update category document count
            categoryDoc.documentCount = (categoryDoc.documentCount || 0) + 1;
            await categoryDoc.save();
            
            // Populate response data
            await document.populate([
                { path: 'uploadedBy', select: 'name email' },
                { path: 'category', select: 'name' }
            ]);
            
            res.status(201).json({
                success: true,
                message: 'Document uploaded successfully',
                data: { document }
            });
        } catch (error) {
            // Clean up uploaded file on error
            if (req.file) {
                await deleteFile(req.file.path);
            }
            
            console.error('Document upload error:', error);
            res.status(500).json({
                success: false,
                error: 'Server error while uploading document'
            });
        }
    }
);

// @desc    Get all documents
// @route   GET /api/documents
// @access  Private
router.get('/',
    validateRequest([
        query('page').optional().isInt({ min: 1 }),
        query('limit').optional().isInt({ min: 1, max: 100 }),
        query('category').optional().isMongoId(),
        query('status').optional().isIn(['draft', 'pending', 'approved', 'rejected', 'archived']),
        query('search').optional().trim(),
        query('tags').optional(),
        query('department').optional().trim(),
        query('uploadedBy').optional().isMongoId(),
        query('sortBy').optional().isIn(['createdAt', 'title', 'fileSize', 'downloadCount']),
        query('sortOrder').optional().isIn(['asc', 'desc'])
    ]),
    async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const skip = (page - 1) * limit;
            
            // Build query
            const query = {
                isDeleted: false,
                isActive: true
            };
            
            // Filter by category
            if (req.query.category) {
                query.category = req.query.category;
            }
            
            // Filter by status
            if (req.query.status) {
                query.status = req.query.status;
            } else if (req.user.role === 'user') {
                // Regular users can only see approved documents or their own
                query.$or = [
                    { status: 'approved' },
                    { uploadedBy: req.user.id }
                ];
            }
            
            // Filter by department
            if (req.query.department) {
                query.department = new RegExp(req.query.department, 'i');
            }
            
            // Filter by uploader
            if (req.query.uploadedBy) {
                query.uploadedBy = req.query.uploadedBy;
            }
            
            // Search functionality
            if (req.query.search) {
                query.$text = { $search: req.query.search };
            }
            
            // Filter by tags
            if (req.query.tags) {
                const tags = Array.isArray(req.query.tags) ? req.query.tags : [req.query.tags];
                query.tags = { $in: tags };
            }
            
            // Permission-based filtering for regular users
            if (req.user.role === 'user') {
                query.$or = [
                    { uploadedBy: req.user.id },
                    { 'permissions.read': req.user.id },
                    { isPublic: true },
                    ...(query.$or || [])
                ];
            }
            
            // Sort options
            const sortBy = req.query.sortBy || 'createdAt';
            const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
            const sort = { [sortBy]: sortOrder };
            
            // Execute query
            const documents = await Document.find(query)
                .populate('uploadedBy', 'name email')
                .populate('category', 'name color icon')
                .populate('approvedBy', 'name email')
                .sort(sort)
                .skip(skip)
                .limit(limit);
            
            const total = await Document.countDocuments(query);
            
            res.status(200).json({
                success: true,
                data: documents,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            });
        } catch (error) {
            console.error('Get documents error:', error);
            res.status(500).json({
                success: false,
                error: 'Server error while fetching documents'
            });
        }
    }
);

// @desc    Get single document
// @route   GET /api/documents/:id
// @access  Private
router.get('/:id',
    checkOwnership(Document),
    auditLog('document_view', 'document'),
    async (req, res) => {
        try {
            const document = req.resource; // Set by checkOwnership middleware
            
            // Increment view count
            await document.incrementCounter('viewCount');
            
            // Get version history
            const versions = await DocumentVersion.getVersionHistory(document._id);
            
            await document.populate([
                { path: 'uploadedBy', select: 'name email department' },
                { path: 'category', select: 'name color icon path' },
                { path: 'approvedBy', select: 'name email' }
            ]);
            
            res.status(200).json({
                success: true,
                data: {
                    document,
                    versions
                }
            });
        } catch (error) {
            console.error('Get document error:', error);
            res.status(500).json({
                success: false,
                error: 'Server error while fetching document'
            });
        }
    }
);

// @desc    Download document
// @route   GET /api/documents/:id/download
// @access  Private
router.get('/:id/download',
    checkOwnership(Document),
    auditLog('document_download', 'document'),
    async (req, res) => {
        try {
            const document = req.resource;

            // Check if file exists
            if (!fs.existsSync(document.filePath)) {
                return res.status(404).json({
                    success: false,
                    error: 'File not found on server'
                });
            }

            // Increment download count
            await document.incrementCounter('downloadCount');

            // Set headers for file download
            res.setHeader('Content-Disposition', `attachment; filename="${document.originalName}"`);
            res.setHeader('Content-Type', document.mimeType);
            res.setHeader('Content-Length', document.fileSize);

            // Stream file to response
            const fileStream = fs.createReadStream(document.filePath);
            fileStream.pipe(res);

        } catch (error) {
            console.error('Download document error:', error);
            res.status(500).json({
                success: false,
                error: 'Server error while downloading document'
            });
        }
    }
);

// @desc    Update document
// @route   PUT /api/documents/:id
// @access  Private
router.put('/:id',
    checkOwnership(Document),
    validateRequest([
        body('title').optional().trim().isLength({ min: 2, max: 200 }),
        body('description').optional().trim().isLength({ max: 1000 }),
        body('tags').optional().isArray(),
        body('expiryDate').optional().isISO8601(),
        body('isPublic').optional().isBoolean()
    ]),
    auditLog('document_update', 'document'),
    async (req, res) => {
        try {
            const document = req.resource;
            const { title, description, tags, expiryDate, isPublic } = req.body;

            // Update document
            const updatedDocument = await Document.findByIdAndUpdate(
                req.params.id,
                {
                    title,
                    description,
                    tags,
                    expiryDate: expiryDate ? new Date(expiryDate) : document.expiryDate,
                    isPublic
                },
                { new: true, runValidators: true }
            ).populate([
                { path: 'uploadedBy', select: 'name email' },
                { path: 'category', select: 'name color icon' },
                { path: 'approvedBy', select: 'name email' }
            ]);

            res.status(200).json({
                success: true,
                message: 'Document updated successfully',
                data: { document: updatedDocument }
            });
        } catch (error) {
            console.error('Update document error:', error);
            res.status(500).json({
                success: false,
                error: 'Server error while updating document'
            });
        }
    }
);

// @desc    Delete document
// @route   DELETE /api/documents/:id
// @access  Private
router.delete('/:id',
    checkOwnership(Document),
    auditLog('document_delete', 'document'),
    async (req, res) => {
        try {
            const document = req.resource;

            // Soft delete
            document.isDeleted = true;
            document.deletedAt = new Date();
            document.deletedBy = req.user.id;
            await document.save();

            // Update category document count
            const category = await Category.findById(document.category);
            if (category) {
                category.documentCount = Math.max(0, (category.documentCount || 1) - 1);
                await category.save();
            }

            res.status(200).json({
                success: true,
                message: 'Document deleted successfully'
            });
        } catch (error) {
            console.error('Delete document error:', error);
            res.status(500).json({
                success: false,
                error: 'Server error while deleting document'
            });
        }
    }
);

// @desc    Approve/Reject document
// @route   PUT /api/documents/:id/approval
// @access  Private (Manager, Admin)
router.put('/:id/approval',
    authorize('admin', 'manager'),
    validateRequest([
        body('status').isIn(['approved', 'rejected']).withMessage('Status must be approved or rejected'),
        body('rejectionReason').optional().trim().isLength({ max: 500 }).withMessage('Rejection reason too long')
    ]),
    auditLog('document_approve', 'document'),
    async (req, res) => {
        try {
            const { status, rejectionReason } = req.body;

            const document = await Document.findById(req.params.id);
            if (!document) {
                return res.status(404).json({
                    success: false,
                    error: 'Document not found'
                });
            }

            if (document.status !== 'pending') {
                return res.status(400).json({
                    success: false,
                    error: 'Document is not pending approval'
                });
            }

            // Update document status
            document.status = status;
            document.approvedBy = req.user.id;
            document.approvedAt = new Date();

            if (status === 'rejected' && rejectionReason) {
                document.rejectionReason = rejectionReason;
            }

            await document.save();

            await document.populate([
                { path: 'uploadedBy', select: 'name email' },
                { path: 'approvedBy', select: 'name email' },
                { path: 'category', select: 'name' }
            ]);

            res.status(200).json({
                success: true,
                message: `Document ${status} successfully`,
                data: { document }
            });
        } catch (error) {
            console.error('Approve document error:', error);
            res.status(500).json({
                success: false,
                error: 'Server error while processing approval'
            });
        }
    }
);

module.exports = router;
