import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileText, Zap, ChevronRight, CheckCircle, AlertCircle } from "lucide-react";
import { parseResume } from "@/lib/api.js";
import Footer from "@/components/Footer.jsx";

const FEATURES = [
  { icon: "🎙️", title: "Voice Interview",   desc: "Speak naturally — AI listens & responds" },
  { icon: "🧠", title: "Smart Follow-ups",  desc: "Dynamic questions based on your answers" },
  { icon: "📊", title: "Detailed Report",   desc: "Scores across 4 key interview dimensions" },
];

export default function Home() {
  const navigate   = useNavigate();
  const fileRef    = useRef(null);
  const [file,     setFile]    = useState(null);
  const [loading,  setLoading] = useState(false);
  const [error,    setError]   = useState(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = (f) => {
    if (!f || f.type !== "application/pdf") {
      setError("Please upload a PDF file.");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setError("File size must be under 5MB.");
      return;
    }
    setError(null);
    setFile(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleSubmit = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const { resumeText, questions, intro } = await parseResume(file);
      // Store in sessionStorage for next pages
      sessionStorage.setItem("resumeText", resumeText);
      sessionStorage.setItem("questions", JSON.stringify(questions));
      sessionStorage.setItem("intro", intro || "");
      navigate("/setup");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to parse resume. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-900 flex flex-col items-center justify-center px-4 py-16 overflow-hidden relative">
      {/* Background glow blobs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-brand-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-purple-600/8 blur-[100px] rounded-full pointer-events-none" />

      {/* Logo / Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-12"
      >
        <div className="inline-flex items-center gap-2 bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-medium px-3 py-1.5 rounded-full mb-6">
          <Zap size={12} />
          AI-Powered Mock Interviews
        </div>
        <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 tracking-tight">
          Open<span className="gradient-text">Mock</span> AI
        </h1>
        <p className="text-white/50 text-lg max-w-md mx-auto leading-relaxed">
          Upload your resume. Get interviewed by AI. Receive a detailed performance report.
        </p>
      </motion.div>

      {/* Feature pills */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex flex-wrap gap-3 justify-center mb-10"
      >
        {FEATURES.map((f) => (
          <div key={f.title} className="glass rounded-xl px-4 py-2.5 flex items-center gap-2.5">
            <span className="text-lg">{f.icon}</span>
            <div>
              <p className="text-white text-xs font-medium">{f.title}</p>
              <p className="text-white/40 text-xs">{f.desc}</p>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Upload Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="w-full max-w-md"
      >
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => !file && fileRef.current.click()}
          className={`
            glass rounded-2xl p-8 text-center transition-all duration-300 cursor-pointer
            ${dragging ? "border-brand-500/60 bg-brand-500/5 scale-[1.01]" : ""}
            ${file ? "cursor-default" : "hover:border-white/15 hover:bg-surface-600/60"}
          `}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={(e) => handleFile(e.target.files[0])}
          />

          <AnimatePresence mode="wait">
            {file ? (
              <motion.div
                key="file"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-3"
              >
                <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center">
                  <CheckCircle className="text-emerald-400" size={28} />
                </div>
                <div>
                  <p className="text-white font-medium">{file.name}</p>
                  <p className="text-white/40 text-sm mt-0.5">
                    {(file.size / 1024).toFixed(0)} KB · PDF
                  </p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setFile(null); }}
                  className="text-white/30 hover:text-white/60 text-xs transition-colors"
                >
                  Remove file
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center gap-3"
              >
                <div className="w-14 h-14 bg-brand-500/10 border border-brand-500/20 rounded-2xl flex items-center justify-center">
                  {dragging ? (
                    <FileText className="text-brand-400" size={28} />
                  ) : (
                    <Upload className="text-brand-400" size={28} />
                  )}
                </div>
                <div>
                  <p className="text-white font-medium">
                    {dragging ? "Drop it here!" : "Upload your resume"}
                  </p>
                  <p className="text-white/40 text-sm mt-0.5">
                    Drag & drop or click · PDF only · Max 5MB
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 mt-3 text-rose-400 text-sm bg-rose-500/10 border border-rose-500/20 px-4 py-2.5 rounded-xl"
            >
              <AlertCircle size={14} />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* CTA */}
        <motion.button
          onClick={handleSubmit}
          disabled={!file || loading}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="btn-primary w-full mt-4 flex items-center justify-center gap-2 text-base animate-glow-pulse"
        >
          {loading ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              Analysing resume...
            </>
          ) : (
            <>
              Start Interview Setup
              <ChevronRight size={18} />
            </>
          )}
        </motion.button>
      </motion.div>

      <p className="text-white/20 text-xs mt-8">
        Your resume is processed in-memory · Never stored
      </p>
      <div className="mt-4 flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs px-4 py-2.5 rounded-xl max-w-md text-center">
        🎙️ For best experience with AI voice, use <strong className="mx-1">Microsoft Edge</strong> or <strong className="mx-1">Safari</strong>. Chrome may mute AI speech.
      </div>
      <Footer />
    </div>
  );
}