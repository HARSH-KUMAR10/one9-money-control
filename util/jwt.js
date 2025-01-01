const jwt = require("jsonwebtoken");
require("dotenv").config();

const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Access token is required" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Add user data to request object
    next();
  } catch (error) {
    return res
      .status(403)
      .json({ message: "Invalid token", error: error.message });
  }
};

module.exports = authenticateToken;
