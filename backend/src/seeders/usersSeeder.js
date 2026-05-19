const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');

// Load env vars
dotenv.config();

// Connect to DB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/dworkz');
    console.log('MongoDB Connected for seeding...');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

const users = [
  {
    name: 'Jain',
    email: 'jayandran@thedworkz.com',
    password: 'Jayandran@2026',
    role: 'admin'
  },
  {
    name: 'King',
    email: 'kingston@thedworkz.com',
    password: 'Dworkz@2026',
    role: 'admin'
  },
  {
    name: 'Staff',
    email: 'staff@thedworkz.com',
    password: 'Staff@2026',
    role: 'staff'
  }
];

const seedUsers = async () => {
  try {
    await connectDB();
    
    // Clear existing newly added users to ensure case-insensitivity fix
    const emailsToClear = users.map(u => u.email);
    await User.deleteMany({ email: { $in: emailsToClear } });
    console.log('Cleared existing test users...');

    for (const u of users) {
      const exists = await User.findOne({ email: u.email });
      if (exists) {
        console.log(`User ${u.email} already exists, skipping...`);
      } else {
        await User.create(u);
        console.log(`User created: ${u.email}`);
      }
    }

    console.log('Seeding completed!');
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

seedUsers();
