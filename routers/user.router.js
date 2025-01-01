const express = require("express");
const jwt = require("jsonwebtoken");
const { User } = require("../db/model");
require("dotenv").config();

const userRouter = express.Router();

// Fetch all users (Admin-only functionality)
userRouter.get("/", async (req, res) => {
  try {
    const users = await User.find({}, "email"); // Fetch only email to keep it minimal
    res.status(200).json(users);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching users", error: error.message });
  }
});

// Login API
userRouter.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRATION,
      }
    );

    res.status(200).json({ message: "Login successful", token, id: user._id });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error during login", error: error.message });
  }
});

module.exports = userRouter;
