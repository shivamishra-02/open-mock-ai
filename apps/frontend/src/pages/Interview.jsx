import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Square, Volume2, CheckCircle, Clock, ChevronRight } from "lucide-react";
import { useSpeech } from "@/hooks/useSpeech.js";
import { useTimer }  from "@/hooks/useTimer.js";
import { getNextQuestion, getFeedbackReport } from "@/lib/api.js";

// ─── Phase machine ────────────────────────────────────────────────────────────
const PHASE = {
  COUNTDOWN:   "countdown",    // 3-2-1 before anything
  INTRO:       "intro",        // AI speaking the welcome intro
  ASKING:      "asking",       // AI speaking the question (TTS)
  IDLE:        "idle",         // Question shown, waiting for user to press "Start Answer"
  RECORDING:   "recording",    // User is speaking their answer
  PROCESSING:  "processing",   // Fetching next question from API
  DONE:        "done",         // Time up or user ended — generating report
};

// Animated waveform bar
const WaveBar = ({ delay, active }) => (
  <div
    className="w-1.5 rounded-full bg-rose-400"
    style={{
      height: "32px",
      animation: active ? `wave 1s ease-in-out ${delay}s infinite` : "none",
      transform: active ? undefined : "scaleY(0.3)",
      transition: "transform 0.2s",
    }}
  />
);

export default function Interview() {
  const navigate = useNavigate();

  // ── Session data ────────────────────────────────────────────────────────────
  const resumeText    = sessionStorage.getItem("resumeText") || "";
  const initQuestions = JSON.parse(sessionStorage.getItem("questions") || "[]");
  const introText     = sessionStorage.getItem("intro") || "Welcome! I've reviewed your resume. Let's get started — please introduce yourself briefly.";
  const duration      = parseInt(sessionStorage.getItem("duration") || "600", 10);

  // ── State ───────────────────────────────────────────────────────────────────
  const [phase,           setPhase]         = useState(PHASE.COUNTDOWN);
  const [countdown,       setCountdown]     = useState(3);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [liveTranscript,  setLiveTranscript] = useState("");
  const [history,         setHistory]        = useState([]);
  const [questionIndex,   setQuestionIndex]  = useState(0);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [currentAnswer,   setCurrentAnswer]  = useState(""); // answer being built

  const speech        = useSpeech();
  const timer         = useTimer(duration);
  const questionQueue = useRef([...initQuestions]);
  const historyRef    = useRef([]);   // always-current copy for async callbacks

  // ── Guard ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!resumeText || initQuestions.length === 0) navigate("/");
  }, []);

  // ── Sync historyRef with history state ──────────────────────────────────────
  useEffect(() => { historyRef.current = history; }, [history]);

  // ── Timer expiry → end interview ────────────────────────────────────────────
  useEffect(() => {
    if (timer.isDone && phase !== PHASE.DONE) {
      speech.cancelSpeech();
      speech.stopListening();
      finishInterview(historyRef.current);
    }
  }, [timer.isDone]);

  // ── 3-2-1 Countdown ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== PHASE.COUNTDOWN) return;
    const t = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(t); beginInterview(); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase]);

  // ─── Core flow ───────────────────────────────────────────────────────────────

  const beginInterview = useCallback(async () => {
    // Warm up voices so first speak() call works immediately
    window.speechSynthesis.getVoices();
    await new Promise(r => setTimeout(r, 300));
    timer.start();
    setPhase(PHASE.INTRO);
    await speech.speak(introText);
    // After intro → first question
    const firstQ = questionQueue.current.shift() || "Tell me about yourself.";
    await askQuestion(firstQ);
  }, [introText]);

  const askQuestion = useCallback(async (question) => {
    // Set state first, then speak — never overlap TTS calls
    setPhase(PHASE.ASKING);
    setCurrentQuestion(question);
    setQuestionIndex((i) => i + 1);
    setCurrentAnswer("");

    // Small pause so React re-renders the question card before TTS starts
    await new Promise(r => setTimeout(r, 100));

    await speech.speak(question);

    // Only move to IDLE after TTS fully completes
    setPhase(PHASE.IDLE);
  }, [speech]);

  // User presses "Start Answer"
  const startRecording = useCallback(async () => {
    setPhase(PHASE.RECORDING);
    setLiveTranscript("");
    setCurrentAnswer("");

    const promise = speech.startListening();

    // Store final answer when STT resolves
    promise.then((finalAnswer) => {
      setCurrentAnswer(finalAnswer);
    });
  }, [speech]);

  // User presses "Stop Recording" — submit answer
  const stopRecording = useCallback(async () => {
    speech.stopListening();
    // Give STT a moment to finalise
    await new Promise((r) => setTimeout(r, 400));

    const answer = currentAnswer || speech.transcript || "(no answer recorded)";
    await submitAnswer(answer);
  }, [currentAnswer, speech]);

  const submitAnswer = useCallback(async (answer) => {
    const newHistory = [...historyRef.current, { question: currentQuestion, answer }];
    setHistory(newHistory);
    historyRef.current = newHistory;
    setLiveTranscript("");

    if (timer.isDone) { finishInterview(newHistory); return; }

    setPhase(PHASE.PROCESSING);

    try {
      const { nextQuestion } = await getNextQuestion({
        resumeText,
        history: newHistory,
        lastAnswer: answer,
      });
      await askQuestion(nextQuestion);
    } catch {
      const fallback = questionQueue.current.shift()
        || "Can you walk me through a challenging project you've worked on?";
      await askQuestion(fallback);
    }
  }, [currentQuestion, resumeText, timer.isDone]);

  const finishInterview = useCallback(async (finalHistory) => {
    setPhase(PHASE.DONE);
    setGeneratingReport(true);
    try {
      const report = await getFeedbackReport({
        resumeText,
        transcript: finalHistory,
      });
      sessionStorage.setItem("report",     JSON.stringify(report));
      sessionStorage.setItem("transcript", JSON.stringify(finalHistory));
    } catch {
      sessionStorage.setItem("report",     JSON.stringify({ error: true, overallScore: 0 }));
      sessionStorage.setItem("transcript", JSON.stringify(finalHistory));
    }
    navigate("/report");
  }, [resumeText]);

  // ── Timer ring ───────────────────────────────────────────────────────────────
  const R    = 20;
  const circ = 2 * Math.PI * R;
  const timerColor = timer.progress > 0.4 ? "#4f6ef7" : timer.progress > 0.2 ? "#f59e0b" : "#f43f5e";

  // ── UI helpers ───────────────────────────────────────────────────────────────
  const phaseLabel = {
    [PHASE.INTRO]:      "Interviewer is speaking…",
    [PHASE.ASKING]:     "Interviewer is asking a question…",
    [PHASE.IDLE]:       "Press 'Start Answer' when you're ready",
    [PHASE.RECORDING]:  "Recording your answer…",
    [PHASE.PROCESSING]: "Getting next question…",
    [PHASE.DONE]:       "Wrapping up…",
  }[phase] || "";

  return (
    <div className="min-h-screen bg-surface-900 flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-brand-500/8 blur-[120px] rounded-full pointer-events-none" />

      {/* ── Countdown overlay ── */}
      <AnimatePresence>
        {phase === PHASE.COUNTDOWN && (
          <motion.div
            key="cd"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-surface-900"
          >
            <motion.p className="text-white/40 mb-4 text-lg">Interview starting in</motion.p>
            <motion.div
              key={countdown}
              initial={{ scale: 1.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.7, opacity: 0 }}
              className="text-9xl font-bold gradient-text"
            >
              {countdown}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Generating report overlay ── */}
      <AnimatePresence>
        {generatingReport && (
          <motion.div
            key="gen"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-surface-900/95 gap-5"
          >
            <div className="w-16 h-16 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
            <div className="text-center">
              <p className="text-white font-semibold text-xl">Generating your report…</p>
              <p className="text-white/40 text-sm mt-1">Analysing performance across all dimensions</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main UI ── */}
      <div className="w-full max-w-2xl flex flex-col gap-5">

        {/* Top bar */}
        <div className="flex items-center justify-between">
          <div className="glass rounded-xl px-4 py-2 text-white/50 text-sm">
            {phase === PHASE.INTRO
              ? <span className="text-brand-400 font-medium">Introduction</span>
              : <>Question <span className="text-white font-medium">#{questionIndex}</span></>
            }
          </div>

          {/* Circular timer */}
          <div className="relative w-14 h-14">
            <svg width="56" height="56" className="-rotate-90" viewBox="0 0 56 56">
              <circle cx="28" cy="28" r={R} fill="none" stroke="#1e1e28" strokeWidth="5"/>
              <circle
                cx="28" cy="28" r={R}
                fill="none" stroke={timerColor} strokeWidth="5"
                strokeDasharray={circ}
                strokeDashoffset={circ * (1 - timer.progress)}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 1s linear, stroke 0.5s" }}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-white text-[10px] font-mono font-semibold">
              {timer.formattedTime}
            </span>
          </div>

          <button
            onClick={() => finishInterview(historyRef.current)}
            className="btn-ghost flex items-center gap-1.5 text-sm text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
          >
            <Square size={14} /> End
          </button>
        </div>

        {/* Question / Intro card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion || "intro"}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="glass rounded-2xl p-7 min-h-[130px] flex items-start gap-4"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5
              ${phase === PHASE.ASKING || phase === PHASE.INTRO
                ? "bg-brand-500/20 border border-brand-500/30 animate-pulse-slow"
                : "bg-brand-500/10 border border-brand-500/20"
              }`}
            >
              <Volume2 className="text-brand-400" size={18} />
            </div>
            <div className="flex-1">
              <p className="text-white/30 text-xs mb-2 font-medium uppercase tracking-wider">
                AI Interviewer
              </p>
              <p className="text-white text-lg leading-relaxed font-medium">
                {phase === PHASE.INTRO
                  ? introText
                  : currentQuestion || "Preparing…"}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Status label */}
        <motion.p
          key={phaseLabel}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-white/40 text-sm h-5"
        >
          {phaseLabel}
        </motion.p>

        {/* Answer recording card */}
        <div className="glass rounded-2xl p-6 flex flex-col items-center gap-5 min-h-[180px] justify-center">

          {/* IDLE — waiting for user to start */}
          {phase === PHASE.IDLE && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-4 w-full"
            >
              <div className="w-14 h-14 rounded-full bg-surface-600/50 border border-white/10 flex items-center justify-center">
                <Mic size={24} className="text-white/30" />
              </div>
              <button
                onClick={startRecording}
                className="btn-primary flex items-center gap-2.5 px-8 py-3.5 text-base"
              >
                <Mic size={18} />
                Start Answer
              </button>
              <p className="text-white/25 text-xs">Click when you're ready to speak</p>
            </motion.div>
          )}

          {/* RECORDING — live waveform + stop button */}
          {phase === PHASE.RECORDING && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-4 w-full"
            >
              {/* Waveform */}
              <div className="flex items-center gap-1 h-10">
                {[0, 0.1, 0.2, 0.15, 0.05, 0.2, 0.1, 0.25, 0.05].map((d, i) => (
                  <WaveBar key={i} delay={d} active={true} />
                ))}
              </div>

              {/* Live transcript */}
              <div className="w-full bg-surface-800/80 rounded-xl px-4 py-3 min-h-[52px] border border-white/[0.04]">
                <p className="text-white/25 text-xs mb-1">Live transcript</p>
                <p className="text-white/60 text-sm leading-relaxed">
                  {speech.transcript || <span className="text-white/20 italic">Listening…</span>}
                </p>
              </div>

              {/* Stop button */}
              <button
                onClick={stopRecording}
                className="flex items-center gap-2.5 bg-rose-500/90 hover:bg-rose-500 text-white font-medium px-8 py-3.5 rounded-xl transition-all duration-200 shadow-lg shadow-rose-500/25 text-base"
              >
                <MicOff size={18} />
                Stop Recording
              </button>
              <p className="text-white/25 text-xs">Click to submit your answer</p>
            </motion.div>
          )}

          {/* PROCESSING — spinner */}
          {phase === PHASE.PROCESSING && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-3"
            >
              <div className="w-10 h-10 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
              <p className="text-white/40 text-sm">Thinking of next question…</p>
            </motion.div>
          )}

          {/* ASKING / INTRO — AI speaking indicator */}
          {(phase === PHASE.ASKING || phase === PHASE.INTRO) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-3"
            >
              <div className="flex items-center gap-1 h-10">
                {[0, 0.15, 0.3, 0.15, 0].map((d, i) => (
                  <div
                    key={i}
                    className="w-1.5 rounded-full bg-brand-400"
                    style={{
                      height: "28px",
                      animation: `wave 1.2s ease-in-out ${d}s infinite`,
                    }}
                  />
                ))}
              </div>
              <p className="text-white/30 text-sm">AI is speaking…</p>
            </motion.div>
          )}
        </div>

        {/* Answered questions trail */}
        {history.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {history.map((_, i) => (
              <div key={i} className="shrink-0 flex items-center gap-1.5 glass rounded-lg px-3 py-1.5">
                <CheckCircle size={12} className="text-emerald-400" />
                <span className="text-white/40 text-xs">Q{i + 1}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Keyframe styles injected inline */}
      <style>{`
        @keyframes wave {
          0%, 100% { transform: scaleY(0.3); }
          50%       { transform: scaleY(1);   }
        }
      `}</style>
    </div>
  );
}