import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Clock, ArrowLeft, ChevronRight, Zap, Target, Trophy } from "lucide-react";
import Footer from "@/components/Footer.jsx";

const DURATIONS = [
  {
    label: "5 mins",
    value: 5 * 60,
    icon: Zap,
    subtitle: "Quick Warmup",
    desc: "Perfect for practicing specific topics. ~3–4 questions.",
    color: "from-amber-500/20 to-amber-600/5 border-amber-500/20",
    iconColor: "text-amber-400",
    glow: "shadow-amber-500/20",
  },
  {
    label: "10 mins",
    value: 10 * 60,
    icon: Target,
    subtitle: "Standard Round",
    desc: "Simulates a typical first-round interview. ~6–8 questions.",
    color: "from-brand-500/20 to-brand-600/5 border-brand-500/30",
    iconColor: "text-brand-400",
    glow: "shadow-brand-500/20",
    popular: true,
  },
  {
    label: "20 mins",
    value: 20 * 60,
    icon: Trophy,
    subtitle: "Full Simulation",
    desc: "Complete interview simulation. Deep technical dive. ~15+ questions.",
    color: "from-purple-500/20 to-purple-600/5 border-purple-500/20",
    iconColor: "text-purple-400",
    glow: "shadow-purple-500/20",
  },
];

export default function Setup() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(10 * 60);

  const resumeText = sessionStorage.getItem("resumeText");
  const questions  = JSON.parse(sessionStorage.getItem("questions") || "[]");

  if (!resumeText) {
    navigate("/");
    return null;
  }

  const handleStart = () => {
    // Unlock Chrome audio context on user gesture
    if (window.speechSynthesis) {
      const unlock = new SpeechSynthesisUtterance("");
      unlock.volume = 0;
      window.speechSynthesis.speak(unlock);
      setTimeout(() => window.speechSynthesis.cancel(), 100);
    }
    sessionStorage.setItem("duration", selected);
    navigate("/interview");
  };

  return (
    <div className="min-h-screen bg-surface-900 flex flex-col items-center justify-center px-4 py-16 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-brand-500/8 blur-[100px] rounded-full pointer-events-none" />

      {/* Back */}
      <button
        onClick={() => navigate("/")}
        className="absolute top-6 left-6 btn-ghost flex items-center gap-1.5 text-sm"
      >
        <ArrowLeft size={16} /> Back
      </button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl"
      >
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium px-3 py-1.5 rounded-full mb-5">
            ✓ Resume analysed · {questions.length} questions ready
          </div>
          <h2 className="text-4xl font-bold text-white mb-3">
            Choose interview <span className="gradient-text">duration</span>
          </h2>
          <p className="text-white/40">
            Pick how long you want your mock interview to run
          </p>
        </div>

        {/* Duration Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {DURATIONS.map((opt, i) => {
            const Icon      = opt.icon;
            const isActive  = selected === opt.value;
            return (
              <motion.button
                key={opt.value}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                onClick={() => setSelected(opt.value)}
                className={`
                  relative text-left p-5 rounded-2xl border bg-gradient-to-br transition-all duration-200
                  ${opt.color}
                  ${isActive ? `shadow-lg ${opt.glow} scale-[1.02]` : "opacity-70 hover:opacity-90 hover:scale-[1.01]"}
                `}
              >
                {opt.popular && (
                  <span className="absolute -top-2.5 right-4 bg-brand-500 text-white text-[10px] font-semibold px-2.5 py-0.5 rounded-full">
                    POPULAR
                  </span>
                )}
                <div className={`w-10 h-10 rounded-xl bg-surface-700/60 flex items-center justify-center mb-4 ${opt.iconColor}`}>
                  <Icon size={20} />
                </div>
                <p className="text-white text-2xl font-bold mb-0.5">{opt.label}</p>
                <p className={`text-sm font-medium mb-2 ${opt.iconColor}`}>{opt.subtitle}</p>
                <p className="text-white/40 text-xs leading-relaxed">{opt.desc}</p>

                {isActive && (
                  <div className="absolute top-4 right-4 w-5 h-5 bg-white rounded-full flex items-center justify-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-surface-900" />
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Info box */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="glass rounded-xl p-4 mb-6 flex items-start gap-3"
        >
          <Clock className="text-brand-400 mt-0.5 shrink-0" size={16} />
          <p className="text-white/50 text-sm leading-relaxed">
            The interview will end automatically when time is up. You can also end it early.
            AI will ask follow-up questions based on your live answers — so stay sharp!
          </p>
        </motion.div>

        {/* Start button */}
        <motion.button
          onClick={handleStart}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="btn-primary w-full flex items-center justify-center gap-2 text-base py-4"
        >
          Start Mock Interview
          <ChevronRight size={18} />
        </motion.button>
      </motion.div>
      <Footer />
    </div>
  );
}