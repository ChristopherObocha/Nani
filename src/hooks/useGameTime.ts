import { useEffect, useState } from "react";

// Timestamps, rather than local countdown counters, keep the two windows in step.
export function useGameTime(active: boolean) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 50);
    return () => window.clearInterval(timer);
  }, [active]);
  return active ? now : Date.now();
}
