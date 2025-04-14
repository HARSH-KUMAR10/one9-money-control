const express = require("express");
const { Expense, Trip, User } = require("../db/model");
const authenticateToken = require("../util/jwt");
const { default: mongoose } = require("mongoose");
const { sendMail } = require("../util/mailer");
const { generateHTML } = require("../util/common");
const expenseRouter = express.Router();

// @route   POST /api/expenses
// @desc    Create a new expense entry for the authenticated user
// @access  Protected
expenseRouter.post("/", authenticateToken, async (req, res) => {
  const { categoryId, amount, description, date, type, needOrWant, tripId } =
    req.body;

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

    if (tripId && expense)
      await Trip.findByIdAndUpdate(tripId, {
        $push: { expenses: expense._id },
      });
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

const calculateFrequencyKey = (date, frequency) => {
  const parsedDate = new Date(date);
  switch (frequency) {
    case "daily":
      return parsedDate.toISOString().split("T")[0]; // Format: YYYY-MM-DD
    case "weekly":
      const firstDayOfWeek = new Date(parsedDate);
      firstDayOfWeek.setDate(parsedDate.getDate() - parsedDate.getDay());
      return firstDayOfWeek.toISOString().split("T")[0]; // Start of the week
    case "monthly":
      return parsedDate.toISOString().slice(0, 7); // Format: YYYY-MM
    case "quarterly":
      const quarter = Math.floor((parsedDate.getMonth() + 3) / 3);
      return `${parsedDate.getFullYear()}-Q${quarter}`; // Format: YYYY-QX
    case "yearly":
      return parsedDate.getFullYear().toString(); // Format: YYYY
    default:
      return parsedDate.toISOString().slice(0, 7); // Default to monthly
  }
};

const filterExpensesForPeriod = async (
  userId,
  startDate,
  endDate,
  frequency
) => {
  // Convert start and end dates to ISO format
  const filter = {
    userId: new mongoose.Types.ObjectId(userId),
    date: { $gte: new Date(startDate), $lte: new Date(endDate) },
  };

  // Fetch expenses with category details
  const expenses = await Expense.aggregate([
    { $match: filter }, // Filter based on userId and date range
    {
      $lookup: {
        from: "categories", // Category collection
        localField: "categoryId",
        foreignField: "_id",
        as: "category",
      },
    },
    { $unwind: "$category" }, // Flatten category array
  ]);

  // Initialize stats object
  const stats = {
    totalAmount: 0,
    totalAmountByType: { fixed: 0, variable: 0 },
    totalAmountByNeedOrWant: { need: 0, want: 0 },
    totalAmountByFrequency: {}, // Dynamic based on frequency
    totalAmountByCategory: {},
  };

  // Iterate through the filtered expenses
  expenses.forEach((expense) => {
    // Total amount
    stats.totalAmount += expense.amount;

    // Total amount by type
    stats.totalAmountByType[expense.type] =
      (stats.totalAmountByType[expense.type] || 0) + expense.amount;

    // Total amount by need or want
    stats.totalAmountByNeedOrWant[expense.needOrWant] =
      (stats.totalAmountByNeedOrWant[expense.needOrWant] || 0) + expense.amount;

    // Total amount by frequency
    const frequencyKey = calculateFrequencyKey(expense.date, frequency);
    stats.totalAmountByFrequency[frequencyKey] =
      (stats.totalAmountByFrequency[frequencyKey] || 0) + expense.amount;

    // Total amount by category
    const categoryName = expense.category.name; // Replace "name" with your actual category field
    stats.totalAmountByCategory[categoryName] =
      (stats.totalAmountByCategory[categoryName] || 0) + expense.amount;
  });
  return stats;
};

expenseRouter.get("/stats/filter", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { startDate, endDate, frequency } = req.query;

    let stats = await filterExpensesForPeriod(
      userId,
      startDate,
      endDate,
      frequency
    );

    // Return stats in the response
    res.json({
      stats,
    });
  } catch (error) {
    console.error("Error fetching filtered expenses:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /get/all
expenseRouter.get("/get/all", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Extract filter parameters from the request
    const { startDate, endDate, frequency } = req.query;

    // Validate and parse dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Calculate filtered incomes
    const expenses = await Expense.aggregate([
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

    let expensesResponse = expenses;
    for (let i = 0; i < expensesResponse.length; i++) {
      expensesResponse[i].category = {
        name: expenses[i].category.name,
        type: expenses[i].category.type,
      };
      expensesResponse[i].user = { email: expenses[i].user.email };
    }

    // Send the response
    res.json({
      expenses: expensesResponse,
    });
  } catch (error) {
    console.error("Error:", error);
    res
      .status(500)
      .json({ error: "An error occurred while processing the data." });
  }
});

expenseRouter.get("/stats/report", async (req, res) => {
  try {
    const { startDate, endDate, frequency } = req.query;
    console.log(
      `===================================================\nstart-date: ${startDate}\tend-date: ${endDate}\tfrequency: ${frequency}`
    );
    let allUsers = await User.find({}, "email");
    allUsers.map(async (user) => {
      let stats = await filterExpensesForPeriod(
        user._id,
        startDate,
        endDate,
        frequency
      );
      console.log(
        `=====\tUser: ${JSON.stringify(user.email)} \tExpense: ${JSON.stringify(
          stats.totalAmount
        )}\t=====`
      );
      if (stats.totalAmount != 0) {
        const mailOptions = {
          from: process.env.SENDER_EMAIL,
          to: user.email, // Replace with recipient's email
          subject: `Expense Summary for ${startDate} to ${endDate}`,
          html: generateHTML(stats),
        };

        await sendMail(mailOptions);
      }
    });
    res.status(200).send({ success: true });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({
      error: "An error occurred while processing the data.",
      success: false,
    });
  }
});

expenseRouter.get("/stats/report/personal", async (req, res) => {
  try {
    let sent = false;
    const { startDate, endDate, frequency, email, userId } = req.query;
    console.log(
      `===================================================\nstart-date: ${startDate}\tend-date: ${endDate}\tfrequency: ${frequency}\temail: ${email}\tuserId: ${userId}`
    );
    let stats = await filterExpensesForPeriod(
      userId,
      startDate,
      endDate,
      frequency
    );
    console.log(
      `=====\tUser: ${JSON.stringify(email)} \tExpense: ${JSON.stringify(
        stats.totalAmount
      )}\t=====`
    );
    if (stats.totalAmount != 0) {
      sent = true;
      const mailOptions = {
        from: process.env.SENDER_EMAIL,
        to: email, // Replace with recipient's email
        subject: `Expense Summary for ${startDate} to ${endDate}`,
        html: generateHTML(stats),
      };

      await sendMail(mailOptions);
    }
    res.status(200).send({ success: sent, email });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({
      error: "An error occurred while processing the data.",
      success: false,
    });
  }
});

module.exports = expenseRouter;
