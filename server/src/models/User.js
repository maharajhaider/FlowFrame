const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const SALT_ROUNDS = parseInt(process.env.SALT_ROUNDS || '10', 10);
const DEFAULT_ROLE = process.env.DEFAULT_ROLE || 'user';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, minlength: 6 },
    roles: { type: [String], default: [DEFAULT_ROLE] },
    skills: { type: [String], default: [] },
    skill_description: String,
    past_issues_solved: [String],
    current_workload: { type: Number, default: 0 },
    max_capacity: { type: Number, default: 8 },
    availability: { type: Boolean, default: true },
    experience_level: { 
      type: String, 
      enum: ['junior', 'mid', 'senior'], 
      default: 'junior' 
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: String,
    emailVerificationExpiresAt: Date,
    passwordResetToken: String,
    passwordResetExpiresAt: Date,
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    created_at: { type: Date, default: Date.now },
  },
  { timestamps: true, toJSON: { getters: true, virtuals: false } }
);

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
});

// Compare a plain password with the stored hash
userSchema.methods.matches = function (plain) {
  return bcrypt.compare(plain, this.password);
};

userSchema.methods.hasRole = function (role) {
  return this.roles.includes(role);
};

userSchema.methods.isProjectManager = function () {
  return this.hasRole('project_manager');
};

module.exports = mongoose.model('User', userSchema);
