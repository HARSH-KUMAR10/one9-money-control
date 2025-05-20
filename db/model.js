const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

// User Schema
const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    hashedPassword: { type: String, required: true },
  },
  { timestamps: true }
);

// Compare the hashed password during login
UserSchema.methods.comparePassword = async function (password) {
  return bcrypt.compare(password, this.hashedPassword);
};

const User = mongoose.model("User", UserSchema);

// Category Schema
const CategorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: { type: String, required: true },
    type: { type: String, enum: ["income", "expense"], required: true }, // Specifies if it's for income or expense
    threshold: { type: Number, default: null }, // Optional threshold for expenses
  },
  { timestamps: true }
);

const Category = mongoose.model("Category", CategorySchema);

// Income Schema
const IncomeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    amount: { type: Number, required: true },
    source: { type: String, required: true },
    date: { type: Date, default: Date.now },
    type: { type: String, enum: ["fixed", "variable"], required: true },
  },
  { timestamps: true }
);

const Income = mongoose.model("Income", IncomeSchema);

// Expense Schema
const ExpenseSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    amount: { type: Number, required: true },
    description: { type: String },
    date: { type: Date, default: Date.now },
    type: { type: String, enum: ["fixed", "variable"], required: true },
    needOrWant: { type: String, enum: ["need", "want"], required: true },
  },
  { timestamps: true }
);

const Expense = mongoose.model("Expense", ExpenseSchema);

// Trip Schema
const TripSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    expenses: [{ type: mongoose.Schema.Types.ObjectId, ref: "Expense" }],
  },
  { timestamps: true }
);

const Trip = mongoose.model("Trip", TripSchema);

// Report Schema (Optional for Email Reminders)
const ReportSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["weekly", "monthly", "yearly", "trip"],
      required: true,
    },
    generatedAt: { type: Date, default: Date.now },
    stats: { type: Object }, // Stores aggregated data for the report
  },
  { timestamps: true }
);

const Report = mongoose.model("Report", ReportSchema);

module.exports = { User, Category, Income, Expense, Trip, Report };
