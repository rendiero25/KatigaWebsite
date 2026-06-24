require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Import all models
const SiteSettings = require('../models/SiteSettings');
const HeroSection = require('../models/HeroSection');
const Partner = require('../models/Partner');
const Advantage = require('../models/Advantage');
const ProductCategory = require('../models/ProductCategory');
const Product = require('../models/Product');
const AboutContent = require('../models/AboutContent');
const Certification = require('../models/Certification');
const CertificationTechnology = require('../models/CertificationTechnology');
const DistributionChannel = require('../models/DistributionChannel');
const Catalog = require('../models/Catalog');
const ContactInfo = require('../models/ContactInfo');
const FooterContent = require('../models/FooterContent');
const Admin = require('../models/Admin');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error.message);
    process.exit(1);
  }
};

const seedData = async () => {
  try {
    await connectDB();

    // Clear existing data
    console.log('Clearing existing data...');
    await SiteSettings.deleteMany({});
    await HeroSection.deleteMany({});
    await Partner.deleteMany({});
    await Advantage.deleteMany({});
    await ProductCategory.deleteMany({});
    await Product.deleteMany({});
    await AboutContent.deleteMany({});
    await Certification.deleteMany({});
    await CertificationTechnology.deleteMany({});
    await DistributionChannel.deleteMany({});
    await Catalog.deleteMany({});
    await ContactInfo.deleteMany({});
    await FooterContent.deleteMany({});
    await Admin.deleteMany({});

    console.log('Seeding data...');

    // 1. Site Settings
    await SiteSettings.create({
      companyName: 'PT Kusuma Kencana Khatulistiwa',
      tagline: 'Kenyamanan Cinta Keluarga Indonesia',
      shopNowUrl: '#',
      tokopediaUrl: 'https://tokopedia.com',
      shopeeUrl: 'https://shopee.co.id',
      instagramUrl: 'https://instagram.com'
    });
    console.log('✓ Site Settings seeded');

    // 2. Hero Section
    await HeroSection.create({
      image: '/uploads/hero-placeholder.jpg',
      title: 'Menghadirkan perlengkapan tidur bayi dan handuk keluarga berkualitas premium sejak tahun 2001.',
      subtitle: 'Bersertifikat SNI, OEKO-TEX®, dan K3L.',
      buttonName: 'Lihat Koleksi Kami',
      buttonLink: '/produk'
    });
    console.log('✓ Hero Section seeded');

    // 3. Partners
    const partners = [
      { name: 'AEON', logo: '/uploads/partner-aeon.png', order: 1 },
      { name: 'Tokopedia', logo: '/uploads/partner-tokopedia.png', order: 2 },
      { name: 'Lotte', logo: '/uploads/partner-lotte.png', order: 3 },
      { name: 'Alfamidi', logo: '/uploads/partner-alfamidi.png', order: 4 },
      { name: 'LeeViera', logo: '/uploads/partner-leeviera.png', order: 5 },
      { name: 'Seibu', logo: '/uploads/partner-seibu.png', order: 6 },
      { name: 'Star', logo: '/uploads/partner-star.png', order: 7 }
    ];
    await Partner.insertMany(partners);
    console.log('✓ Partners seeded');

    // 4. Advantages
    const advantages = [
      {
        number: '01',
        title: 'Standar Keamanan Internasional (Certified Safety)',
        description: 'Produk kami menggunakan bahan-bahan yang sudah tersertifikasi aman. Kami bergabung dengan OEKO-TEX STANDARD 100 kelas tekstil keamanan tertinggi untuk produk yang bersentuhan langsung dengan kulit bayi. Sertifikasi ini menjamin produk kami bebas dari 300+ zat berbahaya.',
        order: 1
      },
      {
        number: '02',
        title: 'Material Premium & Teknologi Kenyamanan (Dream Comfort)',
        description: 'Menggunakan serat selulosa dari kayu yang ramah lingkungan (TENCEL™). Hypoallergenic, tidak menyebabkan alergi, cocok untuk semua jenis kulit. Daya serap lebih tinggi dari katun biasa, menjaga kulit tetap kering dan segar. Tersertifikasi Oeko-Tex untuk kepercayaan dan ketenangan orang tua.',
        order: 2
      },
      {
        number: '03',
        title: 'Karya Lokal, Kualitas Global (Local Roots, Global Reach)',
        description: 'Lebih dari 600 toko di Indonesia menjual produk kami. Ekspor ke Singapura, Australia, UK, Jepang, Korea.',
        order: 3
      }
    ];
    await Advantage.insertMany(advantages);
    console.log('✓ Advantages seeded');

    // 5. Product Categories
    const categories = await ProductCategory.insertMany([
      { name: 'Perlengkapan Tidur Bayi', slug: 'perlengkapan-tidur-bayi' },
      { name: 'Handuk Keluarga', slug: 'handuk-keluarga' }
    ]);
    console.log('✓ Product Categories seeded');

    // 6. Products
    const products = [];
    for (let i = 1; i <= 15; i++) {
      products.push({
        name: 'MintyDream Blanket',
        description: 'Selimut lembut yang didesain dengan texture Minky Dot yang lembut.',
        image: '/uploads/product-placeholder.jpg',
        category: categories[0]._id,
        price: 'Rp 150.000',
        link: '#',
        isFeatured: i <= 3
      });
    }
    await Product.insertMany(products);
    console.log('✓ Products seeded');

    // 7. About Content
    await AboutContent.insertMany([
      {
        section: 'history',
        title: 'Tentang Kami',
        content: 'Didirikan pada tahun 2001, kami memulai perjalanan sebagai produsen lokal yang peduli pada kualitas tidur bayi. Dari meja toko serba ada (department store) pertama di tahun 2002, kini kami telah hadir di lebih dari 600 gerai dari Sabang hingga Merauke. Pada 2016, kami berinovasi dengan menghadirkan handuk keluarga premium untuk melengkapi kebutuhan rumah tangga Anda.',
        images: ['/uploads/about-teamwork1.jpg', '/uploads/about-teamwork2.jpg']
      },
      {
        section: 'mission',
        title: 'Mission',
        content: '1. TO MAKE PRODUCTS THAT MAKE A DIFFERENCE IN THE LIVES OF OUR CUSTOMERS.\n2. CAREFUL PRODUCTS TO SERVE THE NEEDS OF CUSTOMERS, SAFETY, RELIABILITY AND COMFORT.\n3. A CREATIVE TEAM, HIGHLY INNOVATIVE, FULL OF ENTHUSIASM, AND SHARING THE COMPANY\'S VALUES AND CULTURE.',
        images: []
      },
      {
        section: 'vision',
        title: 'Vision',
        content: 'TO BE THE WORLD\'S LEADING PRODUCTS THAT SERVE THE BONDS OF FAMILY LOVE.',
        images: []
      }
    ]);
    console.log('✓ About Content seeded');

    // 8. Certifications
    await Certification.insertMany([
      {
        name: 'SNI & K3L',
        description: 'STANDAR NASIONAL INDONESIA & KEAMANAN KESEHATAN & KESELAMATAN, DAN LINGKUNGAN HIDUP.',
        order: 1
      },
      {
        name: 'OEKO-TEX STANDARD 100',
        description: 'SERTIFIKASI GLOBAL YANG MENJAMIN TEKSTIL BEBAS DARI ZAT BERBAHAYA BAGI KULIT.',
        order: 2
      },
      {
        name: 'HUTAN PRODUKSI LESTARIAN',
        description: 'KAYU YANG KAMI GUNAKAN BERSUMBER DARI PERKEBUNAN YANG DIKELOLA SECARA BERKELANJUTAN.',
        order: 3
      }
    ]);
    console.log('✓ Certifications seeded');

    // 9. Certification Technology
    await CertificationTechnology.create({
      title: 'DARI HUTAN UNTUK KENYAMANAN ANDA (FROM FOREST TO FASHION)',
      content: 'Kami menggunakan serat TENCEL™ yang berasal dari kayu eukaliptus yang ditanam secara berkelanjutan.',
      image: '/uploads/forest-technology.jpg',
      points: [
        'BERASAL DARI HUTAN BERSERTIFIKAT DAN TERPERCAYA',
        'DAPAT TERURAI SECARA ALAMI (BIODEGRADABLE)',
        'MENGGUNAKAN PROSES MANUFAKTUR LOOP TERTUTUP YANG HEMAT SUMBER DAYA ALAM',
        'TAHAN LAMA DAN LEMBUT SENSITIF'
      ]
    });
    console.log('✓ Certification Technology seeded');

    // 10. Distribution Channel
    await DistributionChannel.create({
      title: 'Our distribution network spans nearly the entire Indonesian Archipelago, from Sabang to Merauke, with over 600 outlets in Local Baby Store.',
      description: 'Jaringan distribusi kami mencakup hampir seluruh Indonesia.',
      mapImage: '/uploads/indonesia-map.png'
    });
    console.log('✓ Distribution Channel seeded');

    // 11. Catalog
    await Catalog.create({
      title: 'Company Catalogue',
      description: 'SIMPAN KOLEKSI LENGKAP KAMI DI GADGET ANDA. TEMUKAN MOTIF-MOTIF LUCU UNTUK SI KECIL DAN PELAJARI LEBIH LANJUT TENTANG TEKNOLOGI SERAT TENCEL SERTA STANDAR KEAMANAN OEKO-TEX YANG KAMI GUNAKAN UNTUK MELINDUNGI KELUARGA ANDA.',
      backgroundImage: '/uploads/catalog-bg.jpg',
      fileUrl: '/uploads/catalog.pdf'
    });
    console.log('✓ Catalog seeded');

    // 12. Contact Info
    await ContactInfo.create({
      phone: '021-535-7450',
      whatsapp: '0821-2233-8226',
      email: 'info@kusumakencana.co.id',
      address: 'Grha KATIGA, Jalan Kebon Jeruk Raya 18B, Kebon Jeruk, Jakarta, Indonesia 11530'
    });
    console.log('✓ Contact Info seeded');

    // 13. Footer Content
    await FooterContent.create({
      consultationTitle: 'Gratis Konsultasi',
      consultationText: 'Punya Pertanyaan Seputar Produk Si Kecil? atau Ingin menjadi bagian dari Keluarga Kuma Kuma? Tim kami siap membantu Anda menemukan kenyamanan terbaik untuk keluarga.',
      copyright: '2026 Kusuma Kencana Khatulistiwa. All rights Reserved. Developed by rendiero'
    });
    console.log('✓ Footer Content seeded');

    // 14. Admin
    await Admin.create({
      email: 'admin@kumakuma.com',
      password: 'admin123'
    });
    console.log('✓ Admin seeded');

    console.log('\n✅ All data seeded successfully!');
    console.log('\n📧 Admin Login:');
    console.log('   Email: admin@kumakuma.com');
    console.log('   Password: admin123');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedData();
