const express = require("express");
const { Expense } = require("../db/model");
const authenticateToken = require("../util/jwt");
const { default: mongoose } = require("mongoose");
const expenseRouter = express.Router();

// @route   POST /api/expenses
// @desc    Create a new expense entry for the authenticated user
// @access  Protected
expenseRouter.post("/", authenticateToken, async (req, res) => {
  const { categoryId, amount, description, date, type, needOrWant } = req.body;

  // Ensure required fields are provided
  if (!categoryId || !amount || !type || !needOrWant) {
    return res.status(400).json({
      success: false,
      message: "All required fields must be provided.",
    });
  }

  try {
    const expense = new Expense({
      userId: req.user.userId, // Link expense to the authenticated user
      categoryId,
      amount,
      description,
      date,
      type,
      needOrWant,
    });

    await expense.save();
    res.status(201).json({ success: true, expense });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// @route   GET /api/expenses
// @desc    Get all expense entries for the authenticated user
// @access  Protected
expenseRouter.get("/", authenticateToken, async (req, res) => {
  try {
    const expenses = await Expense.find({ userId: req.user.userId }) // Fetch expenses for the user
      .populate("categoryId", "name type") // Populate category details
      .sort({ date: -1 }); // Sort by most recent
    res.status(200).json({ success: true, expenses });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// @route   GET /api/expenses/:id
// @desc    Get a single expense entry by ID for the authenticated user
// @access  Protected
expenseRouter.get("/:id", authenticateToken, async (req, res) => {
  try {
    const expense = await Expense.findOne({
      _id: req.params.id,
      userId: req.user.userId,
    }) // Ensure user ownership
      .populate("categoryId", "name type");

    if (!expense) {
      return res
        .status(404)
        .json({ success: false, message: "Expense not found" });
    }

    res.status(200).json({ success: true, expense });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// @route   PUT /api/expenses/:id
// @desc    Update an expense entry by ID for the authenticated user
// @access  Protected
expenseRouter.put("/:id", authenticateToken, async (req, res) => {
  const { categoryId, amount, description, date, type, needOrWant } = req.body;

  try {
    const expense = await Expense.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId }, // Ensure user ownership
      { categoryId, amount, description, date, type, needOrWant },
      { new: true, runValidators: true }
    ).populate("categoryId", "name type");

    if (!expense) {
      return res
        .status(404)
        .json({ success: false, message: "Expense not found" });
    }

    res.status(200).json({ success: true, expense });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// @route   DELETE /api/expenses/:id
// @desc    Delete an expense entry by ID for the authenticated user
// @access  Protected
expenseRouter.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const expense = await Expense.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.userId,
    }); // Ensure user ownership

    if (!expense) {
      return res
        .status(404)
        .json({ success: false, message: "Expense not found" });
    }

    res
      .status(200)
      .json({ success: true, message: "Expense deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

expenseRouter.get("/stats/all", authenticateToken, async (req, res) => {
  try {
    console.log("stats", req.user.userId);
    const userId = req.user.userId;

    // Fetch expenses and join with categories
    const expenses = await Expense.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } }, // Match user-specific data
      {
        $lookup: {
          from: "categories", // The name of the Category collection
          localField: "categoryId",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: "$category" }, // Flatten the category array
    ]);

    // JavaScript Calculations
    const stats = {
      totalAmount: 0,
      totalAmountByType: { fixed: 0, variable: 0 },
      totalAmountByNeedOrWant: { need: 0, want: 0 },
      totalAmountByMonth: {},
      totalAmountByCategory: {},
    };

    // Iterate through the expenses
    expenses.forEach((expense) => {
      // Total amount
      stats.totalAmount += expense.amount;

      // Total amount by type
      stats.totalAmountByType[expense.type] =
        (stats.totalAmountByType[expense.type] || 0) + expense.amount;

      // Total amount by need or want
      stats.totalAmountByNeedOrWant[expense.needOrWant] =
        (stats.totalAmountByNeedOrWant[expense.needOrWant] || 0) +
        expense.amount;

      // Total amount by month
      const month = new Date(expense.date).toISOString().slice(0, 7); // Format YYYY-MM
      stats.totalAmountByMonth[month] =
        (stats.totalAmountByMonth[month] || 0) + expense.amount;

      // Total amount by category
      const categoryName = expense.category.name; // Replace "name" with your category field
      stats.totalAmountByCategory[categoryName] =
        (stats.totalAmountByCategory[categoryName] || 0) + expense.amount;
    });

    res.json({
      stats,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch expense stats" });
  }
});

module.exports = expenseRouter;
