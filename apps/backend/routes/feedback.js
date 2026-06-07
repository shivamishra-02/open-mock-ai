const express = require("express");
const { generateFeedbackReport } = require("../services/groqService");

const router = express.Router();

// POST /api/feedback
// Body: { resumeText: string, transcript: [{question: string, answer: string}] }
// Returns: full feedback JSON object (see groqService for shape)
router.post("/", async (req, res) => {
  try {
    const { resumeText, transcript } = req.body;

    if (!resumeText || !transcript || transcript.length === 0) {
      return res.status(400).json({ error: "resumeText and transcript are required" });
    }

    const report = await generateFeedbackReport(resumeText, transcript);
    res.json(report);
  } catch (err) {
    console.error("[/api/feedback]", err.message);
    res.status(500).json({ error: "Failed to generate feedback report" });
  }
});

module.exports = router;