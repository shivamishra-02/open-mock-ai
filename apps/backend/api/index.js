require("dotenv").config();
const express = require("express");
const cors = require("cors");

const parseRoute     = require("../routes/parse");
const interviewRoute = require("../routes/interview");
const feedbackRoute  = require("../routes/feedback");

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || "*",
  methods: ["GET", "POST"],
}));
app.use(express.json({ limit: "10mb" }));

// Routes
app.use("/api/parse",     parseRoute);
app.use("/api/interview", interviewRoute);
app.use("/api/feedback",  feedbackRoute);

// Health check
app.get("/api/health", (_, res) => res.json({ status: "ok" }));

// Local dev server
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () =>
    console.log(`Backend running at http://localhost:${PORT}`)
  );
}

module.exports = app;