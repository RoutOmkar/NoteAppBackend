import crypto from "crypto";
import bcrypt from "bcryptjs";
import User from "../model/User.js";
import sendOTPEmail from "../utils/sendEmail.js";
import jwt from "jsonwebtoken";

export const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        message: "Username, email and password are required"
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must contain at least 8 characters"
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    let user = await User.findOne({ email: normalizedEmail });

    if (user?.isVerified) {
      return res.status(409).json({
        message: "Email is already registered"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const otp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = crypto
      .createHash("sha256")
      .update(otp)
      .digest("hex");

    const otpExpires = new Date(Date.now() + 5 * 60 * 1000);

    if (user) {
      user.username = username.trim();
      user.password = hashedPassword;
      user.otpHash = otpHash;
      user.otpExpires = otpExpires;
      user.otpAttempts = 0;
    } else {
      user = new User({
        username: username.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        isVerified: false,
        otpHash,
        otpExpires,
        otpAttempts: 0
      });
    }

    await user.save();

    try {
      await sendOTPEmail(normalizedEmail, otp);
    } catch (emailError) {
      await User.deleteOne({
        _id: user._id,
        isVerified: false
      });

      console.error("OTP email failed:", emailError.message);

      return res.status(500).json({
        message: "Could not send OTP email. Please try again."
      });
    }

    return res.status(200).json({
      message: "OTP sent successfully. Please verify your email."
    });
  } catch (error) {
    console.error("Registration error:", error.message);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "Email is already registered"
      });
    }

    return res.status(500).json({
      message: "Server error"
    });
  }
};



//verify OTP

export const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    // 1. Check required fields
    if (!email || !otp) {
      return res.status(400).json({
        message: "Email and OTP are required"
      });
    }

    // 2. Find the user
    const user = await User.findOne({
      email: email.trim().toLowerCase()
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found. Please register first."
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        message: "Email is already verified"
      });
    }

    // 3. Check whether an OTP exists
    if (!user.otpHash || !user.otpExpires) {
      return res.status(400).json({
        message: "No active OTP. Please register again."
      });
    }

    // 4. Check OTP expiration
    if (user.otpExpires.getTime() <= Date.now()) {
      user.otpHash = null;
      user.otpExpires = null;
      user.otpAttempts = 0;
      await user.save();

      return res.status(400).json({
        message: "OTP expired. Please request a new OTP."
      });
    }

    // 5. Limit incorrect attempts
    if (user.otpAttempts >= 5) {
      return res.status(429).json({
        message: "Too many incorrect attempts. Request a new OTP."
      });
    }

    // 6. Hash the submitted OTP
    const submittedHash = crypto
      .createHash("sha256")
      .update(String(otp))
      .digest("hex");

    // 7. Compare OTP hashes
    if (submittedHash !== user.otpHash) {
      user.otpAttempts += 1;
      await user.save();

      return res.status(400).json({
        message: "Invalid OTP"
      });
    }

    // 8. Mark the user as verified
    user.isVerified = true;
    user.otpHash = null;
    user.otpExpires = null;
    user.otpAttempts = 0;

    await user.save();

    return res.status(200).json({
      message: "Email verified successfully. Registration completed."
    });

  } catch (error) {
    console.error("OTP verification error:", error.message);

    return res.status(500).json({
      message: "Server error during OTP verification"
    });
  }
};


//login 

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Check required fields
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required"
      });
    }

    // 2. Find the user
    const user = await User.findOne({
      email: email.trim().toLowerCase()
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    // 3. Ensure email is verified
    if (!user.isVerified) {
      return res.status(403).json({
        message: "Please verify your email before logging in"
      });
    }

    // 4. Compare submitted password with stored hash
    const isPasswordCorrect = await bcrypt.compare(
      password,
      user.password
    );

    if (!isPasswordCorrect) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    // 5. Check JWT secret
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not configured");
    }

    // 6. Generate JWT
    const token = jwt.sign(
      { sub: user._id.toString() },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "1h" }
    );

    // 7. Return login success
    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });

  } catch (error) {
    console.error("Login error:", error.message);

    return res.status(500).json({
      message: "Server error during login"
    });
  }
};