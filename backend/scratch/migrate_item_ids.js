const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const Inventory = require('../src/models/Inventory');

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/dworkz');
    console.log('MongoDB Connected');

    const unindexedItems = await Inventory.find({ itemId: { $exists: false } }).sort('createdAt');
    if (unindexedItems.length > 0) {
      console.log(`Migrating ${unindexedItems.length} inventory items to have sequential itemIds...`);
      for (let i = 0; i < unindexedItems.length; i++) {
        const item = unindexedItems[i];
        const existingCount = await Inventory.countDocuments({ itemId: { $exists: true } });
        item.itemId = `INV-${String(existingCount + 1).padStart(4, '0')}`;
        await item.save();
        console.log(`Updated ${item.itemName} with ID: ${item.itemId}`);
      }
      console.log('Migration complete successfully!');
    } else {
      console.log('All inventory items already have meaningful itemIds.');
    }
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await mongoose.disconnect();
  }
};

run();
