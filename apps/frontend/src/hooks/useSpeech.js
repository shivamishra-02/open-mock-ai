import { useState, useRef, useCallback } from "react";

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

  const speak = useCallback((text) => {
    return new Promise((resolve) => {
      if (!window.speechSynthesis) { resolve(); return; }

      window.speechSynthesis.cancel();

      setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate   = 0.9;
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
          clearTimeout(timeout);
          setIsSpeaking(false);
          resolve();
        };

        // Fallback timeout — estimate ~100ms per word, min 3s, max 25s
        const wordCount = text.split(" ").length;
        const ms = Math.min(Math.max(wordCount * 100 + 1000, 3000), 25000);
        const timeout = setTimeout(() => {
          window.speechSynthesis.cancel();
          done();
        }, ms);

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend   = done;
        utterance.onerror = done; // never block on error

        window.speechSynthesis.speak(utterance);
      }, 150);
    });
  }, []);

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