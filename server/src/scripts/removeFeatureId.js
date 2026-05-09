const mongoose = require('mongoose');
const ContextFile = require('../models/ContextFile');

async function removeFeatureId() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/flowframe');
    console.log('Connected to MongoDB');

    const result = await ContextFile.updateMany(
      {},
      { $unset: { featureId: "" } }
    );

    console.log(`Updated ${result.modifiedCount} documents`);
    console.log('Successfully removed featureId field from all ContextFile documents');

    await mongoose.connection.close();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error removing featureId:', error);
    process.exit(1);
  }
}

removeFeatureId(); 