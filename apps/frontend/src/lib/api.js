import axios from "axios";

const BASE = "/api";

/**
 * Upload resume PDF. Returns { resumeText, questions }
 */
export async function parseResume(file) {
  const form = new FormData();
  form.append("resume", file);
  const { data } = await axios.post(`${BASE}/parse`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

/**
 * Get a follow-up question after the candidate answers.
 * Returns { nextQuestion }
 */
export async function getNextQuestion({ resumeText, history, lastAnswer }) {
  const { data } = await axios.post(`${BASE}/interview`, {
    resumeText,
    history,
    lastAnswer,
  });
  return data;
}

/**
 * Generate feedback report from full transcript.
 * Returns the full report object.
 */
export async function getFeedbackReport({ resumeText, transcript }) {
  const { data } = await axios.post(`${BASE}/feedback`, {
    resumeText,
    transcript,
  });
  return data;
}