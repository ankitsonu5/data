const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000/api';

async function testAPI() {
    try {
        console.log('🧪 Testing Document Management System API...\n');

        // Test 1: Login
        console.log('1. Testing Login...');
        const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
            email: 'admin@dms.com',
            password: 'admin123'
        });

        console.log('✅ Login successful');
        console.log('User:', loginResponse.data.data.user.name);
        console.log('Role:', loginResponse.data.data.user.role);

        const token = loginResponse.data.data.token;
        const headers = { Authorization: `Bearer ${token}` };

        // Test 2: Get Categories (flat list to see all categories)
        console.log('\n2. Testing Categories...');
        const categoriesResponse = await axios.get(`${BASE_URL}/categories?flat=true`, { headers });

        console.log('✅ Categories retrieved');
        console.log('Categories count:', categoriesResponse.data.data.categories.length);

        // Find a category that allows txt files
        let testCategory = null;
        const categories = categoriesResponse.data.data.categories;

        for (const category of categories) {
            console.log(`Category: ${category.name}, Allowed types: ${category.allowedFileTypes.join(', ')}`);
            if (category.allowedFileTypes.includes('txt')) {
                testCategory = category;
                break;
            }
        }

        // If no category allows txt, use first available and change file type
        if (!testCategory) {
            testCategory = categories[0];
        }

        console.log('Test category:', testCategory.name);
        console.log('Allowed file types:', testCategory.allowedFileTypes);

        // Test 3: Get Users
        console.log('\n3. Testing Users...');
        const usersResponse = await axios.get(`${BASE_URL}/users`, { headers });

        console.log('✅ Users retrieved');
        console.log('Users count:', usersResponse.data.data.users.length);

        // Test 4: Get Profile
        console.log('\n4. Testing Profile...');
        const profileResponse = await axios.get(`${BASE_URL}/auth/me`, { headers });

        console.log('✅ Profile retrieved');
        console.log('Profile:', profileResponse.data.data.user.name);

        // Test 5: Create a test file and upload document
        console.log('\n5. Testing Document Upload...');

        // Create appropriate test file based on category
        let testFileName, testFileContent;
        if (testCategory.allowedFileTypes.includes('txt')) {
            testFileName = 'test-document.txt';
            testFileContent = 'This is a test document for the Document Management System.\n\nCreated for testing purposes.';
        } else if (testCategory.allowedFileTypes.includes('pdf')) {
            // Create a simple text file but name it as PDF for testing
            testFileName = 'test-document.pdf';
            testFileContent = '%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n>>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000074 00000 n \n0000000120 00000 n \ntrailer\n<<\n/Size 4\n/Root 1 0 R\n>>\nstartxref\n179\n%%EOF';
        } else {
            // Use first allowed file type
            const ext = testCategory.allowedFileTypes[0];
            testFileName = `test-document.${ext}`;
            testFileContent = 'Test document content for DMS testing.';
        }

        fs.writeFileSync(testFileName, testFileContent);

        try {
            const formData = new FormData();
            formData.append('file', fs.createReadStream(testFileName));
            formData.append('title', 'Test Document');
            formData.append('description', 'This is a test document uploaded via API');
            formData.append('category', testCategory.id);
            formData.append('tags', JSON.stringify(['test', 'api', 'demo']));

            const uploadResponse = await axios.post(`${BASE_URL}/documents`, formData, {
                headers: {
                    ...headers,
                    ...formData.getHeaders()
                }
            });

            console.log('✅ Document uploaded successfully');
            console.log('Document ID:', uploadResponse.data.data.document.id);
            console.log('Document Title:', uploadResponse.data.data.document.title);
            console.log('Document Status:', uploadResponse.data.data.document.status);

            // Test 6: Get Documents
            console.log('\n6. Testing Get Documents...');
            const documentsResponse = await axios.get(`${BASE_URL}/documents`, { headers });

            console.log('✅ Documents retrieved');
            console.log('Documents count:', documentsResponse.data.data.documents.length);

        } finally {
            // Clean up test file
            if (fs.existsSync(testFileName)) {
                fs.unlinkSync(testFileName);
            }
        }

        console.log('\n🎉 All API tests passed!');

    } catch (error) {
        console.error('❌ API Test failed:', error.response?.data || error.message);
    }
}

// Run the test directly
testAPI();
