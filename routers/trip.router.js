const express = require("express");
const { Trip } = require("../db/model");
const authenticateToken = require("../util/jwt");
const { default: mongoose } = require("mongoose");
const tripRouter = express.Router();

// @route   POST /api/trips
// @desc    Create a new trip for the authenticated user
// @access  Protected
tripRouter.post("/", authenticateToken, async (req, res) => {
  const { name, startDate, endDate, expenses } = req.body;

  // Ensure required fields are provided
  if (!name || !startDate) {
    return res
      .status(400)
      .json({ success: false, message: "Name and start date are required." });
  }

  try {
    const trip = new Trip({
      userId: req.user.userId, // Link trip to the authenticated user
      name,
      startDate,
      endDate,
      expenses,
    });

    await trip.save();
    res.status(201).json({ success: true, trip });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// @route   GET /api/trips
// @desc    Get all trips for the authenticated user
// @access  Protected
tripRouter.get("/", authenticateToken, async (req, res) => {
  try {
    const trips = await Trip.find({ userId: req.user.userId }) // Fetch trips for the user
      .populate("expenses", "amount description date type needOrWant") // Populate expenses
      .sort({ startDate: -1 }); // Sort by most recent start date
    res.status(200).json({ success: true, trips });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// @route   GET /api/trips/:id
// @desc    Get a single trip by ID for the authenticated user
// @access  Protected
tripRouter.get("/:id", authenticateToken, async (req, res) => {
  try {
    const trip = await Trip.findOne({
      _id: req.params.id,
      userId: req.user.userId,
    }) // Ensure user ownership
      .populate("expenses", "amount description date type needOrWant");

    if (!trip) {
      return res
        .status(404)
        .json({ success: false, message: "Trip not found" });
    }

    res.status(200).json({ success: true, trip });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// @route   PUT /api/trips/:id
// @desc    Update a trip by ID for the authenticated user
// @access  Protected
tripRouter.put("/:id", authenticateToken, async (req, res) => {
  const { name, startDate, endDate, expenses } = req.body;

  try {
    const trip = await Trip.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId }, // Ensure user ownership
      { name, startDate, endDate, expenses },
      { new: true, runValidators: true }
    ).populate("expenses", "amount description date type needOrWant");

    if (!trip) {
      return res
        .status(404)
        .json({ success: false, message: "Trip not found" });
    }

    res.status(200).json({ success: true, trip });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// @route   DELETE /api/trips/:id
// @desc    Delete a trip by ID for the authenticated user
// @access  Protected
tripRouter.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const trip = await Trip.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.userId,
    }); // Ensure user ownership

    if (!trip) {
      return res
        .status(404)
        .json({ success: false, message: "Trip not found" });
    }

    res
      .status(200)
      .json({ success: true, message: "Trip deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

tripRouter.get("/stats/all", authenticateToken, async (req, res) => {
  try {
    console.log("Fetching trip stats for user:", req.user.userId);
    const userId = req.user.userId;

    // Fetch trips and populate related expenses
    const trips = await Trip.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } }, // Match trips for the user
      {
        $lookup: {
          from: "expenses", // Join with Expense collection
          localField: "expenses",
          foreignField: "_id",
          as: "expensesDetails",
        },
      },
      {
        $lookup: {
          from: "categories", // Join with Category collection for each expense
          localField: "expensesDetails.categoryId",
          foreignField: "_id",
          as: "categoriesDetails",
        },
      },
    ]);

    const stats = trips.map((trip) => {
      // Initialize trip-specific stats
      const tripStats = {
        tripName: trip.name,
        tripDuration: 0, // In days
        totalAmount: 0,
        totalAmountByType: { fixed: 0, variable: 0 },
        totalAmountByNeedOrWant: { need: 0, want: 0 },
        totalAmountByCategory: {},
        averageDailyExpense: 0,
      };

      // Calculate trip duration
      const startDate = new Date(trip.startDate);
      const endDate = trip.endDate ? new Date(trip.endDate) : new Date();
      tripStats.tripDuration =
        Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) || 1;

      // Calculate stats from expenses
      trip.expensesDetails.forEach((expense) => {
        // Total amount
        tripStats.totalAmount += expense.amount;

        // Total amount by type
        tripStats.totalAmountByType[expense.type] =
          (tripStats.totalAmountByType[expense.type] || 0) + expense.amount;

        // Total amount by need or want
        tripStats.totalAmountByNeedOrWant[expense.needOrWant] =
          (tripStats.totalAmountByNeedOrWant[expense.needOrWant] || 0) +
          expense.amount;

        // Total amount by category
        const categoryName = trip.categoriesDetails.find(
          (category) =>
            category._id.toString() === expense.categoryId.toString()
        )?.name;
        if (categoryName) {
          tripStats.totalAmountByCategory[categoryName] =
            (tripStats.totalAmountByCategory[categoryName] || 0) +
            expense.amount;
        }
      });

      // Calculate average daily expense
      tripStats.averageDailyExpense = (
        tripStats.totalAmount / tripStats.tripDuration
      ).toFixed(2);

      return tripStats;
    });

    res.json({
      stats,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch trip stats" });
  }
});

module.exports = tripRouter;