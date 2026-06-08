const express = require("express");
const multer  = require("multer");
const { extractTextFromPDF }                      = require("../services/resumeService");
const { generateOpeningQuestions, generateIntro } = require("../services/groqService");

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    if (file.mimetype === "application/pdf") cb(null, true);
    else cb(new Error("Only PDF files are allowed"), false);
  },
});

// POST /api/parse
// Returns: { resumeText, questions: string[], intro: string }
router.post("/", upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No PDF file uploaded" });
    }

    const resumeText = await extractTextFromPDF(req.file.buffer);

    // Run both in parallel for speed
    const [questions, intro] = await Promise.all([
      generateOpeningQuestions(resumeText, 3),
      generateIntro(resumeText),
    ]);

    res.json({ resumeText, questions, intro });
  } catch (err) {
    console.error("[/api/parse]", err.message);
    res.status(500).json({ error: err.message || "Failed to parse resume" });
  }
});

module.exports = router;