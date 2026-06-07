const express = require("express");
const multer  = require("multer");
const { extractTextFromPDF }      = require("../services/resumeService");
const { generateOpeningQuestions } = require("../services/groqService");

const router  = express.Router();
const upload  = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (_, file, cb) => {
    if (file.mimetype === "application/pdf") cb(null, true);
    else cb(new Error("Only PDF files are allowed"), false);
  },
});

// POST /api/parse
// Body: multipart/form-data with field "resume" (PDF file)
// Returns: { resumeText, questions: string[] }
router.post("/", upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No PDF file uploaded" });
    }

    const resumeText = await extractTextFromPDF(req.file.buffer);
    const questions  = await generateOpeningQuestions(resumeText, 3);

    res.json({ resumeText, questions });
  } catch (err) {
    console.error("[/api/parse]", err.message);
    res.status(500).json({ error: err.message || "Failed to parse resume" });
  }
});

module.exports = router;