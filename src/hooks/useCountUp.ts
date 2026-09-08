import { useEffect, useRef, useState } from "react";

export function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0);
  const startedAt = useRef<number | null>(null);
  const from = useRef(0);

  useEffect(() => {
    from.current = value;
    startedAt.current = null;
    let raf = 0;
    const step = (ts: number) => {
      if (startedAt.current === null) startedAt.current = ts;
      const p = Math.min((ts - startedAt.current) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(from.current + (target - from.current) * eased);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration]);

  return value;
}
