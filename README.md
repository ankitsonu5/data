# Document Management System (DMS)

A comprehensive web-based Document Management System built with Node.js, Express, MongoDB, and Angular. This system provides secure document storage, management, retrieval, and sharing capabilities with role-based access control.

## 🚀 Features

### Core Features
- ✅ **Secure Document Storage** - Centralized repository with encrypted storage
- ✅ **Role-Based Access Control** - Admin, Manager, and User roles with specific permissions
- ✅ **Document Upload & Classification** - Support for multiple file types with metadata
- ✅ **Full-Text Search & Filters** - Advanced search capabilities with metadata filtering
- ✅ **Version Control** - Complete document version history and rollback
- ✅ **Approval Workflow** - Document approval/rejection system
- ✅ **Audit Trail** - Comprehensive activity logging for compliance
- ✅ **Category Management** - Hierarchical document categorization

### Security Features
- ✅ **JWT Authentication** - Secure token-based authentication
- ✅ **Password Encryption** - BCrypt password hashing
- ✅ **File Validation** - File type and size restrictions
- ✅ **Rate Limiting** - API rate limiting for security
- ✅ **Helmet Security** - Security headers and protection
- ✅ **Input Validation** - Comprehensive request validation

### Technical Features
- ✅ **RESTful API** - Clean and well-documented API endpoints
- ✅ **MongoDB Integration** - Scalable NoSQL database
- ✅ **File Upload Handling** - Secure file upload with Multer
- ✅ **Error Handling** - Comprehensive error handling and logging
- ✅ **Auto-reload Development** - Nodemon for development efficiency

## 🏗️ Architecture

### Backend Stack
- **Node.js** - JavaScript runtime environment
- **Express.js** - Web application framework
- **MongoDB** - NoSQL database with Mongoose ODM
- **JWT** - JSON Web Tokens for authentication
- **Multer** - File upload handling
- **BCrypt** - Password hashing
- **Helmet** - Security middleware

### Frontend Stack
- **Angular 20+** - Modern web application framework
- **TypeScript** - Type-safe JavaScript
- **Responsive Design** - Mobile-friendly interface

## 📋 Prerequisites

- Node.js (v16 or higher)
- MongoDB Atlas account or local MongoDB installation
- npm or yarn package manager

## 🛠️ Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd document-management-system
```

2. **Install backend dependencies**
```bash
npm install
```

3. **Install frontend dependencies**
```bash
cd frontend
npm install
cd ..
```

4. **Environment Configuration**
Create a `.env` file in the root directory:
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/document_management
PORT=3000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=30d

# File Upload Configuration
MAX_FILE_SIZE=52428800
UPLOAD_PATH=./uploads
ALLOWED_FILE_TYPES=pdf,doc,docx,xls,xlsx,ppt,pptx,txt,jpg,jpeg,png,gif

# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
```

5. **Initialize Database**
```bash
npm run seed
```

## 🚀 Usage

### Development Mode
```bash
# Start backend server with auto-reload
npm run dev

# Build and integrate frontend (in another terminal)
npm run build
```

### Production Mode
```bash
# Build frontend for production
npm run build:prod

# Start production server
npm start
```

The application will be available at `http://localhost:3000`

## 👤 Default Credentials

After running the seed script, use these credentials to login:

- **Email:** admin@dms.com
- **Password:** admin123
- **Role:** Administrator

⚠️ **Important:** Change the default password after first login!

## 📚 API Documentation

### Authentication Endpoints
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user profile
- `PUT /api/auth/profile` - Update user profile
- `PUT /api/auth/change-password` - Change password
- `POST /api/auth/logout` - User logout

### User Management (Admin/Manager)
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get single user
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Deactivate user
- `GET /api/users/:id/activity` - Get user activity logs

### Category Management
- `GET /api/categories` - Get all categories (tree structure)
- `GET /api/categories/:id` - Get single category
- `POST /api/categories` - Create category
- `PUT /api/categories/:id` - Update category
- `DELETE /api/categories/:id` - Delete category
- `GET /api/categories/:id/documents` - Get category documents

### Document Management
- `POST /api/documents` - Upload document
- `GET /api/documents` - Get all documents (with filters)
- `GET /api/documents/:id` - Get single document
- `GET /api/documents/:id/download` - Download document
- `PUT /api/documents/:id` - Update document
- `DELETE /api/documents/:id` - Delete document
- `PUT /api/documents/:id/approval` - Approve/reject document

## 🗂️ Project Structure

```
├── server.js                 # Main server file
├── package.json              # Dependencies and scripts
├── .env                      # Environment variables
├── .gitignore               # Git ignore rules
├── README.md                # Project documentation
├── API_DOCS.md              # API documentation
├── DEPLOYMENT_GUIDE.md      # Deployment guide
├── test-api.js              # API testing script
│
├── config/
│   └── database.js          # MongoDB connection
│
├── models/
│   ├── User.js              # User model
│   ├── Document.js          # Document model
│   ├── Category.js          # Category model
│   ├── DocumentVersion.js   # Document version model
│   └── AuditLog.js          # Audit log model
│
├── routes/
│   ├── auth.js              # Authentication routes
│   ├── users.js             # User management routes
│   ├── categories.js        # Category management routes
│   └── documents.js         # Document management routes
│
├── middleware/
│   ├── auth.js              # Authentication middleware
│   └── upload.js            # File upload middleware
│
├── scripts/
│   ├── seed.js              # Database seeding
│   └── clear-db.js          # Database cleanup
│
├── uploads/                 # File storage directory
├── public/                  # Static files (Angular build)
└── frontend/                # Angular application
    ├── src/
    ├── angular.json
    └── package.json
```