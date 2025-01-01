const express = require("express");
const userRouter = require("./routers/user.router");
const connectDB = require("./db/db");
const categoryRouter = require("./routers/category.router");
const incomeRouter = require("./routers/income.router");
const expenseRouter = require("./routers/expense.router");
const tripRouter = require("./routers/trip.router");
const reportRouter = require("./routers/report.router");
const cors = require("cors");
require("dotenv").config();
const path = require("path");

const app = express();

connectDB();

// Middleware
app.use(express.json());
app.use(cors());
// Serve static files from the "dist" directory
app.use("/", express.static(path.join(__dirname, "dist")));

// User routes
app.use("/api/users", userRouter);
app.use("/api/category", categoryRouter);
app.use("/api/income", incomeRouter);
app.use("/api/expense", expenseRouter);
app.use("/api/trip", tripRouter);
app.use("/api/report", reportRouter);

// Fallback for all other routes to serve the index.html
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
