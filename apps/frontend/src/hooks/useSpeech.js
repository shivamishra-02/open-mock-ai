import { useState, useRef, useCallback } from "react";

export function useSpeech() {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking,  setIsSpeaking]  = useState(false);
  const [transcript,  setTranscript]  = useState("");
  const [error,       setError]       = useState(null);

  const recognitionRef = useRef(null);
  const resolveRef     = useRef(null);
  const finalRef       = useRef("");
  const speakingRef    = useRef(false); // tracks if TTS is currently active

  const isSupported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const speak = useCallback((text) => {
    return new Promise((resolve) => {
      if (!window.speechSynthesis) { resolve(); return; }

      // If already speaking, cancel and wait for it to fully stop
      if (speakingRef.current) {
        window.speechSynthesis.cancel();
        speakingRef.current = false;
      }

      // Wait for cancel to fully settle before starting new utterance
      const startSpeaking = () => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate   = 0.88;  // slightly slower = clearer
        utterance.pitch  = 1.0;
        utterance.volume = 1.0;
        utterance.lang   = "en-US";

        // Pick Rishi, fallback to any English voice
        const voices = window.speechSynthesis.getVoices();
        const voice  = voices.find((v) => v.name === "Rishi")
                    || voices.find((v) => v.lang?.startsWith("en-"))
                    || voices[0];
        if (voice) utterance.voice = voice;

        let resolved = false;
        const done = () => {
          if (resolved) return;
          resolved = true;
          speakingRef.current = false;
          clearTimeout(safetyTimeout);
          setIsSpeaking(false);
          resolve();
        };

        // Safety timeout based on word count — never get stuck
        const words = text.trim().split(/\s+/).length;
        const safetyMs = Math.max(words * 400 + 2000, 4000); // 400ms/word + 2s buffer
        const safetyTimeout = setTimeout(() => {
          window.speechSynthesis.cancel();
          done();
        }, safetyMs);

        utterance.onstart = () => {
          speakingRef.current = true;
          setIsSpeaking(true);
        };
        utterance.onend   = done;
        utterance.onerror = (e) => {
          // "interrupted" means we cancelled it ourselves — not an error
          if (e.error !== "interrupted") console.warn("[TTS] error:", e.error);
          done();
        };

        window.speechSynthesis.speak(utterance);
      };

      // Give browser 200ms to fully process the cancel before new speak
      setTimeout(startSpeaking, 200);
    });
  }, []);

  const cancelSpeech = useCallback(() => {
    window.speechSynthesis?.cancel();
    speakingRef.current = false;
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