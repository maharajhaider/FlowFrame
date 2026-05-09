const mongoose = require("mongoose");
const { Schema, Types } = mongoose;

const userInteractionSchema = new Schema(
  {
    userId: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    taskId: {
      type: Types.ObjectId,
      ref: "Task",
      required: true,
      index: true,
    },
    interactionType: {
      type: String,
      enum: ["task_updated", "comment_added", "file_uploaded", "status_changed", "viewed"],
      required: true,
    },
    interactionData: {
      type: Schema.Types.Mixed,
      default: {},
    },
    previousValue: Schema.Types.Mixed,
    newValue: Schema.Types.Mixed,
  },
  { timestamps: true }
);

userInteractionSchema.index({ userId: 1, taskId: 1, createdAt: -1 });
userInteractionSchema.index({ userId: 1, interactionType: 1, createdAt: -1 });

module.exports = mongoose.model("UserInteraction", userInteractionSchema); 