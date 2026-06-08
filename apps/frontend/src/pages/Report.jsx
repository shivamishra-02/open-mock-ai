import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { RotateCcw, Download, TrendingUp, CheckCircle, XCircle, Zap } from "lucide-react";
import Footer from "@/components/Footer.jsx";

const CATEGORY_META = {
  technicalDepth:       { label: "Technical Depth",     icon: "⚡", color: "blue" },
  communicationClarity: { label: "Communication",        icon: "💬", color: "purple" },
  problemSolving:       { label: "Problem Solving",      icon: "🧠", color: "emerald" },
  experienceRelevance:  { label: "Experience Relevance", icon: "📌", color: "amber" },
};

const COLOR_MAP = {
  blue:    { bar: "bg-blue-500",    text: "text-blue-400",    bg: "bg-blue-500/10",    border: "border-blue-500/20" },
  purple:  { bar: "bg-purple-500",  text: "text-purple-400",  bg: "bg-purple-500/10",  border: "border-purple-500/20" },
  emerald: { bar: "bg-emerald-500", text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  amber:   { bar: "bg-amber-500",   text: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/20" },
};

const VERDICT_META = {
  "Strong Yes": { color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30", emoji: "🎉" },
  "Yes":        { color: "text-blue-400",    bg: "bg-blue-500/10 border-blue-500/30",       emoji: "✅" },
  "Maybe":      { color: "text-amber-400",   bg: "bg-amber-500/10 border-amber-500/30",     emoji: "🤔" },
  "No":         { color: "text-rose-400",    bg: "bg-rose-500/10 border-rose-500/30",       emoji: "📚" },
};

function ScoreRing({ score, size = 120 }) {
  const r = size / 2 - 10;
  const circ = 2 * Math.PI * r;
  const color = score >= 85 ? "#10b981" : score >= 70 ? "#4f6ef7" : score >= 50 ? "#f59e0b" : "#f43f5e";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e1e28" strokeWidth="8"/>
        <motion.circle
          cx={size/2} cy={size/2} r={r}
          fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - (circ * score) / 100 }}
          transition={{ duration: 1.4, ease: "easeOut" }}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-white font-bold"
          style={{ fontSize: size * 0.22 }}
        >
          {score}
        </motion.span>
        <span className="text-white/30 text-xs">/100</span>
      </div>
    </div>
  );
}

function CategoryCard({ catKey, data, index }) {
  const meta   = CATEGORY_META[catKey];
  const colors = COLOR_MAP[meta.color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 * index }}
      className={`glass rounded-2xl p-5 border ${colors.border}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className={`text-xl w-9 h-9 rounded-xl ${colors.bg} flex items-center justify-center`}>
            {meta.icon}
          </div>
          <div>
            <p className="text-white font-medium text-sm">{meta.label}</p>
            <p className={`text-xs font-medium ${colors.text}`}>{data.label}</p>
          </div>
        </div>
        <span className={`text-2xl font-bold ${colors.text}`}>{data.score}</span>
      </div>

      {/* Score bar */}
      <div className="h-1.5 bg-surface-600 rounded-full mb-4 overflow-hidden">
        <motion.div
          className={`h-full ${colors.bar} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: `${data.score}%` }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.2 * index }}
        />
      </div>

      <p className="text-white/50 text-xs leading-relaxed mb-3">{data.feedback}</p>

      {data.highlights?.length > 0 && (
        <ul className="space-y-1.5">
          {data.highlights.map((h, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-white/40">
              <span className={`${colors.text} mt-0.5`}>→</span>
              {h}
            </li>
          ))}
        </ul>
      )}
    </motion.div>
  );
}

export default function Report() {
  const navigate  = useNavigate();
  const [report,  setReport]  = useState(null);
  const [transcript, setTranscript] = useState([]);
  const [showTranscript, setShowTranscript] = useState(false);

  useEffect(() => {
    const r = sessionStorage.getItem("report");
    const t = sessionStorage.getItem("transcript");
    if (!r) { navigate("/"); return; }
    setReport(JSON.parse(r));
    setTranscript(JSON.parse(t || "[]"));
  }, []);

  if (!report) return null;

  const verdict = VERDICT_META[report.hiringVerdict] || VERDICT_META["Maybe"];

  return (
    <div className="min-h-screen bg-surface-900 px-4 py-12 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] bg-brand-500/8 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-medium px-3 py-1.5 rounded-full mb-5">
            <Zap size={12} /> Interview Complete
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Your Performance Report</h1>
          <p className="text-white/40">Here's how you did across all interview dimensions</p>
        </motion.div>

        {/* Overall score + verdict */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-2xl p-8 mb-6 flex flex-col md:flex-row items-center gap-8"
        >
          <ScoreRing score={report.overallScore || 0} size={140} />
          <div className="flex-1 text-center md:text-left">
            <p className="text-white/40 text-sm mb-2">Overall Score</p>
            <h2 className="text-white text-2xl font-bold mb-3">{report.summary}</h2>
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium ${verdict.bg} ${verdict.color}`}>
              {verdict.emoji} Hiring Verdict: {report.hiringVerdict}
            </div>
          </div>
        </motion.div>

        {/* Category cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {Object.entries(report.categories || {}).map(([key, data], i) => (
            <CategoryCard key={key} catKey={key} data={data} index={i} />
          ))}
        </div>

        {/* Strengths & Improvements */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="glass rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="text-emerald-400" size={18} />
              <h3 className="text-white font-semibold">Strengths</h3>
            </div>
            <ul className="space-y-2.5">
              {(report.strengths || []).map((s, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-white/60">
                  <span className="text-emerald-400 text-xs mt-1">✓</span>
                  {s}
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="glass rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="text-amber-400" size={18} />
              <h3 className="text-white font-semibold">Areas to Improve</h3>
            </div>
            <ul className="space-y-2.5">
              {(report.improvements || []).map((s, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-white/60">
                  <span className="text-amber-400 text-xs mt-1">→</span>
                  {s}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        {/* Transcript toggle */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="glass rounded-2xl overflow-hidden mb-8">
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className="w-full flex items-center justify-between p-5 hover:bg-white/[0.02] transition-colors"
          >
            <span className="text-white font-medium">View Full Transcript</span>
            <span className="text-white/30 text-sm">{showTranscript ? "Hide" : `${transcript.length} exchanges`}</span>
          </button>
          {showTranscript && (
            <div className="px-5 pb-5 space-y-4 border-t border-white/[0.05]">
              {transcript.map((t, i) => (
                <div key={i} className="pt-4">
                  <p className="text-brand-400 text-xs font-medium mb-1.5">Q{i+1}: {t.question}</p>
                  <p className="text-white/50 text-sm leading-relaxed pl-3 border-l border-white/10">{t.answer}</p>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Actions */}
        <div className="flex gap-3">
          <motion.button
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
            onClick={() => {
              sessionStorage.clear();
              navigate("/");
            }}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            <RotateCcw size={16} />
            New Interview
          </motion.button>
        </div>
        <Footer />
      </div>
    </div>
  );
}