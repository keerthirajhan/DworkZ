const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Client = require('./models/Client');

const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '../.env') });
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/dworkz');

const seedData = async () => {
  try {
    await User.deleteMany();
    await Client.deleteMany();

    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@dworkz.com',
      password: 'password123',
      role: 'admin'
    });

    await Client.create([
      {
        name: 'John Doe',
        companyName: 'TechNova',
        contactEmail: 'john@technova.com',
        contactPhone: '1234567890',
        planType: 'Monthly',
        workspaceType: 'Cabin',
        workspaceDetails: 'Cabin 4',
        rentAmount: 2500,
        status: 'Active',
        userId: admin._id
      },
      {
        name: 'Sarah Smith',
        companyName: 'Freelance Hub',
        contactEmail: 'sarah@freelance.com',
        contactPhone: '0987654321',
        planType: 'Daily',
        workspaceType: 'Desk',
        workspaceDetails: 'Desk 12',
        rentAmount: 50,
        status: 'Lead',
        userId: admin._id
      }
    ]);

    console.log('Database successfully seeded with admin user and sample clients!');
    process.exit();
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
};

seedData();
