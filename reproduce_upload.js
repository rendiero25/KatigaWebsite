const fs = require('fs');
const path = require('path');

// 1. Config
const API_URL = 'http://localhost:5000/api';
const ADMIN_EMAIL = 'admin@kumakuma.com';
const ADMIN_PASSWORD = 'admin123';

// 2. Create Dummy Image
const dummyImagePath = path.join(__dirname, 'dummy_test_image.png');
// Create a simple 1x1 pixel PNG
const base64Png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
fs.writeFileSync(dummyImagePath, Buffer.from(base64Png, 'base64'));

async function runTest() {
    try {
        // 3. Login
        console.log('Logging in...');
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
        });
        
        if (!loginRes.ok) throw new Error(`Login failed: ${loginRes.statusText}`);
        const loginData = await loginRes.json();
        const token = loginData.token;
        console.log('Login successful. Token obtained.');

        // 4. Upload Product
        console.log('Uploading Product with Image...');
        const formData = new FormData();
        formData.append('name', 'Test Upload Product');
        formData.append('description', 'Testing upload script');
        // formData.append('category', '65b21e8e9c60000000000000'); // REMOVED
        
        const catRes = await fetch(`${API_URL}/categories`);
        const categories = await catRes.json();
        const categoryId = categories[0]?._id;
        
        if (!categoryId) throw new Error('No categories found to link product to.');
        
        formData.append('category', categoryId);
        formData.append('price', 'Rp 100.000');
        
        // Prepare file for fetch
        const fileContent = fs.readFileSync(dummyImagePath);
        const file = new Blob([fileContent], { type: 'image/png' });
        formData.append('image', file, 'dummy_test_image.png');

        const uploadRes = await fetch(`${API_URL}/products`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`
                // Note: fetch automatically sets Content-Type content-type header with boundary for FormData
            },
            body: formData
        });

        if (!uploadRes.ok) {
            const err = await uploadRes.text();
            throw new Error(`Upload failed: ${uploadRes.status} ${err}`);
        }

        const product = await uploadRes.json();
        console.log('Upload response:', product);

        if (product.image && product.image.includes('dummy_test_image')) {
            console.log('SUCCESS: Image path returned in response:', product.image);
        } else {
            console.error('FAILURE: Image path missing or incorrect in response.');
        }

        // 5. Verify Database Fetch
        console.log('Verifying via GET...');
        const getRes = await fetch(`${API_URL}/products/${product._id}`);
        const fetchedProduct = await getRes.json();
        
        if (fetchedProduct.image === product.image) {
            console.log('SUCCESS: Verified image path persists in DB:', fetchedProduct.image);
        } else {
            console.error('FAILURE: DB image path mismatch or missing.');
        }

        // 6. Test PUT (Update Image)
        console.log('Testing PUT (Update Image)...');
        const formDataPut = new FormData();
        formDataPut.append('name', 'Updated Product Name');
        // Create a different dummy image
        const updateImagePath = path.join(__dirname, 'update_test_image.png');
        // Simple red pixel
        const redPixel = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='; 
        fs.writeFileSync(updateImagePath, Buffer.from(redPixel, 'base64'));
        
        const fileContentPut = fs.readFileSync(updateImagePath);
        const filePut = new Blob([fileContentPut], { type: 'image/png' });
        formDataPut.append('image', filePut, 'update_test_image.png');

        const putRes = await fetch(`${API_URL}/products/${product._id}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formDataPut
        });

        if (!putRes.ok) throw new Error(`PUT failed: ${putRes.status}`);
        const updatedProduct = await putRes.json();
        console.log('PUT response:', updatedProduct);

        if (updatedProduct.image && updatedProduct.image !== product.image) {
            console.log('SUCCESS: Image updated successfully:', updatedProduct.image);
        } else {
            console.error('FAILURE: Image update failed.');
        }
        
        if (fs.existsSync(updateImagePath)) fs.unlinkSync(updateImagePath);

    } catch (err) {
        console.error('TEST FAILED:', err);
    } finally {
        // Cleanup
        if (fs.existsSync(dummyImagePath)) fs.unlinkSync(dummyImagePath);
    }
}

runTest();
