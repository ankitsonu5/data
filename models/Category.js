const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Category name is required'],
        trim: true,
        maxlength: [100, 'Category name cannot be more than 100 characters']
    },
    description: {
        type: String,
        trim: true,
        maxlength: [500, 'Description cannot be more than 500 characters']
    },
    slug: {
        type: String,
        unique: true,
        lowercase: true
    },
    parent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        default: null
    },
    level: {
        type: Number,
        default: 0
    },
    path: {
        type: String,
        default: ''
    },
    icon: {
        type: String,
        default: 'folder'
    },
    color: {
        type: String,
        default: '#007bff'
    },
    allowedFileTypes: [{
        type: String,
        lowercase: true
    }],
    maxFileSize: {
        type: Number,
        default: 50 * 1024 * 1024 // 50MB default
    },
    requiresApproval: {
        type: Boolean,
        default: true
    },
    approvers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    permissions: {
        upload: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }],
        view: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }],
        manage: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }]
    },
    documentCount: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

// Pre-save middleware to generate slug and path
categorySchema.pre('save', async function(next) {
    // Always generate slug if name is modified or slug doesn't exist
    if (this.isModified('name') || !this.slug) {
        let baseSlug = this.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

        // Ensure slug is unique
        let slug = baseSlug;
        let counter = 1;

        while (true) {
            const existingCategory = await this.constructor.findOne({
                slug: slug,
                _id: { $ne: this._id }
            });

            if (!existingCategory) {
                break;
            }

            slug = `${baseSlug}-${counter}`;
            counter++;
        }

        this.slug = slug;
    }

    // Set level and path
    if (this.parent) {
        const parentCategory = await this.constructor.findById(this.parent);
        if (parentCategory) {
            this.level = parentCategory.level + 1;
            this.path = parentCategory.path ? `${parentCategory.path}/${this.slug}` : this.slug;
        }
    } else {
        this.level = 0;
        this.path = this.slug;
    }

    next();
});

// Method to get all children categories
categorySchema.methods.getChildren = function() {
    return this.constructor.find({ parent: this._id, isActive: true });
};

// Method to get full category path
categorySchema.methods.getFullPath = async function() {
    const pathArray = [];
    let current = this;
    
    while (current) {
        pathArray.unshift(current.name);
        if (current.parent) {
            current = await this.constructor.findById(current.parent);
        } else {
            current = null;
        }
    }
    
    return pathArray.join(' > ');
};

// Static method to build category tree
categorySchema.statics.buildTree = async function(parentId = null) {
    const categories = await this.find({ 
        parent: parentId, 
        isActive: true 
    }).populate('createdBy', 'name email').sort({ name: 1 });
    
    const tree = [];
    
    for (const category of categories) {
        const children = await this.buildTree(category._id);
        tree.push({
            ...category.toJSON(),
            children
        });
    }
    
    return tree;
};

// Indexes
categorySchema.index({ slug: 1 }, { unique: true, sparse: true });
categorySchema.index({ parent: 1 });
categorySchema.index({ level: 1 });
categorySchema.index({ path: 1 });
categorySchema.index({ isActive: 1 });
categorySchema.index({ createdBy: 1 });

// Virtual for children count
categorySchema.virtual('childrenCount', {
    ref: 'Category',
    localField: '_id',
    foreignField: 'parent',
    count: true
});

// Ensure virtual fields are serialized
categorySchema.set('toJSON', {
    virtuals: true,
    transform: function(doc, ret) {
        delete ret._id;
        delete ret.__v;
        return ret;
    }
});

module.exports = mongoose.model('Category', categorySchema);
