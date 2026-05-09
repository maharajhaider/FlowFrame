const mongoose = require("mongoose");
const { Schema, Types } = mongoose;

const attachmentSchema = new Schema({
  name: { type: String, required: true },
  originalName: { type: String, required: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },
  data: { type: Buffer, required: true },
  uploadedBy: {
    type: Types.ObjectId,
    ref: "User",
    required: true,
  },
}, { timestamps: true });

const commentSchema = new Schema({
  text: { type: String, required: true },
  author: {
    type: Types.ObjectId,
    ref: "User",
    required: true,
  },
}, { timestamps: true });

const taskSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    estimatedHours: { type: Number, min: 0 },
    inProgressStartTime: { type: Date, default: null },
    assignee: {
      type: Types.ObjectId,
      ref: "User",
      default: null,
    },
    status: {
      type: String,
      enum: ["todo", "in-progress", "done"],
      default: "todo",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    featureId: {
      type: Types.ObjectId,
      ref: "Feature",
      index: true,
      required: true,
    },
    sprintId: {
      type: Types.ObjectId,
      ref: "Sprint",
      index: true,
      required: true,
    },
    attachments: [attachmentSchema],
    comments: [commentSchema],
  },
  { timestamps: true }
);

// Virtual field to calculate actual hours
taskSchema.virtual('actualHours').get(function() {
  if (this.status === 'done' && this.inProgressStartTime) {
    const totalMinutes = Math.floor((this.updatedAt - this.inProgressStartTime) / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return { hours, minutes, totalMinutes };
  }
  return { hours: 0, minutes: 0, totalMinutes: 0 };
});

// Ensure virtual fields are included when converting to JSON
taskSchema.set('toJSON', { virtuals: true });
taskSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model("Task", taskSchema);
