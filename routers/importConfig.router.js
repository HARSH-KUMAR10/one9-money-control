// routes/configuration.js
const express = require("express");
const { ImportConfiguration, Expense } = require("../db/model");
const importConfigRouter = express.Router();
const multer = require("multer");
const pdf2table = require("pdf2table");
const fs = require("fs");
const authenticateToken = require("../util/jwt");
const { analyzeExcel, safeUnlink } = require("../util/excelAnalyzer");
const upload = multer({ dest: "uploads/" });
const excelUpload = multer({
  dest: "excel-uploads/",
  fileFilter: (req, file, cb) => {
    const ok =
      file.mimetype ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || // .xlsx
      file.mimetype === "application/vnd.ms-excel"; // .xls (older)
    if (!ok) return cb(new Error("Only .xlsx or .xls files are allowed"));
    cb(null, true);
  },
});

// Create new configuration
importConfigRouter.post("/", authenticateToken, async (req, res) => {
  try {
    const { name, table, mappings } = req.body;
    const userId = req.user.userId;
    const config = new ImportConfiguration({ userId, name, table, mappings });
    await config.save();
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all configs for a user
importConfigRouter.get("/", authenticateToken, async (req, res) => {
  try {
    const configs = await ImportConfiguration.find({
      userId: req.user.userId,
    });
    res.json(configs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get one config
importConfigRouter.get("/single/:id", authenticateToken, async (req, res) => {
  try {
    const config = await ImportConfiguration.findById(req.params.id);
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upload + Analyze PDF
importConfigRouter.post(
  "/pdf/analyze/:configId",
  authenticateToken,
  upload.single("file"),
  async (req, res) => {
    try {
      const config = await ImportConfiguration.findById(req.params.configId);
      if (!config)
        return res.status(404).json({ error: "Configuration not found" });

      const filePath = req.file.path;

      const buffer = fs.readFileSync(filePath);
      pdf2table.parse(buffer, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        // rows = [ ["col1","col2",...], ["data1","data2",...] ]

        // Remove top text by detecting when structured rows start (min 3+ cols)
        const tableRows = rows.filter((r) => r.length > 1);

        // Apply mapping
        const records = tableRows.map((row) => {
          let mapped = {};
          config.mappings.forEach((m) => {
            mapped[m.field] = row[m.columnIndex] || "";
          });
          return mapped;
        });

        // Cleanup temp file
        fs.unlinkSync(filePath);

        res.json({ records });
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// Bulk insert records
importConfigRouter.post("/", authenticateToken, async (req, res) => {
  try {
    const { records } = req.body;
    if (!records || !records.length) {
      return res.status(400).json({ error: "No records provided" });
    }

    const inserted = await Expense.insertMany(records);
    res.json({ success: true, count: inserted.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /excel/analyze/:configId
importConfigRouter.post(
  "/excel/analyze/:configId",
  upload.single("file"),
  async (req, res) => {
    const tmp = req.file?.path;
    try {
      const { configId } = req.params;
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });

      const config = await ImportConfiguration.findById(configId);
      if (!config)
        return res.status(404).json({ error: "Configuration not found" });
      if (!Array.isArray(config.mappings) || config.mappings.length === 0) {
        return res.status(400).json({ error: "Configuration has no mappings" });
      }

      const records = analyzeExcel(tmp, config);
      return res.json({ records });
    } catch (err) {
      console.error(err);
      return res
        .status(500)
        .json({ error: err.message || "Excel analysis failed" });
    } finally {
      if (tmp) safeUnlink(tmp);
    }
  }
);

module.exports = importConfigRouter;
