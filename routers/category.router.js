const express = require("express");
const authenticateToken = require("../util/jwt");
const { Category } = require("../db/model");
const categoryRouter = express.Router();

// @route   POST /api/categories
// @desc    Create a new category for a user
// @access  Protected
categoryRouter.post("/", authenticateToken, async (req, res) => {
  const { name, type, threshold = 0 } = req.body;

  // Ensure the required fields are provided
  if (!name || !type) {
    return res
      .status(400)
      .json({ success: false, message: "Name and type are required" });
  }

  try {
    const category = new Category({
      userId: req.user.userId, // Assign the category to the authenticated user
      name,
      type,
      threshold,
    });

    await category.save();
    res.status(201).json({ success: true, category });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// @route   GET /api/categories
// @desc    Get all categories for the authenticated user
// @access  Protected
categoryRouter.get("/", authenticateToken, async (req, res) => {
  try {
    const categories = await Category.find({ userId: req.user.userId }); // Fetch categories belonging to the user
    res.status(200).json({ success: true, categories });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// @route   GET /api/categories/:id
// @desc    Get a single category by ID for the authenticated user
// @access  Protected
categoryRouter.get("/:id", authenticateToken, async (req, res) => {
  try {
    const category = await Category.findOne({
      _id: req.params.id,
      userId: req.user.userId,
    }); // Ensure user ownership

    if (!category) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }

    res.status(200).json({ success: true, category });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// @route   PUT /api/categories/:id
// @desc    Update a category by ID for the authenticated user
// @access  Protected
categoryRouter.put("/:id", authenticateToken, async (req, res) => {
  const { name, type, threshold = 0 } = req.body;

  try {
    const category = await Category.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId }, // Ensure user ownership
      { name, type, threshold },
      { new: true, runValidators: true }
    );

    if (!category) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }

    res.status(200).json({ success: true, category });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// @route   DELETE /api/categories/:id
// @desc    Delete a category by ID for the authenticated user
// @access  Protected
categoryRouter.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const category = await Category.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.userId,
    }); // Ensure user ownership

    if (!category) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }

    res
      .status(200)
      .json({ success: true, message: "Category deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = categoryRouter;
