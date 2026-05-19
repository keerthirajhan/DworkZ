const mongoose = require('mongoose');
const Activity = require('./models/Activity');
require('dotenv').config({ path: '../.env' });

mongoose.connect('mongodb://localhost:27017/dworkz').then(async () => {
  await Activity.deleteMany();
  await Activity.create([
    { title: 'System initialized', desc: 'DworkZ platform started.', type: 'system', color: 'bg-primary', createdAt: new Date(Date.now() - 10000000) },
    { title: 'New Client Onboarded', desc: 'TechNova signed a monthly contract.', type: 'client', color: 'bg-emerald-500', createdAt: new Date(Date.now() - 5000000) },
    { title: 'Payment Pending', desc: 'Acme Corp invoice #102 is due.', type: 'payment', color: 'bg-rose-500', createdAt: new Date(Date.now() - 1000000) },
    { title: 'Room Booked', desc: 'Conference Room booked by Freelance Hub.', type: 'booking', color: 'bg-accent', createdAt: Date.now() },
  ]);
  console.log('Activities seeded');
  process.exit();
});
