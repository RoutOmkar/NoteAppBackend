import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    password: {
      type: String,
      required: true
    },

    isVerified: {
      type: Boolean,
      default: false
    },

    otpHash: {
      type: String,
      default: null
    },

    otpExpires: {
      type: Date,
      default: null
    },

    otpAttempts: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;