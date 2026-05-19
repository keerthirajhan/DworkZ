const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const BookingSchema = new mongoose.Schema({
  clientName: String,
  status: String,
  date: Date
}, { timestamps: true });

const Booking = mongoose.models.Booking || mongoose.model('Booking', BookingSchema);

const checkData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');
    
    const cancelled = await Booking.find({ status: 'Cancelled' });
    console.log('Total Cancelled Bookings:', cancelled.length);
    if (cancelled.length > 0) {
      console.log('Sample Record:', JSON.stringify(cancelled[0], null, 2));
    }
    
    const all = await Booking.find({});
    console.log('Total Bookings in DB:', all.length);
    const statuses = [...new Set(all.map(b => b.status))];
    console.log('Statuses found:', statuses);

    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

checkData();
