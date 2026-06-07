import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Square, Volume2, ChevronRight, Clock } from "lucide-react";
import { useSpeech } from "@/hooks/useSpeech.js";
import { useTimer }  from "@/hooks/useTimer.js";
import { getNextQuestion, getFeedbackReport } from "@/lib/api.js";

const PHASES = {
  INTRO:      "intro",       // 3-2-1 countdown before start
  ASKING:     "asking",      // AI is speaking the question (TTS)
  LISTENING:  "listening",   // mic is hot, candidate answers
  PROCESSING: "processing",  // waiting for next question from API
  DONE:       "done",        // interview over, generating report
};

export default function Interview() {
  const navigate = useNavigate();

  // Session data
  const resumeText   = sessionStorage.getItem("resumeText") || "";
  const initQuestions = JSON.parse(sessionStorage.getItem("questions") || "[]");
  const duration     = parseInt(sessionStorage.getItem("duration") || "600", 10);

  const [phase,           setPhase]         = useState(PHASES.INTRO);
  const [countdown,       setCountdown]     = useState(3);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [transcript,      setTranscript]    = useState("");
  const [history,         setHistory]       = useState([]);   // [{question, answer}]
  const [questionIndex,   setQuestionIndex] = useState(0);
  const [statusMsg,       setStatusMsg]     = useState("");
  const [generatingReport, setGeneratingReport] = useState(false);

  const speech = useSpeech();
  const timer  = useTimer(duration);
  const questionQueue = useRef([...initQuestions]);

  // ── Guard: redirect if no session data ──────────────────────────────────
  useEffect(() => {
    if (!resumeText || initQuestions.length === 0) navigate("/");
  }, []);

  // ── 3-2-1 Countdown ─────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== PHASES.INTRO) return;
    const t = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(t);
          startInterview();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase]);

  // ── Timer ran out → end interview ────────────────────────────────────────
  useEffect(() => {
    if (timer.isDone && phase !== PHASES.DONE) endInterview();
  }, [timer.isDone]);

  // ── Core flow ─────────────────────────────────────────────────────────────
  const startInterview = useCallback(async () => {
    timer.start();
    const firstQ = questionQueue.current.shift() || "Tell me about yourself.";
    await askQuestion(firstQ);
  }, []);

  const askQuestion = useCallback(async (question) => {
    setPhase(PHASES.ASKING);
    setCurrentQuestion(question);
    setQuestionIndex((i) => i + 1);
    setTranscript("");

    await speech.speak(question);
    setPhase(PHASES.LISTENING);
    setStatusMsg("Listening… speak your answer");

    const answer = await speech.startListening();
    await handleAnswer(answer, question);
  }, [history, resumeText]);

  const handleAnswer = useCallback(async (answer, question) => {
    const trimmed = answer?.trim() || "(no answer)";
    const newHistory = [...history, { question, answer: trimmed }];
    setHistory(newHistory);

    if (timer.isDone) { endInterview(newHistory); return; }

    setPhase(PHASES.PROCESSING);
    setStatusMsg("Thinking of a follow-up…");

    try {
      const { nextQuestion } = await getNextQuestion({
        resumeText,
        history: newHistory,
        lastAnswer: trimmed,
      });
      await askQuestion(nextQuestion);
    } catch {
      // fallback: use queue or generic question
      const fallback = questionQueue.current.shift() || "Can you walk me through a challenging project you've worked on?";
      await askQuestion(fallback);
    }
  }, [history, resumeText, timer.isDone]);

  const stopAndAnswer = async () => {
    speech.stopListening();
  };

  const endInterview = useCallback(async (finalHistory) => {
    speech.cancelSpeech();
    speech.stopListening();
    timer.pause();
    setPhase(PHASES.DONE);
    setGeneratingReport(true);

    const h = finalHistory || history;

    try {
      const report = await getFeedbackReport({ resumeText, transcript: h });
      sessionStorage.setItem("report",   JSON.stringify(report));
      sessionStorage.setItem("transcript", JSON.stringify(h));
      navigate("/report");
    } catch (err) {
      // Store what we have and navigate anyway
      sessionStorage.setItem("report", JSON.stringify({ error: "Failed to generate report", overallScore: 0 }));
      sessionStorage.setItem("transcript", JSON.stringify(h));
      navigate("/report");
    }
  }, [history, resumeText]);

  // ── Waveform bars (visual mic indicator) ─────────────────────────────────
  const WaveBar = ({ delay }) => (
    <div
      className="w-1 bg-brand-400 rounded-full animate-wave"
      style={{
        height: "28px",
        animationDelay: `${delay}s`,
        animationPlayState: speech.isListening ? "running" : "paused",
      }}
    />
  );

  // ── Timer ring ─────────────────────────────────────────────────────────
  const r = 44;
  const circumference = 2 * Math.PI * r;
  const strokeDash = circumference * timer.progress;
  const timerColor = timer.progress > 0.4 ? "#4f6ef7" : timer.progress > 0.2 ? "#f59e0b" : "#f43f5e";

  return (
    <div className="min-h-screen bg-surface-900 flex flex-col items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-brand-500/8 blur-[120px] rounded-full pointer-events-none" />

      {/* ── Countdown intro ── */}
      <AnimatePresence>
        {phase === PHASES.INTRO && (
          <motion.div
            key="countdown"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-surface-900/95 z-50"
          >
            <motion.div
              key={countdown}
              initial={{ scale: 1.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="text-8xl font-bold gradient-text"
            >
              {countdown}
            </motion.div>
            <p className="text-white/40 mt-4 text-lg">Get ready…</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Report generation overlay ── */}
      <AnimatePresence>
        {generatingReport && (
          <motion.div
            key="generating"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-surface-900/95 z-50 gap-5"
          >
            <div className="w-16 h-16 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
            <div className="text-center">
              <p className="text-white font-semibold text-xl">Generating your report…</p>
              <p className="text-white/40 text-sm mt-1">Analysing your performance across all dimensions</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main interview UI ── */}
      <div className="w-full max-w-2xl flex flex-col gap-6">

        {/* Top bar: question count + timer */}
        <div className="flex items-center justify-between">
          <div className="glass rounded-xl px-4 py-2 text-white/50 text-sm">
            Question <span className="text-white font-medium">#{questionIndex || "–"}</span>
          </div>

          {/* Circular timer */}
          <div className="relative">
            <svg width="56" height="56" className="-rotate-90">
              <circle cx="28" cy="28" r={r - 6} fill="none" stroke="#1e1e28" strokeWidth="4"/>
              <circle
                cx="28" cy="28" r={r - 6}
                fill="none"
                stroke={timerColor}
                strokeWidth="4"
                strokeDasharray={`${circumference * 0.8} ${circumference}`}
                strokeDashoffset={circumference * 0.8 - strokeDash * 0.8}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 1s linear, stroke 0.5s" }}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-mono font-medium">
              {timer.formattedTime}
            </span>
          </div>

          <button onClick={() => endInterview()} className="btn-ghost flex items-center gap-1.5 text-sm text-rose-400 hover:text-rose-300 hover:bg-rose-500/10">
            <Square size={14} /> End
          </button>
        </div>

        {/* Question display card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="glass rounded-2xl p-7 min-h-[120px] flex items-center"
          >
            <div className="flex gap-4 items-start w-full">
              <div className="w-9 h-9 rounded-xl bg-brand-500/15 border border-brand-500/25 flex items-center justify-center shrink-0 mt-0.5">
                <Volume2 className="text-brand-400" size={16} />
              </div>
              <div className="flex-1">
                {phase === PHASES.ASKING && (
                  <p className="text-white/30 text-xs mb-1.5 font-medium">AI Interviewer</p>
                )}
                <p className="text-white text-lg leading-relaxed font-medium">
                  {currentQuestion || (phase === PHASES.INTRO ? "Preparing your first question…" : "Thinking…")}
                </p>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Answer / Mic UI */}
        <div className="glass rounded-2xl p-6 flex flex-col items-center gap-5">

          {/* Status */}
          <p className="text-white/40 text-sm text-center h-5">
            {phase === PHASES.LISTENING   && statusMsg}
            {phase === PHASES.ASKING      && "AI is asking the question…"}
            {phase === PHASES.PROCESSING  && statusMsg}
          </p>

          {/* Waveform / Mic button */}
          <div className="flex flex-col items-center gap-4">
            {phase === PHASES.LISTENING ? (
              <>
                {/* Animated waveform */}
                <div className="flex items-center gap-1 h-12">
                  {[0, 0.1, 0.2, 0.3, 0.4, 0.3, 0.2, 0.1, 0].map((d, i) => (
                    <WaveBar key={i} delay={d} />
                  ))}
                </div>
                <button
                  onClick={stopAndAnswer}
                  className="w-16 h-16 rounded-full bg-rose-500/90 hover:bg-rose-500 flex items-center justify-center transition-all duration-200 shadow-lg shadow-rose-500/30 animate-glow-pulse"
                >
                  <MicOff size={24} className="text-white" />
                </button>
                <p className="text-white/30 text-xs">Tap to stop recording</p>
              </>
            ) : (
              <div className="w-16 h-16 rounded-full bg-surface-600/60 border border-white/5 flex items-center justify-center">
                <Mic size={24} className="text-white/20" />
              </div>
            )}
          </div>

          {/* Live transcript */}
          <AnimatePresence>
            {speech.transcript && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="w-full bg-surface-800/80 rounded-xl px-4 py-3 text-white/60 text-sm leading-relaxed border border-white/[0.04]"
              >
                <span className="text-white/25 text-xs mr-2">You:</span>
                {speech.transcript}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* History pills */}
        {history.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {history.map((h, i) => (
              <div key={i} className="shrink-0 glass rounded-lg px-3 py-1.5 text-white/30 text-xs whitespace-nowrap">
                Q{i + 1} ✓
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}