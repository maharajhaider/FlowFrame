const mongoose = require("mongoose");
const { Schema, model, Types } = mongoose;

const projectSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    sprintIds: [{ type: Types.ObjectId, ref: "Sprint" }],
    featureIds: [{ type: Types.ObjectId, ref: "Feature" }],
    taskIds: [{ type: Types.ObjectId, ref: "Task" }],
  },
  { timestamps: true }
);

module.exports = {
  Project: model("Project", projectSchema),
};
