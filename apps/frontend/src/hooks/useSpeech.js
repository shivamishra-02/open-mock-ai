import { useState, useRef, useCallback, useEffect } from "react";

// Global voice cache
let voicesCache = [];

// Load voices immediately and on change
const loadVoices = () => {
  const v = window.speechSynthesis?.getVoices() || [];
  if (v.length > 0) voicesCache = v;
};

if (typeof window !== "undefined") {
  loadVoices();
  window.speechSynthesis?.addEventListener("voiceschanged", loadVoices);
}

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

  // On mount — trigger voice load via user-gesture-safe method
  useEffect(() => {
    if (!window.speechSynthesis) return;
    // Speak empty string to unlock audio context in Chrome
    const unlock = new SpeechSynthesisUtterance("");
    unlock.volume = 0;
    window.speechSynthesis.speak(unlock);
    window.speechSynthesis.cancel();
    loadVoices();
  }, []);

  const getBestVoice = useCallback(() => {
    // Refresh cache every time in case they loaded late
    const voices = voicesCache.length
      ? voicesCache
      : window.speechSynthesis?.getVoices() || [];

    return (
      voices.find((v) => v.name === "Rishi") ||
      voices.find((v) => v.name === "Samantha") ||
      voices.find((v) => v.name === "Google US English") ||
      voices.find((v) => v.lang === "en-US") ||
      voices.find((v) => v.lang?.startsWith("en")) ||
      voices[0] ||
      null
    );
  }, []);

  const speak = useCallback((text) => {
    return new Promise((resolve) => {
      if (!window.speechSynthesis) { resolve(); return; }

      window.speechSynthesis.cancel();

      setTimeout(() => {
        // Refresh voices one more time before speaking
        loadVoices();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate   = 0.9;
        utterance.pitch  = 1.0;
        utterance.volume = 1.0;
        utterance.lang   = "en-US";

        const voice = getBestVoice();
        if (voice) utterance.voice = voice;

        let resolved = false;
        const done = () => {
          if (resolved) return;
          resolved = true;
          clearTimeout(safetyTimeout);
          setIsSpeaking(false);
          resolve();
        };

        // Safety timeout — 400ms per word + 2s buffer
        const words = text.trim().split(/\s+/).length;
        const safetyMs = Math.max(words * 400 + 2000, 4000);
        const safetyTimeout = setTimeout(() => {
          window.speechSynthesis.cancel();
          done();
        }, safetyMs);

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend   = done;
        utterance.onerror = (e) => {
          if (e.error !== "interrupted") console.warn("[TTS] error:", e.error);
          done();
        };

        window.speechSynthesis.speak(utterance);

        // Chrome HTTPS bug — if not speaking after 1s, retry once
        setTimeout(() => {
          if (!window.speechSynthesis.speaking && !resolved) {
            console.warn("[TTS] Chrome silent fail — retrying");
            window.speechSynthesis.cancel();
            setTimeout(() => {
              const retry = new SpeechSynthesisUtterance(text);
              retry.rate   = 0.9;
              retry.volume = 1.0;
              retry.lang   = "en-US";
              const v = getBestVoice();
              if (v) retry.voice = v;
              retry.onstart = () => setIsSpeaking(true);
              retry.onend   = done;
              retry.onerror = done;
              window.speechSynthesis.speak(retry);
            }, 200);
          }
        }, 1000);
      }, 200);
    });
  }, [getBestVoice]);

  const cancelSpeech = useCallback(() => {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  }, []);

  const startListening = useCallback(() => {
    if (!isSupported) {
      setError("Speech recognition not supported. Please use Chrome.");
      return Promise.reject("unsupported");
    }

    setError(null);
    setTranscript("");
    finalRef.current = "";

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    const recognition          = new SpeechRecognition();
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
      if (e.error !== "aborted") setError(`Mic error: ${e.error}`);
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
    recognitionRef.current?.stop();
  }, []);

  return {
    isListening, isSpeaking, transcript, error, isSupported,
    startListening, stopListening,
    speak, cancelSpeech,
  };
}