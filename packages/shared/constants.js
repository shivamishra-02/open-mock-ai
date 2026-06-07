// Interview duration options (in seconds)
export const DURATION_OPTIONS = [
  { label: "5 mins",  value: 5  * 60, description: "Quick warmup" },
  { label: "10 mins", value: 10 * 60, description: "Standard round" },
  { label: "20 mins", value: 20 * 60, description: "Full simulation" },
];

// Score → label mapping
export const scoreLabel = (score) => {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 50) return "Average";
  return "Needs Work";
};

// Score → color class mapping (for UI)
export const scoreColor = (score) => {
  if (score >= 85) return "text-emerald-400";
  if (score >= 70) return "text-blue-400";
  if (score >= 50) return "text-amber-400";
  return "text-rose-400";
};

export const FEEDBACK_CATEGORIES = [
  { key: "technicalDepth",      label: "Technical Depth",      icon: "⚡" },
  { key: "communicationClarity", label: "Communication",        icon: "💬" },
  { key: "problemSolving",      label: "Problem Solving",       icon: "🧠" },
  { key: "experienceRelevance", label: "Experience Relevance",  icon: "📌" },
];