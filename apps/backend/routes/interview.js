const express = require("express");
const { generateFollowUp } = require("../services/groqService");

const router = express.Router();

// POST /api/interview
// Body: { resumeText: string, history: [{question, answer}], lastAnswer: string }
// Returns: { nextQuestion: string }
router.post("/", async (req, res) => {
  try {
    const { resumeText, history = [], lastAnswer } = req.body;

    if (!resumeText || !lastAnswer) {
      return res.status(400).json({ error: "resumeText and lastAnswer are required" });
    }

    const nextQuestion = await generateFollowUp(resumeText, history, lastAnswer);
    res.json({ nextQuestion });
  } catch (err) {
    console.error("[/api/interview]", err.message);
    res.status(500).json({ error: "Failed to generate follow-up question" });
  }
});

module.exports = router;