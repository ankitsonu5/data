const express = require('express');
const { body } = require('express-validator');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { protect, rateLimitSensitive, validateRequest, auditLog } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const registerValidation = [
    body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
    body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').optional().isIn(['admin', 'manager', 'user']).withMessage('Invalid role'),
    body('department').optional().trim().isLength({ max: 100 }).withMessage('Department name too long')
];

const loginValidation = [
    body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
    body('password').notEmpty().withMessage('Password is required')
];

const changePasswordValidation = [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
];

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public (but can be restricted to admin only)
router.post('/register', 
    rateLimitSensitive,
    validateRequest(registerValidation),
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
                role: role || 'user',
                department,
                phone
            });
            
            // Generate JWT token
            const token = user.getSignedJwtToken();
            
            res.status(201).json({
                success: true,
                message: 'User registered successfully',
                data: {
                    user: {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        role: user.role,
                        department: user.department
                    },
                    token
                }
            });
        } catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({
                success: false,
                error: 'Server error during registration'
            });
        }
    }
);

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
router.post('/login',
    rateLimitSensitive,
    validateRequest(loginValidation),
    auditLog('login', 'user'),
    async (req, res) => {
        try {
            const { email, password } = req.body;
            
            // Check for user and include password
            const user = await User.findOne({ email }).select('+password');
            
            if (!user) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid credentials'
                });
            }
            
            // Check if user is active
            if (!user.isActive) {
                return res.status(401).json({
                    success: false,
                    error: 'Account is deactivated. Please contact administrator'
                });
            }
            
            // Check if password matches
            const isMatch = await user.matchPassword(password);
            
            if (!isMatch) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid credentials'
                });
            }
            
            // Update last login
            user.lastLogin = new Date();
            await user.save();
            
            // Generate JWT token
            const token = user.getSignedJwtToken();
            
            res.status(200).json({
                success: true,
                message: 'Login successful',
                data: {
                    user: {
                        _id: user._id,
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        role: user.role,
                        department: user.department,
                        lastLogin: user.lastLogin
                    },
                    token
                }
            });
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({
                success: false,
                error: 'Server error during login'
            });
        }
    }
);

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
router.get('/me', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        
        res.status(200).json({
            success: true,
            data: {
                user: {
                    _id: user._id,
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    department: user.department,
                    phone: user.phone,
                    profileImage: user.profileImage,
                    lastLogin: user.lastLogin,
                    createdAt: user.createdAt
                }
            }
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error while fetching profile'
        });
    }
});

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
router.put('/profile',
    protect,
    validateRequest([
        body('name').optional().trim().isLength({ min: 2, max: 50 }),
        body('phone').optional().trim(),
        body('department').optional().trim().isLength({ max: 100 })
    ]),
    auditLog('user_update', 'user'),
    async (req, res) => {
        try {
            const { name, phone, department } = req.body;
            
            const user = await User.findByIdAndUpdate(
                req.user.id,
                { name, phone, department },
                { new: true, runValidators: true }
            );
            
            res.status(200).json({
                success: true,
                message: 'Profile updated successfully',
                data: {
                    user: {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        role: user.role,
                        department: user.department,
                        phone: user.phone
                    }
                }
            });
        } catch (error) {
            console.error('Profile update error:', error);
            res.status(500).json({
                success: false,
                error: 'Server error while updating profile'
            });
        }
    }
);

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
router.put('/change-password',
    protect,
    rateLimitSensitive,
    validateRequest(changePasswordValidation),
    auditLog('password_change', 'user'),
    async (req, res) => {
        try {
            const { currentPassword, newPassword } = req.body;
            
            // Get user with password
            const user = await User.findById(req.user.id).select('+password');
            
            // Check current password
            const isMatch = await user.matchPassword(currentPassword);
            if (!isMatch) {
                return res.status(400).json({
                    success: false,
                    error: 'Current password is incorrect'
                });
            }
            
            // Update password
            user.password = newPassword;
            await user.save();
            
            res.status(200).json({
                success: true,
                message: 'Password changed successfully'
            });
        } catch (error) {
            console.error('Change password error:', error);
            res.status(500).json({
                success: false,
                error: 'Server error while changing password'
            });
        }
    }
);

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
router.post('/logout',
    protect,
    auditLog('logout', 'user'),
    async (req, res) => {
        try {
            // In a real application, you might want to blacklist the token
            // For now, we'll just return success
            res.status(200).json({
                success: true,
                message: 'Logged out successfully'
            });
        } catch (error) {
            console.error('Logout error:', error);
            res.status(500).json({
                success: false,
                error: 'Server error during logout'
            });
        }
    }
);

module.exports = router;
