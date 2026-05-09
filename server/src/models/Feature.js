const mongoose = require('mongoose');
const { Schema, Types } = mongoose;

const featureSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    sprintId: {
      type: Types.ObjectId,
      ref: 'Sprint',
      index: true,
      required: true,
    },

    // All tasks that implement this feature
    taskIds: [{ type: Types.ObjectId, ref: 'Task' }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Feature', featureSchema);
