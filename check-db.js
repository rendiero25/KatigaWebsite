const mongoose = require('mongoose');
require('dotenv').config();

const Product = require('./models/Product');
const NewsArticle = require('./models/NewsArticle');
const Manufacturing = require('./models/Manufacturing');
const HeroSection = require('./models/HeroSection');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected');
    } catch (error) {
        console.error('Error connecting to MongoDB:', error.message);
        process.exit(1);
    }
};

const checkData = async () => {
    await connectDB();

    const targetImageName = 'image-1769563730720-857974186.png';
    const targetPath = '/uploads/' + targetImageName;
    console.log('Searching for image path:', targetPath);

    const productByImg = await Product.findOne({ image: targetPath });
    if (productByImg) console.log('FOUND in Product:', productByImg.name);
    else console.log('NOT FOUND in Product');

    const newsByImg = await NewsArticle.findOne({ image: targetPath });
    if (newsByImg) console.log('FOUND in News:', newsByImg.title);
    else console.log('NOT FOUND in News');

    const heroByImg = await HeroSection.findOne({ image: targetPath });
    if (heroByImg) console.log('FOUND in HeroSection:', heroByImg.title);
    else console.log('NOT FOUND in HeroSection');
    
    // Check if any partner has this logo (though field is logo, maybe file saved as image-?)
    // upload.single('logo') => file.fieldname is 'logo'.
    // So if file starts with 'image-', it CANNOT be Partner.

    console.log('\n--- Latest Updated Product ---');
    const product = await Product.findOne().sort({ updatedAt: -1 });
    if (product) {
        console.log('Name:', product.name);
        console.log('Image:', product.image);
        console.log('Updated At:', product.updatedAt);
    }
    
    console.log('\n--- Hero Section ---');
    const hero = await HeroSection.findOne();
    if (hero) {
        console.log('Image:', hero.image);
        console.log('Last updated (if available):', hero.updatedAt); // Schema might not have timestamps
    }

    process.exit(0);
};

checkData();
