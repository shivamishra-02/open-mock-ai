import { useState, useRef, useCallback } from "react";

/**
 * useSpeech
 * Provides:
 *   - startListening()  → starts microphone STT
 *   - stopListening()   → stops mic, resolves with final transcript
 *   - speak(text)       → TTS using browser SpeechSynthesis
 *   - isListening       → boolean
 *   - isSpeaking        → boolean
 *   - transcript        → live partial transcript
 *   - error             → string | null
 */
export function useSpeech() {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking,  setIsSpeaking]  = useState(false);
  const [transcript,  setTranscript]  = useState("");
  const [error,       setError]       = useState(null);

  const recognitionRef = useRef(null);
  const resolveRef     = useRef(null);
  const finalRef       = useRef("");

  const isSupported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const startListening = useCallback(() => {
    if (!isSupported) {
      setError("Speech recognition not supported in this browser. Use Chrome.");
      return Promise.reject("unsupported");
    }

    setError(null);
    setTranscript("");
    finalRef.current = "";

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    const recognition = new SpeechRecognition();
    recognition.continuous     = true;
    recognition.interimResults = true;
    recognition.lang           = "en-US";
    recognitionRef.current     = recognition;

    recognition.onresult = (e) => {
      let interim = "";
      let final   = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t;
        else interim += t;
      }
      if (final) finalRef.current += " " + final;
      setTranscript((finalRef.current + " " + interim).trim());
    };

    recognition.onerror = (e) => {
      setError(`Microphone error: ${e.error}`);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (resolveRef.current) {
        resolveRef.current(finalRef.current.trim());
        resolveRef.current = null;
      }
    };

    recognition.start();
    setIsListening(true);

    return new Promise((resolve) => {
      resolveRef.current = resolve;
    });
  }, [isSupported]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  const speak = useCallback((text) => {
    return new Promise((resolve) => {
      if (!window.speechSynthesis) { resolve(); return; }

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance   = new SpeechSynthesisUtterance(text);
      utterance.rate    = 0.95;
      utterance.pitch   = 1;
      utterance.volume  = 1;

      // Prefer a natural English voice
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(
        (v) => v.lang === "en-US" && v.name.toLowerCase().includes("natural")
      ) || voices.find((v) => v.lang === "en-US") || voices[0];
      if (preferred) utterance.voice = preferred;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend   = () => { setIsSpeaking(false); resolve(); };
      utterance.onerror = () => { setIsSpeaking(false); resolve(); };

      window.speechSynthesis.speak(utterance);
    });
  }, []);

  const cancelSpeech = useCallback(() => {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  }, []);

  return {
    isListening, isSpeaking, transcript, error,
    isSupported,
    startListening, stopListening,
    speak, cancelSpeech,
  };
}