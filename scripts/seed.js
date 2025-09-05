require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Category = require('../models/Category');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ MongoDB Connected for seeding');
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error.message);
        process.exit(1);
    }
};

const seedUsers = async () => {
    try {
        // Check if admin user already exists
        const existingAdmin = await User.findOne({ email: 'admin@dms.com' });
        if (existingAdmin) {
            console.log('Admin user already exists');
            return existingAdmin;
        }

        // Create admin user
        const adminUser = await User.create({
            name: 'System Administrator',
            email: 'admin@dms.com',
            password: 'admin123',
            role: 'admin',
            department: 'IT',
            phone: '+1234567890'
        });

        console.log('✅ Admin user created:', adminUser.email);
        return adminUser;
    } catch (error) {
        console.error('❌ Error creating admin user:', error.message);
        throw error;
    }
};

const seedCategories = async (adminUser) => {
    try {
        // Check if categories already exist
        const existingCategories = await Category.countDocuments();
        if (existingCategories > 0) {
            console.log('Categories already exist');
            return;
        }

        // Create root categories one by one to ensure proper slug generation
        const categoryData = [
            {
                name: 'Human Resources',
                description: 'HR documents, policies, and employee records',
                icon: 'people',
                color: '#28a745',
                allowedFileTypes: ['pdf', 'doc', 'docx', 'xls', 'xlsx'],
                maxFileSize: 10 * 1024 * 1024, // 10MB
                requiresApproval: true,
                createdBy: adminUser._id
            },
            {
                name: 'Finance',
                description: 'Financial documents, invoices, and reports',
                icon: 'attach_money',
                color: '#ffc107',
                allowedFileTypes: ['pdf', 'xls', 'xlsx', 'csv'],
                maxFileSize: 25 * 1024 * 1024, // 25MB
                requiresApproval: true,
                createdBy: adminUser._id
            },
            {
                name: 'Legal',
                description: 'Legal documents, contracts, and agreements',
                icon: 'gavel',
                color: '#dc3545',
                allowedFileTypes: ['pdf', 'doc', 'docx'],
                maxFileSize: 50 * 1024 * 1024, // 50MB
                requiresApproval: true,
                createdBy: adminUser._id
            },
            {
                name: 'Marketing',
                description: 'Marketing materials, campaigns, and assets',
                icon: 'campaign',
                color: '#6f42c1',
                allowedFileTypes: ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'jpg', 'jpeg', 'png', 'gif'],
                maxFileSize: 100 * 1024 * 1024, // 100MB
                requiresApproval: false,
                createdBy: adminUser._id
            },
            {
                name: 'Operations',
                description: 'Operational documents, procedures, and manuals',
                icon: 'settings',
                color: '#17a2b8',
                allowedFileTypes: ['pdf', 'doc', 'docx', 'txt'],
                maxFileSize: 20 * 1024 * 1024, // 20MB
                requiresApproval: true,
                createdBy: adminUser._id
            },
            {
                name: 'General',
                description: 'General documents and miscellaneous files',
                icon: 'folder',
                color: '#6c757d',
                allowedFileTypes: ['pdf', 'doc', 'docx', 'txt', 'jpg', 'jpeg', 'png'],
                maxFileSize: 50 * 1024 * 1024, // 50MB
                requiresApproval: false,
                createdBy: adminUser._id
            }
        ];

        // Create categories one by one to ensure proper slug generation
        const createdCategories = [];
        for (const categoryInfo of categoryData) {
            const category = new Category(categoryInfo);
            await category.save();
            createdCategories.push(category);
        }
        console.log(`✅ Created ${createdCategories.length} root categories`);

        // Create subcategories for HR
        const hrCategory = createdCategories.find(cat => cat.name === 'Human Resources');
        const hrSubcategories = [
            {
                name: 'Policies',
                description: 'Company policies and procedures',
                parent: hrCategory._id,
                icon: 'policy',
                color: '#28a745',
                allowedFileTypes: ['pdf', 'doc', 'docx'],
                requiresApproval: true,
                createdBy: adminUser._id
            },
            {
                name: 'Employee Records',
                description: 'Employee personal and professional records',
                parent: hrCategory._id,
                icon: 'person',
                color: '#28a745',
                allowedFileTypes: ['pdf', 'doc', 'docx'],
                requiresApproval: true,
                createdBy: adminUser._id
            },
            {
                name: 'Training Materials',
                description: 'Training documents and resources',
                parent: hrCategory._id,
                icon: 'school',
                color: '#28a745',
                allowedFileTypes: ['pdf', 'doc', 'docx', 'ppt', 'pptx'],
                requiresApproval: false,
                createdBy: adminUser._id
            }
        ];

        // Create HR subcategories one by one
        const hrSubs = [];
        for (const subCategoryInfo of hrSubcategories) {
            const subCategory = new Category(subCategoryInfo);
            await subCategory.save();
            hrSubs.push(subCategory);
        }
        console.log(`✅ Created ${hrSubs.length} HR subcategories`);

        // Create subcategories for Finance
        const financeCategory = createdCategories.find(cat => cat.name === 'Finance');
        const financeSubcategories = [
            {
                name: 'Invoices',
                description: 'Customer and vendor invoices',
                parent: financeCategory._id,
                icon: 'receipt',
                color: '#ffc107',
                allowedFileTypes: ['pdf', 'xls', 'xlsx'],
                requiresApproval: true,
                createdBy: adminUser._id
            },
            {
                name: 'Reports',
                description: 'Financial reports and statements',
                parent: financeCategory._id,
                icon: 'assessment',
                color: '#ffc107',
                allowedFileTypes: ['pdf', 'xls', 'xlsx'],
                requiresApproval: true,
                createdBy: adminUser._id
            },
            {
                name: 'Budgets',
                description: 'Budget documents and planning',
                parent: financeCategory._id,
                icon: 'account_balance',
                color: '#ffc107',
                allowedFileTypes: ['xls', 'xlsx', 'pdf'],
                requiresApproval: true,
                createdBy: adminUser._id
            }
        ];

        // Create Finance subcategories one by one
        const financeSubs = [];
        for (const subCategoryInfo of financeSubcategories) {
            const subCategory = new Category(subCategoryInfo);
            await subCategory.save();
            financeSubs.push(subCategory);
        }
        console.log(`✅ Created ${financeSubs.length} Finance subcategories`);

        console.log('✅ All categories created successfully');
    } catch (error) {
        console.error('❌ Error creating categories:', error.message);
        throw error;
    }
};

const seedDatabase = async () => {
    try {
        console.log('🌱 Starting database seeding...');
        
        await connectDB();
        
        const adminUser = await seedUsers();
        await seedCategories(adminUser);
        
        console.log('✅ Database seeding completed successfully!');
        console.log('\n📋 Default Admin Credentials:');
        console.log('Email: admin@dms.com');
        console.log('Password: admin123');
        console.log('\n⚠️  Please change the admin password after first login!');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Database seeding failed:', error.message);
        process.exit(1);
    }
};

// Run seeding if this file is executed directly
if (require.main === module) {
    seedDatabase();
}

module.exports = { seedDatabase, seedUsers, seedCategories };
