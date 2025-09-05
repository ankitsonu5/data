const express = require('express');
const { body, query } = require('express-validator');
const Category = require('../models/Category');
const Document = require('../models/Document');
const { protect, authorize, validateRequest, auditLog } = require('../middleware/auth');

const router = express.Router();

// All routes are protected
router.use(protect);

// @desc    Get all categories (tree structure)
// @route   GET /api/categories
// @access  Private
router.get('/', async (req, res) => {
    try {
        const includeInactive = req.query.includeInactive === 'true' && 
                               (req.user.role === 'admin' || req.user.role === 'manager');
        
        let query = {};
        if (!includeInactive) {
            query.isActive = true;
        }
        
        if (req.query.flat === 'true') {
            // Return flat list
            const categories = await Category.find(query)
                .populate('createdBy', 'name email')
                .populate('parent', 'name')
                .sort({ path: 1 });
            
            res.status(200).json({
                success: true,
                data: categories
            });
        } else {
            // Return tree structure
            const categoryTree = await Category.buildTree();
            
            res.status(200).json({
                success: true,
                data: { categories: categoryTree }
            });
        }
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error while fetching categories'
        });
    }
});

// @desc    Get single category
// @route   GET /api/categories/:id
// @access  Private
router.get('/:id', async (req, res) => {
    try {
        const category = await Category.findById(req.params.id)
            .populate('createdBy', 'name email')
            .populate('parent', 'name')
            .populate('approvers', 'name email')
            .populate('permissions.upload', 'name email')
            .populate('permissions.view', 'name email')
            .populate('permissions.manage', 'name email');
        
        if (!category) {
            return res.status(404).json({
                success: false,
                error: 'Category not found'
            });
        }
        
        // Get children categories
        const children = await category.getChildren();
        
        // Get full path
        const fullPath = await category.getFullPath();
        
        res.status(200).json({
            success: true,
            data: {
                ...category.toJSON(),
                fullPath,
                children
            }
        });
    } catch (error) {
        console.error('Get category error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error while fetching category'
        });
    }
});

// @desc    Create category
// @route   POST /api/categories
// @access  Private (Admin, Manager)
router.post('/',
    authorize('admin', 'manager'),
    validateRequest([
        body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
        body('description').optional().trim().isLength({ max: 500 }).withMessage('Description too long'),
        body('parent').optional().isMongoId().withMessage('Invalid parent category ID'),
        body('icon').optional().trim(),
        body('color').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Invalid color format'),
        body('allowedFileTypes').optional().isArray().withMessage('Allowed file types must be an array'),
        body('maxFileSize').optional().isInt({ min: 1 }).withMessage('Max file size must be a positive integer'),
        body('requiresApproval').optional().isBoolean().withMessage('Requires approval must be boolean')
    ]),
    auditLog('category_create', 'category'),
    async (req, res) => {
        try {
            const {
                name,
                description,
                parent,
                icon,
                color,
                allowedFileTypes,
                maxFileSize,
                requiresApproval,
                approvers,
                permissions
            } = req.body;
            
            // Check if parent exists
            if (parent) {
                const parentCategory = await Category.findById(parent);
                if (!parentCategory) {
                    return res.status(400).json({
                        success: false,
                        error: 'Parent category not found'
                    });
                }
            }
            
            const category = await Category.create({
                name,
                description,
                parent: parent || null,
                icon: icon || 'folder',
                color: color || '#007bff',
                allowedFileTypes: allowedFileTypes || [],
                maxFileSize: maxFileSize || 50 * 1024 * 1024,
                requiresApproval: requiresApproval !== undefined ? requiresApproval : true,
                approvers: approvers || [],
                permissions: permissions || {},
                createdBy: req.user.id
            });
            
            await category.populate('createdBy', 'name email');
            
            res.status(201).json({
                success: true,
                message: 'Category created successfully',
                data: { category }
            });
        } catch (error) {
            console.error('Create category error:', error);
            
            if (error.code === 11000) {
                return res.status(400).json({
                    success: false,
                    error: 'Category with this name already exists'
                });
            }
            
            res.status(500).json({
                success: false,
                error: 'Server error while creating category'
            });
        }
    }
);

// @desc    Update category
// @route   PUT /api/categories/:id
// @access  Private (Admin, Manager)
router.put('/:id',
    authorize('admin', 'manager'),
    validateRequest([
        body('name').optional().trim().isLength({ min: 2, max: 100 }),
        body('description').optional().trim().isLength({ max: 500 }),
        body('parent').optional().isMongoId(),
        body('icon').optional().trim(),
        body('color').optional().matches(/^#[0-9A-F]{6}$/i),
        body('allowedFileTypes').optional().isArray(),
        body('maxFileSize').optional().isInt({ min: 1 }),
        body('requiresApproval').optional().isBoolean(),
        body('isActive').optional().isBoolean()
    ]),
    auditLog('category_update', 'category'),
    async (req, res) => {
        try {
            const category = await Category.findById(req.params.id);
            
            if (!category) {
                return res.status(404).json({
                    success: false,
                    error: 'Category not found'
                });
            }
            
            // Check if trying to set parent to itself or its descendant
            if (req.body.parent) {
                if (req.body.parent === req.params.id) {
                    return res.status(400).json({
                        success: false,
                        error: 'Category cannot be its own parent'
                    });
                }
                
                // Check if new parent exists
                const parentCategory = await Category.findById(req.body.parent);
                if (!parentCategory) {
                    return res.status(400).json({
                        success: false,
                        error: 'Parent category not found'
                    });
                }
            }
            
            const updatedCategory = await Category.findByIdAndUpdate(
                req.params.id,
                req.body,
                { new: true, runValidators: true }
            ).populate('createdBy', 'name email');
            
            res.status(200).json({
                success: true,
                message: 'Category updated successfully',
                data: { category: updatedCategory }
            });
        } catch (error) {
            console.error('Update category error:', error);
            
            if (error.code === 11000) {
                return res.status(400).json({
                    success: false,
                    error: 'Category with this name already exists'
                });
            }
            
            res.status(500).json({
                success: false,
                error: 'Server error while updating category'
            });
        }
    }
);

// @desc    Delete category
// @route   DELETE /api/categories/:id
// @access  Private (Admin only)
router.delete('/:id',
    authorize('admin'),
    auditLog('category_delete', 'category'),
    async (req, res) => {
        try {
            const category = await Category.findById(req.params.id);
            
            if (!category) {
                return res.status(404).json({
                    success: false,
                    error: 'Category not found'
                });
            }
            
            // Check if category has documents
            const documentCount = await Document.countDocuments({ 
                category: req.params.id,
                isDeleted: false 
            });
            
            if (documentCount > 0) {
                return res.status(400).json({
                    success: false,
                    error: `Cannot delete category. It contains ${documentCount} documents.`
                });
            }
            
            // Check if category has children
            const childrenCount = await Category.countDocuments({ 
                parent: req.params.id,
                isActive: true 
            });
            
            if (childrenCount > 0) {
                return res.status(400).json({
                    success: false,
                    error: `Cannot delete category. It has ${childrenCount} subcategories.`
                });
            }
            
            // Soft delete
            category.isActive = false;
            await category.save();
            
            res.status(200).json({
                success: true,
                message: 'Category deleted successfully'
            });
        } catch (error) {
            console.error('Delete category error:', error);
            res.status(500).json({
                success: false,
                error: 'Server error while deleting category'
            });
        }
    }
);

// @desc    Get category documents
// @route   GET /api/categories/:id/documents
// @access  Private
router.get('/:id/documents',
    validateRequest([
        query('page').optional().isInt({ min: 1 }),
        query('limit').optional().isInt({ min: 1, max: 100 }),
        query('status').optional().isIn(['draft', 'pending', 'approved', 'rejected', 'archived'])
    ]),
    async (req, res) => {
        try {
            const category = await Category.findById(req.params.id);
            
            if (!category) {
                return res.status(404).json({
                    success: false,
                    error: 'Category not found'
                });
            }
            
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const skip = (page - 1) * limit;
            
            const query = {
                category: req.params.id,
                isDeleted: false,
                isActive: true
            };
            
            if (req.query.status) {
                query.status = req.query.status;
            }
            
            // Filter based on user role and permissions
            if (req.user.role === 'user') {
                query.$or = [
                    { uploadedBy: req.user.id },
                    { 'permissions.read': req.user.id },
                    { isPublic: true }
                ];
            }
            
            const documents = await Document.find(query)
                .populate('uploadedBy', 'name email')
                .populate('approvedBy', 'name email')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit);
            
            const total = await Document.countDocuments(query);
            
            res.status(200).json({
                success: true,
                data: {
                    documents,
                    pagination: {
                        page,
                        limit,
                        total,
                        pages: Math.ceil(total / limit)
                    }
                }
            });
        } catch (error) {
            console.error('Get category documents error:', error);
            res.status(500).json({
                success: false,
                error: 'Server error while fetching category documents'
            });
        }
    }
);

module.exports = router;
