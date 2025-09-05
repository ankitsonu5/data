const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Ensure upload directory exists
const uploadDir = process.env.UPLOAD_PATH || './uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Create date-based folder structure
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        
        const dateFolder = path.join(uploadDir, year.toString(), month, day);
        
        // Create directory if it doesn't exist
        if (!fs.existsSync(dateFolder)) {
            fs.mkdirSync(dateFolder, { recursive: true });
        }
        
        cb(null, dateFolder);
    },
    filename: function (req, file, cb) {
        // Generate unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const fileExtension = path.extname(file.originalname);
        const fileName = crypto.randomBytes(16).toString('hex') + '-' + uniqueSuffix + fileExtension;
        
        cb(null, fileName);
    }
});

// File filter function
const fileFilter = (req, file, cb) => {
    // Get allowed file types from environment or use defaults
    const allowedTypes = process.env.ALLOWED_FILE_TYPES 
        ? process.env.ALLOWED_FILE_TYPES.split(',')
        : ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'jpg', 'jpeg', 'png', 'gif'];
    
    const fileExtension = path.extname(file.originalname).toLowerCase().substring(1);
    
    if (allowedTypes.includes(fileExtension)) {
        cb(null, true);
    } else {
        cb(new Error(`File type .${fileExtension} is not allowed. Allowed types: ${allowedTypes.join(', ')}`), false);
    }
};

// Configure multer
const upload = multer({
    storage: storage,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024, // 50MB default
        files: 10 // Maximum 10 files at once
    },
    fileFilter: fileFilter
});

// Middleware for single file upload
exports.uploadSingle = (fieldName = 'file') => {
    return (req, res, next) => {
        const singleUpload = upload.single(fieldName);
        
        singleUpload(req, res, function(err) {
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({
                        success: false,
                        error: `File too large. Maximum size is ${Math.round((parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024) / 1024 / 1024)}MB`
                    });
                }
                if (err.code === 'LIMIT_FILE_COUNT') {
                    return res.status(400).json({
                        success: false,
                        error: 'Too many files. Maximum 10 files allowed'
                    });
                }
                return res.status(400).json({
                    success: false,
                    error: err.message
                });
            } else if (err) {
                return res.status(400).json({
                    success: false,
                    error: err.message
                });
            }
            
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    error: 'No file uploaded'
                });
            }
            
            next();
        });
    };
};

// Middleware for multiple file upload
exports.uploadMultiple = (fieldName = 'files', maxCount = 10) => {
    return (req, res, next) => {
        const multipleUpload = upload.array(fieldName, maxCount);
        
        multipleUpload(req, res, function(err) {
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({
                        success: false,
                        error: `File too large. Maximum size is ${Math.round((parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024) / 1024 / 1024)}MB`
                    });
                }
                if (err.code === 'LIMIT_FILE_COUNT') {
                    return res.status(400).json({
                        success: false,
                        error: `Too many files. Maximum ${maxCount} files allowed`
                    });
                }
                return res.status(400).json({
                    success: false,
                    error: err.message
                });
            } else if (err) {
                return res.status(400).json({
                    success: false,
                    error: err.message
                });
            }
            
            if (!req.files || req.files.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'No files uploaded'
                });
            }
            
            next();
        });
    };
};

// Utility function to generate file checksum
exports.generateChecksum = (filePath) => {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha256');
        const stream = fs.createReadStream(filePath);
        
        stream.on('error', err => reject(err));
        stream.on('data', chunk => hash.update(chunk));
        stream.on('end', () => resolve(hash.digest('hex')));
    });
};

// Utility function to get file metadata
exports.getFileMetadata = (file) => {
    return {
        fileName: file.filename,
        originalName: file.originalname,
        filePath: file.path,
        fileSize: file.size,
        mimeType: file.mimetype,
        fileExtension: path.extname(file.originalname).toLowerCase().substring(1),
        uploadedAt: new Date()
    };
};

// Utility function to delete file
exports.deleteFile = (filePath) => {
    return new Promise((resolve, reject) => {
        fs.unlink(filePath, (err) => {
            if (err && err.code !== 'ENOENT') {
                reject(err);
            } else {
                resolve();
            }
        });
    });
};

// Utility function to check if file exists
exports.fileExists = (filePath) => {
    return fs.existsSync(filePath);
};
