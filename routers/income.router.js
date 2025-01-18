const express = require("express");
const authenticateToken = require("../util/jwt");
const { Income } = require("../db/model");
const { default: mongoose } = require("mongoose");
const incomeRouter = express.Router();

// @route   POST /api/incomes
// @desc    Create a new income entry for the authenticated user
// @access  Protected
incomeRouter.post("/", authenticateToken, async (req, res) => {
  const { categoryId, amount, source, date, type } = req.body;

  // Ensure required fields are provided
  if (!categoryId || !amount || !source || !type) {
    return res.status(400).json({
      success: false,
      message: "All required fields must be provided.",
    });
  }

  try {
    const income = new Income({
      userId: req.user.userId, // Link income to the authenticated user
      categoryId,
      amount,
      source,
      date,
      type,
    });

    await income.save();
    res.status(201).json({ success: true, income });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// @route   GET /api/incomes
// @desc    Get all income entries for the authenticated user
// @access  Protected
incomeRouter.get("/", authenticateToken, async (req, res) => {
  try {
    const incomes = await Income.find({ userId: req.user.userId }) // Fetch incomes for the user
      .populate("categoryId", "name type") // Populate category details
      .sort({ date: -1 }); // Sort by most recent
    res.status(200).json({ success: true, incomes });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// @route   GET /api/incomes/:id
// @desc    Get a single income entry by ID for the authenticated user
// @access  Protected
incomeRouter.get("/:id", authenticateToken, async (req, res) => {
  try {
    const income = await Income.findOne({
      _id: req.params.id,
      userId: req.user.userId,
    }) // Ensure user ownership
      .populate("categoryId", "name type");

    if (!income) {
      return res
        .status(404)
        .json({ success: false, message: "Income not found" });
    }

    res.status(200).json({ success: true, income });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// @route   PUT /api/incomes/:id
// @desc    Update an income entry by ID for the authenticated user
// @access  Protected
incomeRouter.put("/:id", authenticateToken, async (req, res) => {
  const { categoryId, amount, source, date, type } = req.body;

  try {
    const income = await Income.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId }, // Ensure user ownership
      { categoryId, amount, source, date, type },
      { new: true, runValidators: true }
    ).populate("categoryId", "name type");

    if (!income) {
      return res
        .status(404)
        .json({ success: false, message: "Income not found" });
    }

    res.status(200).json({ success: true, income });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// @route   DELETE /api/incomes/:id
// @desc    Delete an income entry by ID for the authenticated user
// @access  Protected
incomeRouter.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const income = await Income.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.userId,
    }); // Ensure user ownership

    if (!income) {
      return res
        .status(404)
        .json({ success: false, message: "Income not found" });
    }

    res
      .status(200)
      .json({ success: true, message: "Income deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /income/stats
incomeRouter.get("/stats/all", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Calculate total income
    const incomes = await Income.aggregate([
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
      totalAmountByMonth: {},
      totalAmountByCategory: {},
    };

    // Iterate through the incomes
    incomes.forEach((income) => {
      // Total amount
      stats.totalAmount += income.amount;

      // Total amount by type
      stats.totalAmountByType[income.type] =
        (stats.totalAmountByType[income.type] || 0) + income.amount;

      // Total amount by month
      const month = new Date(income.date).toISOString().slice(0, 7); // Format YYYY-MM
      stats.totalAmountByMonth[month] =
        (stats.totalAmountByMonth[month] || 0) + income.amount;

      // Total amount by category
      const categoryName = income.category.name; // Replace "name" with your category field
      stats.totalAmountByCategory[categoryName] =
        (stats.totalAmountByCategory[categoryName] || 0) + income.amount;
    });

    res.json({
      stats,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch income stats" });
  }
});

// GET /income/filter
incomeRouter.get("/stats/filter", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Extract filter parameters from the request
    const { startDate, endDate, frequency } = req.query;

    // Validate and parse dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Calculate filtered incomes
    const incomes = await Income.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          date: { $gte: start, $lte: end }, // Filter by date range
        },
      },
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
      totalAmountByFrequency: {}, // Dynamically based on the frequency
      totalAmountByCategory: {},
    };

    // Helper function to get frequency key
    const getFrequencyKey = (date) => {
      const d = new Date(date);
      switch (frequency) {
        case "daily":
          return d.toISOString().slice(0, 10); // Format: YYYY-MM-DD
        case "weekly": {
          const week = Math.ceil(d.getDate() / 7); // Calculate week number
          return `${d.getFullYear()}-W${week}`; // Format: YYYY-W<number>
        }
        case "monthly":
          return d.toISOString().slice(0, 7); // Format: YYYY-MM
        case "quarterly": {
          const quarter = Math.floor(d.getMonth() / 3) + 1; // Calculate quarter
          return `${d.getFullYear()}-Q${quarter}`; // Format: YYYY-Q<number>
        }
        case "yearly":
          return `${d.getFullYear()}`; // Format: YYYY
        default:
          return d.toISOString().slice(0, 7); // Default to monthly
      }
    };

    // Iterate through the incomes
    incomes.forEach((income) => {
      // Total amount
      stats.totalAmount += income.amount;

      // Total amount by type
      stats.totalAmountByType[income.type] =
        (stats.totalAmountByType[income.type] || 0) + income.amount;

      // Total amount by frequency
      const frequencyKey = getFrequencyKey(income.date);
      stats.totalAmountByFrequency[frequencyKey] =
        (stats.totalAmountByFrequency[frequencyKey] || 0) + income.amount;

      // Total amount by category
      const categoryName = income.category.name; // Replace "name" with your category field
      stats.totalAmountByCategory[categoryName] =
        (stats.totalAmountByCategory[categoryName] || 0) + income.amount;
    });

    // Send the response
    res.json({
      stats,
    });
  } catch (error) {
    console.error("Error:", error);
    res
      .status(500)
      .json({ error: "An error occurred while processing the data." });
  }
});

// GET /get/all
incomeRouter.get("/get/all", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Extract filter parameters from the request
    const { startDate, endDate, frequency } = req.query;

    // Validate and parse dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Calculate filtered incomes
    const incomes = await Income.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          date: { $gte: start, $lte: end }, // Filter by date range
        },
      },
      {
        $lookup: {
          from: "categories", // The name of the Category collection
          localField: "categoryId",
          foreignField: "_id",
          as: "category",
        },
      },
      {
        $lookup: {
          from: "users", // The name of the Category collection
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$category" },
      { $unwind: "$user" }, // Flatten the category array
    ]);

    let incomesResponse = incomes;
    for (let i = 0; i < incomesResponse.length; i++) {
      incomesResponse[i].category = {
        name: incomes[i].category.name,
        type: incomes[i].category.type,
      };
      incomesResponse[i].user = { email: incomes[i].user.email };
    }

    // Send the response
    res.json({
      incomes: incomesResponse,
    });
  } catch (error) {
    console.error("Error:", error);
    res
      .status(500)
      .json({ error: "An error occurred while processing the data." });
  }
});

module.exports = incomeRouter;
