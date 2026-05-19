const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/dworkz').then(async () => {
  const Booking = require('./src/models/Booking');
  const res = await Booking.updateMany({}, { $set: { roomName: 'Meeting Room' } });
  console.log('Updated bookings:', res);
  process.exit(0);
}).catch(console.error);
