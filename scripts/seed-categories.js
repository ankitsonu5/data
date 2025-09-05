const mongoose = require('mongoose');
const Category = require('../models/Category');
const User = require('../models/User');
require('dotenv').config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected');
    } catch (error) {
        console.error('Database connection error:', error);
        process.exit(1);
    }
};

const seedCategories = async () => {
    try {
        await connectDB();

        // Find admin user
        const adminUser = await User.findOne({ role: 'admin' });
        if (!adminUser) {
            console.error('Admin user not found. Please create an admin user first.');
            process.exit(1);
        }

        // Check if categories already exist
        const existingCategories = await Category.countDocuments();
        if (existingCategories > 0) {
            console.log('Categories already exist. Skipping seed.');
            process.exit(0);
        }

        const categories = [
            {
                name: 'General Documents',
                description: 'General purpose documents and files',
                color: '#6c757d',
                icon: 'fas fa-file',
                path: 'general',
                slug: 'general-documents',
                requiresApproval: false,
                isActive: true,
                createdBy: adminUser._id,
                permissions: {
                    read: ['admin', 'manager', 'user'],
                    write: ['admin', 'manager', 'user'],
                    delete: ['admin', 'manager']
                }
            },
            {
                name: 'HR Documents',
                description: 'Human Resources related documents',
                color: '#28a745',
                icon: 'fas fa-users',
                path: 'hr',
                slug: 'hr-documents',
                requiresApproval: true,
                isActive: true,
                createdBy: adminUser._id,
                permissions: {
                    read: ['admin', 'manager'],
                    write: ['admin', 'manager'],
                    delete: ['admin']
                }
            },
            {
                name: 'Finance Documents',
                description: 'Financial reports and documents',
                color: '#ffc107',
                icon: 'fas fa-dollar-sign',
                path: 'finance',
                slug: 'finance-documents',
                requiresApproval: true,
                isActive: true,
                createdBy: adminUser._id,
                permissions: {
                    read: ['admin', 'manager'],
                    write: ['admin', 'manager'],
                    delete: ['admin']
                }
            },
            {
                name: 'IT Documents',
                description: 'Information Technology documentation',
                color: '#007bff',
                icon: 'fas fa-laptop',
                path: 'it',
                slug: 'it-documents',
                requiresApproval: false,
                isActive: true,
                createdBy: adminUser._id,
                permissions: {
                    read: ['admin', 'manager', 'user'],
                    write: ['admin', 'manager'],
                    delete: ['admin']
                }
            },
            {
                name: 'Legal Documents',
                description: 'Legal contracts and agreements',
                color: '#dc3545',
                icon: 'fas fa-gavel',
                path: 'legal',
                slug: 'legal-documents',
                requiresApproval: true,
                isActive: true,
                createdBy: adminUser._id,
                permissions: {
                    read: ['admin'],
                    write: ['admin'],
                    delete: ['admin']
                }
            },
            {
                name: 'Marketing Materials',
                description: 'Marketing and promotional materials',
                color: '#e83e8c',
                icon: 'fas fa-bullhorn',
                path: 'marketing',
                slug: 'marketing-materials',
                requiresApproval: false,
                isActive: true,
                createdBy: adminUser._id,
                permissions: {
                    read: ['admin', 'manager', 'user'],
                    write: ['admin', 'manager'],
                    delete: ['admin', 'manager']
                }
            }
        ];

        // Create categories
        const createdCategories = await Category.insertMany(categories);
        console.log(`Created ${createdCategories.length} categories:`);
        createdCategories.forEach(cat => {
            console.log(`- ${cat.name} (${cat.slug})`);
        });

        console.log('Categories seeded successfully!');
        process.exit(0);

    } catch (error) {
        console.error('Error seeding categories:', error);
        process.exit(1);
    }
};

seedCategories();
