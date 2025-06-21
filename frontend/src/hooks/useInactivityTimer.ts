import { useState, useEffect, useRef, useCallback } from 'react';

interface InactivityTimerOptions {
  inactivityTimeout?: number;
  countdownDuration?: number;
  onReset?: () => void;
  shouldCount?: boolean;
}

export function useInactivityTimer({
  inactivityTimeout = 60000,
  countdownDuration = 10,
  onReset,
  shouldCount = true
}: InactivityTimerOptions = {}) {
  const [showInactivityModal, setShowInactivityModal] = useState(false);
  const [countdownTimer, setCountdownTimer] = useState(countdownDuration);
  const lastActivityRef = useRef<number>(Date.now());
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  const recordActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  const startCountdown = useCallback(() => {
    setCountdownTimer(countdownDuration);
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
    }
    countdownTimerRef.current = setInterval(() => {
      setCountdownTimer(prev => {
        if (prev <= 1) {
          resetChat();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [countdownDuration]);

  const resetChat = useCallback(() => {
    setShowInactivityModal(false);
    setCountdownTimer(countdownDuration);
    lastActivityRef.current = Date.now();
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
    }
    if (onReset) {
      onReset();
    }
  }, [countdownDuration, onReset]);

  const cancelCountdown = useCallback(() => {
    setShowInactivityModal(false);
    setCountdownTimer(countdownDuration);
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
    }
    lastActivityRef.current = Date.now();
  }, [countdownDuration]);

  useEffect(() => {
    if (!shouldCount) {
      setShowInactivityModal(false);
      if (inactivityTimerRef.current) clearInterval(inactivityTimerRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      return;
    }
    const checkInactivity = () => {
      const currentTime = Date.now();
      const timeSinceLastActivity = currentTime - lastActivityRef.current;
      if (timeSinceLastActivity > inactivityTimeout) {
        setShowInactivityModal(true);
        startCountdown();
      }
    };
    if (inactivityTimerRef.current) clearInterval(inactivityTimerRef.current);
    inactivityTimerRef.current = setInterval(checkInactivity, 5000);
    return () => {
      if (inactivityTimerRef.current) clearInterval(inactivityTimerRef.current);
    };
  }, [inactivityTimeout, startCountdown, shouldCount]);

  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      if (inactivityTimerRef.current) clearInterval(inactivityTimerRef.current);
    };
  }, []);

  return {
    showInactivityModal,
    countdownTimer,
    resetChat,
    recordActivity,
    cancelCountdown
  };
}
