import { useState, useEffect, useRef, useCallback } from "react";

/**
 * useTimer
 * @param {number} durationSeconds - total interview time
 * Returns:
 *   timeLeft    → seconds remaining
 *   isRunning   → boolean
 *   progress    → 0-1 (1 = full, 0 = done)
 *   start()     → begins countdown
 *   pause()     → pauses
 *   reset()     → back to full duration
 *   formattedTime → "MM:SS"
 */
export function useTimer(durationSeconds) {
  const [timeLeft,  setTimeLeft]  = useState(durationSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef(null);

  const start = useCallback(() => {
    setIsRunning(true);
  }, []);

  const pause = useCallback(() => {
    setIsRunning(false);
    clearInterval(intervalRef.current);
  }, []);

  const reset = useCallback(() => {
    setIsRunning(false);
    clearInterval(intervalRef.current);
    setTimeLeft(durationSeconds);
  }, [durationSeconds]);

  useEffect(() => {
    if (!isRunning) return;
    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          setIsRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [isRunning]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return {
    timeLeft,
    isRunning,
    progress: timeLeft / durationSeconds,
    formattedTime,
    start,
    pause,
    reset,
    isDone: timeLeft === 0,
  };
}