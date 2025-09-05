const express = require('express');
const { body, query } = require('express-validator');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { protect, authorize, validateRequest, auditLog } = require('../middleware/auth');

const router = express.Router();

// All routes are protected and require authentication
router.use(protect);

// @desc    Get all users
// @route   GET /api/users
// @access  Private (Admin, Manager)
router.get('/',
    authorize('admin', 'manager'),
    validateRequest([
        query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
        query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
        query('role').optional().isIn(['admin', 'manager', 'user']).withMessage('Invalid role filter'),
        query('department').optional().trim(),
        query('search').optional().trim()
    ]),
    async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const skip = (page - 1) * limit;
            
            // Build query
            const query = { isActive: true };
            
            if (req.query.role) {
                query.role = req.query.role;
            }
            
            if (req.query.department) {
                query.department = new RegExp(req.query.department, 'i');
            }
            
            if (req.query.search) {
                query.$or = [
                    { name: new RegExp(req.query.search, 'i') },
                    { email: new RegExp(req.query.search, 'i') }
                ];
            }
            
            // Get users with pagination
            const users = await User.find(query)
                .select('-password -resetPasswordToken -resetPasswordExpire')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit);
            
            const total = await User.countDocuments(query);
            
            res.status(200).json({
                success: true,
                data: users,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            });
        } catch (error) {
            console.error('Get users error:', error);
            res.status(500).json({
                success: false,
                error: 'Server error while fetching users'
            });
        }
    }
);

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private (Admin, Manager, Own profile)
router.get('/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .select('-password -resetPasswordToken -resetPasswordExpire');
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        
        // Check if user can access this profile
        if (req.user.role !== 'admin' && 
            req.user.role !== 'manager' && 
            req.user.id !== req.params.id) {
            return res.status(403).json({
                success: false,
                error: 'Not authorized to access this user profile'
            });
        }
        
        res.status(200).json({
            success: true,
            data: { user }
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error while fetching user'
        });
    }
});

// @desc    Create user
// @route   POST /api/users
// @access  Private (Admin only)
router.post('/',
    authorize('admin'),
    validateRequest([
        body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
        body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
        body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
        body('role').isIn(['admin', 'manager', 'user']).withMessage('Invalid role'),
        body('department').optional().trim().isLength({ max: 100 }).withMessage('Department name too long')
    ]),
    auditLog('user_create', 'user'),
    async (req, res) => {
        try {
            const { name, email, password, role, department, phone } = req.body;
            
            // Check if user already exists
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    error: 'User already exists with this email'
                });
            }
            
            // Create user
            const user = await User.create({
                name,
                email,
                password,
                role,
                department,
                phone
            });
            
            res.status(201).json({
                success: true,
                message: 'User created successfully',
                data: {
                    user: {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        role: user.role,
                        department: user.department,
                        phone: user.phone,
                        isActive: user.isActive,
                        createdAt: user.createdAt
                    }
                }
            });
        } catch (error) {
            console.error('Create user error:', error);
            res.status(500).json({
                success: false,
                error: 'Server error while creating user'
            });
        }
    }
);

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private (Admin, Manager for users, Own profile)
router.put('/:id',
    validateRequest([
        body('name').optional().trim().isLength({ min: 2, max: 50 }),
        body('role').optional().isIn(['admin', 'manager', 'user']),
        body('department').optional().trim().isLength({ max: 100 }),
        body('phone').optional().trim(),
        body('isActive').optional().isBoolean()
    ]),
    auditLog('user_update', 'user'),
    async (req, res) => {
        try {
            const user = await User.findById(req.params.id);
            
            if (!user) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }
            
            // Check permissions
            const canUpdate = req.user.role === 'admin' || 
                             (req.user.role === 'manager' && user.role === 'user') ||
                             req.user.id === req.params.id;
            
            if (!canUpdate) {
                return res.status(403).json({
                    success: false,
                    error: 'Not authorized to update this user'
                });
            }
            
            // Prevent non-admin from changing role
            if (req.body.role && req.user.role !== 'admin') {
                delete req.body.role;
            }
            
            // Prevent non-admin from changing isActive
            if (req.body.hasOwnProperty('isActive') && req.user.role !== 'admin') {
                delete req.body.isActive;
            }
            
            const updatedUser = await User.findByIdAndUpdate(
                req.params.id,
                req.body,
                { new: true, runValidators: true }
            ).select('-password -resetPasswordToken -resetPasswordExpire');
            
            res.status(200).json({
                success: true,
                message: 'User updated successfully',
                data: { user: updatedUser }
            });
        } catch (error) {
            console.error('Update user error:', error);
            res.status(500).json({
                success: false,
                error: 'Server error while updating user'
            });
        }
    }
);

// @desc    Deactivate user
// @route   DELETE /api/users/:id
// @access  Private (Admin only)
router.delete('/:id',
    authorize('admin'),
    auditLog('user_deactivate', 'user'),
    async (req, res) => {
        try {
            const user = await User.findById(req.params.id);
            
            if (!user) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }
            
            // Prevent admin from deactivating themselves
            if (req.user.id === req.params.id) {
                return res.status(400).json({
                    success: false,
                    error: 'Cannot deactivate your own account'
                });
            }
            
            user.isActive = false;
            await user.save();
            
            res.status(200).json({
                success: true,
                message: 'User deactivated successfully'
            });
        } catch (error) {
            console.error('Deactivate user error:', error);
            res.status(500).json({
                success: false,
                error: 'Server error while deactivating user'
            });
        }
    }
);

// @desc    Get user activity logs
// @route   GET /api/users/:id/activity
// @access  Private (Admin, Manager, Own activity)
router.get('/:id/activity', async (req, res) => {
    try {
        // Check permissions
        const canView = req.user.role === 'admin' || 
                       req.user.role === 'manager' ||
                       req.user.id === req.params.id;
        
        if (!canView) {
            return res.status(403).json({
                success: false,
                error: 'Not authorized to view this user activity'
            });
        }
        
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        
        const activities = await AuditLog.getUserActivity(req.params.id, {
            startDate: req.query.startDate ? new Date(req.query.startDate) : null,
            endDate: req.query.endDate ? new Date(req.query.endDate) : null,
            action: req.query.action,
            limit: limit,
            skip: (page - 1) * limit
        });
        
        res.status(200).json({
            success: true,
            data: activities
        });
    } catch (error) {
        console.error('Get user activity error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error while fetching user activity'
        });
    }
});

// @desc    Reset user password
// @route   POST /api/users/:id/reset-password
// @access  Private (Admin/Manager)
router.post('/:id/reset-password',
    authorize(['admin', 'manager']),
    auditLog('password_reset', 'user'),
    async (req, res) => {
        try {
            const user = await User.findById(req.params.id);

            if (!user) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }

            // Generate temporary password
            const tempPassword = Math.random().toString(36).slice(-8);
            user.password = tempPassword;
            user.mustChangePassword = true;
            await user.save();

            res.status(200).json({
                success: true,
                message: 'Password reset successfully',
                data: {
                    tempPassword: tempPassword
                }
            });
        } catch (error) {
            console.error('Reset password error:', error);
            res.status(500).json({
                success: false,
                error: 'Server error while resetting password'
            });
        }
    }
);

module.exports = router;
