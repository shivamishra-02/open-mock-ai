const Groq = require("groq-sdk");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = "llama-3.3-70b-versatile";

/**
 * Generate a short interviewer intro based on resume.
 */
async function generateIntro(resumeText) {
  const chat = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: `You are a warm but professional technical interviewer starting a mock interview session.
Generate a short spoken intro (3-4 sentences max) that:
1. Greets the candidate warmly (don't use their name, just say "Welcome")
2. Mentions you've reviewed their resume
3. Sets expectations ("I'll ask a few technical and experience-based questions")
4. Ends with asking them to briefly introduce themselves

Keep it natural, conversational, and encouraging. Return ONLY the spoken text, nothing else.`,
      },
      {
        role: "user",
        content: `Resume:\n${resumeText}`,
      },
    ],
    temperature: 0.7,
    max_tokens: 200,
  });

  return chat.choices[0].message.content.trim();
}

/**
 * Generate opening interview questions from resume text.
 */
async function generateOpeningQuestions(resumeText, count = 3) {
  const chat = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: `You are a sharp, senior technical interviewer.
Analyse the resume and generate exactly ${count} interview questions.
Rules:
- Mix technical depth questions with experience-based questions
- One question must be about a specific project or technology from the resume
- Be conversational, not robotic
- Return ONLY a JSON array of strings. No extra text.
Example: ["Tell me about...", "How did you...", "Walk me through..."]`,
      },
      {
        role: "user",
        content: `Resume:\n${resumeText}`,
      },
    ],
    temperature: 0.7,
    max_tokens: 500,
  });

  const raw = chat.choices[0].message.content.trim();
  try {
    return JSON.parse(raw);
  } catch {
    return raw.split("\n").filter(Boolean).slice(0, count);
  }
}

/**
 * Generate a follow-up question based on the last answer.
 */
async function generateFollowUp(resumeText, history, lastAnswer) {
  const historyText = history
    .map((h) => `Q: ${h.question}\nA: ${h.answer}`)
    .join("\n\n");

  const chat = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: `You are a sharp technical interviewer doing a live interview.
Based on what the candidate just said, ask ONE sharp follow-up question.
- Dig deeper into a weakness or interesting point in their answer
- Keep it concise (one sentence)
- Return ONLY the question string, nothing else`,
      },
      {
        role: "user",
        content: `Resume context:\n${resumeText}\n\nConversation so far:\n${historyText}\n\nLatest answer: "${lastAnswer}"\n\nFollow-up question:`,
      },
    ],
    temperature: 0.8,
    max_tokens: 150,
  });

  return chat.choices[0].message.content.trim();
}

/**
 * Generate full feedback report from complete interview transcript.
 */
async function generateFeedbackReport(resumeText, transcript) {
  const transcriptText = transcript
    .map((t, i) => `[${i + 1}] Q: ${t.question}\n    A: ${t.answer}`)
    .join("\n\n");

  const chat = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: `You are an expert interview coach generating a detailed feedback report.
Analyse the full interview and respond ONLY with a valid JSON object (no markdown, no extra text) in this exact shape:
{
  "overallScore": <number 0-100>,
  "summary": "<2-3 sentence overall summary>",
  "categories": {
    "technicalDepth": {
      "score": <number 0-100>,
      "label": "<Excellent|Good|Average|Needs Work>",
      "feedback": "<specific feedback>",
      "highlights": ["<point>", "<point>"]
    },
    "communicationClarity": {
      "score": <number 0-100>,
      "label": "<Excellent|Good|Average|Needs Work>",
      "feedback": "<specific feedback>",
      "highlights": ["<point>", "<point>"]
    },
    "problemSolving": {
      "score": <number 0-100>,
      "label": "<Excellent|Good|Average|Needs Work>",
      "feedback": "<specific feedback>",
      "highlights": ["<point>", "<point>"]
    },
    "experienceRelevance": {
      "score": <number 0-100>,
      "label": "<Excellent|Good|Average|Needs Work>",
      "feedback": "<specific feedback>",
      "highlights": ["<point>", "<point>"]
    }
  },
  "strengths": ["<strength>", "<strength>", "<strength>"],
  "improvements": ["<area>", "<area>", "<area>"],
  "hiringVerdict": "<Strong Yes|Yes|Maybe|No>"
}`,
      },
      {
        role: "user",
        content: `Resume:\n${resumeText}\n\nInterview Transcript:\n${transcriptText}`,
      },
    ],
    temperature: 0.4,
    max_tokens: 1200,
  });

  const raw = chat.choices[0].message.content.trim();
  const cleaned = raw.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned);
}

module.exports = {
  generateIntro,
  generateOpeningQuestions,
  generateFollowUp,
  generateFeedbackReport,
};