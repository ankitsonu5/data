require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Category = require('../models/Category');
const Document = require('../models/Document');
const DocumentVersion = require('../models/DocumentVersion');
const AuditLog = require('../models/AuditLog');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ MongoDB Connected for clearing');
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error.message);
        process.exit(1);
    }
};

const clearDatabase = async () => {
    try {
        console.log('🗑️  Starting database cleanup...');
        
        await connectDB();
        
        // Clear all collections
        await User.deleteMany({});
        console.log('✅ Users collection cleared');
        
        await Category.deleteMany({});
        console.log('✅ Categories collection cleared');
        
        await Document.deleteMany({});
        console.log('✅ Documents collection cleared');
        
        await DocumentVersion.deleteMany({});
        console.log('✅ Document versions collection cleared');
        
        await AuditLog.deleteMany({});
        console.log('✅ Audit logs collection cleared');
        
        console.log('✅ Database cleanup completed successfully!');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Database cleanup failed:', error.message);
        process.exit(1);
    }
};

// Run cleanup if this file is executed directly
if (require.main === module) {
    clearDatabase();
}

module.exports = { clearDatabase };
