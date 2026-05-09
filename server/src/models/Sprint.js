const mongoose = require('mongoose');
const { Schema, model, Types } = mongoose;

const sprintSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    state: { type: String, enum: ['future', 'active', 'completed'], default: 'future' },
    featureIds: [{ type: Types.ObjectId, ref: 'Feature' }],
  },
  { timestamps: true }
);

module.exports = model('Sprint', sprintSchema);