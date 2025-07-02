const mongoose = require('mongoose');
const Product = require('../src/models/product.model');

// Thay đổi URI nếu cần
const MONGODB_URI = 'mongodb+srv://nptuananh04:Thuong05@cluster0.xhmg38x.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

const adminId = '685986987b418c9427a24b94'; // User _id dùng cho createdBy

const products = [
  {
    name: 'Test Product 5K',
    description: 'A test product for 5,000 VND',
    price: 5000,
    category: 'other',
    subcategory: '',
    images: [
      'https://res.cloudinary.com/dmlpi30vy/image/upload/v1751443902/cards_vzb5h5.png',
      'https://res.cloudinary.com/dmlpi30vy/image/upload/v1751443876/image-removebg-preview_jpcjop.png',
      'https://res.cloudinary.com/dmlpi30vy/image/upload/v1751443877/image-removebg-preview_1_kjdz8a.png'
    ],
    thumbnail: 'https://res.cloudinary.com/dmlpi30vy/image/upload/v1751443902/cards_vzb5h5.png',
    stock: 10,
    isActive: true,
    features: ['Feature 1', 'Feature 2'],
    specifications: { color: 'red', size: 'small' },
    tags: ['test', 'card'],
    rating: { average: 0, count: 0 },
    salesCount: 0,
    createdBy: adminId
  },
  {
    name: 'Pointboard Card Game',
    description: 'Bien the moi',
    price: 299000,
    category: 'other',
    subcategory: '',
    images: [
      'https://res.cloudinary.com/dmlpi30vy/image/upload/v1751443902/cards_vzb5h5.png',
      'https://res.cloudinary.com/dmlpi30vy/image/upload/v1751443876/image-removebg-preview_jpcjop.png',
      'https://res.cloudinary.com/dmlpi30vy/image/upload/v1751443877/image-removebg-preview_1_kjdz8a.png'
    ],
    thumbnail: 'https://res.cloudinary.com/dmlpi30vy/image/upload/v1751443902/cards_vzb5h5.png',
    stock: 10,
    isActive: true,
    features: ['Board game', 'Family fun'],
    specifications: { color: 'blue', size: 'standard' },
    tags: ['boardgame', 'card'],
    rating: { average: 0, count: 0 },
    salesCount: 0,
    createdBy: adminId
  }
];

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI, {});
    await Product.deleteMany({}); // Xóa toàn bộ sản phẩm cũ (nếu muốn giữ thì comment dòng này)
    await Product.insertMany(products);
    console.log('Products seeded!');
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

seed(); 