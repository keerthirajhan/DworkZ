const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Client = require('./src/models/Client');
const Proposal = require('./src/models/Proposal');
const Agreement = require('./src/models/Agreement');
const Activity = require('./src/models/Activity');
const Booking = require('./src/models/Booking');
const Invoice = require('./src/models/Invoice');

dotenv.config();

const clearData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB...');

    await Client.deleteMany({});
    await Proposal.deleteMany({});
    await Agreement.deleteMany({});
    await Activity.deleteMany({});
    await Booking.deleteMany({});
    await Invoice.deleteMany({});

    console.log('Data cleared successfully!');
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

clearData();
