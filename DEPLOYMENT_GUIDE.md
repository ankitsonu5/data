# Angular + Node.js Integration Guide

## Overview
This project integrates an Angular frontend with a Node.js backend, where the Angular app is built and served directly from the Node.js server.

## Project Structure
```
├── frontend/                 # Angular application
│   ├── src/                 # Angular source files
│   ├── angular.json         # Angular configuration (modified for backend integration)
│   └── package.json         # Angular dependencies
├── public/                  # Built Angular files (auto-generated)
│   └── browser/            # Angular build output
├── config/                  # Backend configuration
│   └── database.js         # MongoDB connection
├── models/                  # MongoDB models
│   └── User.js             # User schema
├── server.js               # Main Node.js server
├── package.json            # Backend dependencies and scripts
└── .env                    # Environment variables
```

## How It Works

### 1. Angular Build Configuration
The Angular app is configured to build directly into the Node.js `public` directory:

**frontend/angular.json:**
```json
{
  "outputPath": {
    "base": "../public"
  }
}
```

### 2. Node.js Server Configuration
The server serves Angular files and handles API routes:

**server.js:**
```javascript
// Serve Angular build files
app.use(express.static('public/browser'));

// API routes
app.get('/api/*', ...);

// Serve Angular app for all non-API routes
app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({
            success: false,
            error: 'API route not found'
        });
    }
    res.sendFile(path.join(__dirname, 'public', 'browser', 'index.html'));
});
```

## Build and Deployment Process

### 1. Development Mode
```bash
# Start Node.js server with auto-reload
npm run dev

# In another terminal, develop Angular app
cd frontend
ng serve
```

### 2. Production Build
```bash
# Build Angular app into Node.js public directory
npm run build

# Start production server
npm start
```

### 3. Available Scripts
```json
{
  "start": "node server.js",
  "dev": "nodemon server.js",
  "build": "cd frontend && npm run build",
  "build:prod": "cd frontend && npm run build -- --configuration production"
}
```

## Route Handling

### Frontend Routes (Angular)
- `/` - Angular app home page
- `/about` - Angular about page (example)
- `/contact` - Angular contact page (example)
- Any other non-API route serves the Angular app

### Backend Routes (API)
- `GET /api` - API welcome message
- `GET /api/health` - Server health check
- `GET /api/users` - Get all users
- `POST /api/users` - Create new user
- `GET /api/users/:id` - Get single user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

## Database Integration
- **MongoDB Atlas** connection via Mongoose
- **User model** with validation
- **CRUD operations** for user management
- **Environment variables** for secure configuration

## Environment Variables (.env)
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/
PORT=3000
NODE_ENV=development
```

## Deployment Steps

### 1. Local Development
```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend && npm install && cd ..

# Build Angular app
npm run build

# Start server
npm run dev
```

### 2. Production Deployment
```bash
# Build for production
npm run build:prod

# Start production server
npm start
```

### 3. Server Deployment (e.g., Heroku, DigitalOcean)
```bash
# Add build script to package.json
"scripts": {
  "heroku-postbuild": "npm run build:prod"
}

# Deploy with environment variables
MONGODB_URI=your_mongodb_connection_string
PORT=3000
NODE_ENV=production
```

## Benefits of This Setup

1. **Single Server**: One server handles both frontend and API
2. **Simplified Deployment**: Deploy as a single application
3. **No CORS Issues**: Frontend and API on same domain
4. **Production Ready**: Optimized Angular build served efficiently
5. **SEO Friendly**: Server-side routing for Angular app

## Development Workflow

1. **Frontend Development**: Use `ng serve` for hot reload during development
2. **Backend Development**: Use `npm run dev` for API development
3. **Integration Testing**: Build Angular and test with `npm run build && npm start`
4. **Production**: Deploy with built Angular files

## Troubleshooting

### Common Issues:
1. **Angular routes not working**: Ensure catch-all route serves `index.html`
2. **API routes not found**: Check API routes are defined before catch-all
3. **Build path issues**: Verify Angular `outputPath` configuration
4. **Static files not served**: Check Express static middleware configuration

### Debug Commands:
```bash
# Check build output
ls -la public/browser/

# Test API endpoints
curl http://localhost:3000/api/health

# Test Angular app
curl http://localhost:3000
```

This setup provides a complete full-stack application with Angular frontend and Node.js backend integrated seamlessly.
