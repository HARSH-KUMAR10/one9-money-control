const express = require("express");
const authenticateToken = require("../util/jwt");
const { Report } = require("../db/model");
const reportRouter = express.Router();

// @route   POST /api/reports
// @desc    Generate a new report for the authenticated user
// @access  Protected
reportRouter.post("/", authenticateToken, async (req, res) => {
  const { type, stats } = req.body;

  // Ensure the type is provided
  if (!type || !["weekly", "monthly", "yearly", "trip"].includes(type)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid or missing report type." });
  }

  try {
    const report = new Report({
      userId: req.user.userId,
      type,
      stats,
    });

    await report.save();
    res.status(201).json({ success: true, report });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// @route   GET /api/reports
// @desc    Get all reports for the authenticated user
// @access  Protected
reportRouter.get("/", authenticateToken, async (req, res) => {
  try {
    const reports = await Report.find({ userId: req.user.userId }).sort({
      createdAt: -1,
    }); // Sort by most recent
    res.status(200).json({ success: true, reports });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// @route   GET /api/reports/:id
// @desc    Get a specific report by ID for the authenticated user
// @access  Protected
reportRouter.get("/:id", authenticateToken, async (req, res) => {
  try {
    const report = await Report.findOne({
      _id: req.params.id,
      userId: req.user.userId,
    }); // Ensure ownership

    if (!report) {
      return res
        .status(404)
        .json({ success: false, message: "Report not found." });
    }

    res.status(200).json({ success: true, report });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// @route   PUT /api/reports/:id
// @desc    Update a specific report by ID
// @access  Protected
reportRouter.put("/:id", authenticateToken, async (req, res) => {
  const { type, stats } = req.body;

  // Validate the type
  if (type && !["weekly", "monthly", "yearly", "trip"].includes(type)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid report type." });
  }

  try {
    const report = await Report.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId }, // Ensure ownership
      { type, stats },
      { new: true, runValidators: true }
    );

    if (!report) {
      return res
        .status(404)
        .json({ success: false, message: "Report not found." });
    }

    res.status(200).json({ success: true, report });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// @route   DELETE /api/reports/:id
// @desc    Delete a specific report by ID
// @access  Protected
reportRouter.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const report = await Report.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.userId,
    }); // Ensure ownership

    if (!report) {
      return res
        .status(404)
        .json({ success: false, message: "Report not found." });
    }

    res
      .status(200)
      .json({ success: true, message: "Report deleted successfully." });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = reportRouter;
