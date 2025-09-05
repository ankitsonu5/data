# API Documentation

## Base URL
```
http://localhost:3000
```

## Authentication
Currently, no authentication is required for API endpoints.

## Endpoints

### Health Check
**GET** `/api/health`

Returns server health status and uptime.

**Response:**
```json
{
  "status": "OK",
  "uptime": 123.456,
  "timestamp": "2025-09-04T14:00:00.000Z"
}
```

### Users

#### Get All Users
**GET** `/api/users`

Returns a list of all active users.

**Response:**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "id": "66d8f123456789abcdef0123",
      "name": "John Doe",
      "email": "john@example.com",
      "age": 30,
      "phone": "+1234567890",
      "address": {
        "street": "123 Main St",
        "city": "New York",
        "state": "NY",
        "zipCode": "10001",
        "country": "USA"
      },
      "isActive": true,
      "createdAt": "2025-09-04T14:00:00.000Z",
      "updatedAt": "2025-09-04T14:00:00.000Z"
    }
  ]
}
```

#### Get Single User
**GET** `/api/users/:id`

Returns a single user by ID.

**Parameters:**
- `id` (string, required): User ID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "66d8f123456789abcdef0123",
    "name": "John Doe",
    "email": "john@example.com",
    "age": 30,
    "isActive": true,
    "createdAt": "2025-09-04T14:00:00.000Z",
    "updatedAt": "2025-09-04T14:00:00.000Z"
  }
}
```

#### Create User
**POST** `/api/users`

Creates a new user.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "age": 30,
  "phone": "+1234567890",
  "address": {
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "USA"
  }
}
```

**Required Fields:**
- `name` (string): User's full name
- `email` (string): User's email address (must be unique)

**Optional Fields:**
- `age` (number): User's age (0-120)
- `phone` (string): User's phone number
- `address` (object): User's address information

**Response:**
```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "id": "66d8f123456789abcdef0123",
    "name": "John Doe",
    "email": "john@example.com",
    "age": 30,
    "isActive": true,
    "createdAt": "2025-09-04T14:00:00.000Z",
    "updatedAt": "2025-09-04T14:00:00.000Z"
  }
}
```

#### Update User
**PUT** `/api/users/:id`

Updates an existing user.

**Parameters:**
- `id` (string, required): User ID

**Request Body:** Same as Create User

**Response:**
```json
{
  "success": true,
  "message": "User updated successfully",
  "data": {
    "id": "66d8f123456789abcdef0123",
    "name": "John Doe Updated",
    "email": "john.updated@example.com",
    "age": 31,
    "isActive": true,
    "createdAt": "2025-09-04T14:00:00.000Z",
    "updatedAt": "2025-09-04T14:01:00.000Z"
  }
}
```

#### Delete User
**DELETE** `/api/users/:id`

Soft deletes a user (sets isActive to false).

**Parameters:**
- `id` (string, required): User ID

**Response:**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

## Error Responses

All endpoints return error responses in the following format:

```json
{
  "success": false,
  "error": "Error message",
  "details": ["Additional error details if applicable"]
}
```

### Common HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `404` - Not Found
- `500` - Internal Server Error

## Database Schema

### User Model
```javascript
{
  name: String (required, max 50 chars),
  email: String (required, unique, valid email format),
  age: Number (0-120),
  phone: String,
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  isActive: Boolean (default: true),
  createdAt: Date (auto-generated),
  updatedAt: Date (auto-generated)
}
```
