const mongoose = require('mongoose');
const Client = require('./models/Client');

async function clearSampleData() {
  try {
    await mongoose.connect('mongodb://localhost:27017/dworkz');
    await Client.deleteMany({ companyName: { $in: ['TechNova', 'Freelance Hub'] } });
    console.log('Sample clients (TechNova and Freelance Hub) successfully removed.');
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

clearSampleData();
