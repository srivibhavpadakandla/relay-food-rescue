import { useInView, useMotionValue, useSpring } from 'motion/react';
import { useCallback, useEffect, useRef } from 'react';

interface CountUpProps {
  to: number;
  from?: number;
  direction?: 'up' | 'down';
  delay?: number;
  duration?: number;
  className?: string;
  startWhen?: boolean;
  separator?: string;
  onStart?: () => void;
  onEnd?: () => void;
}

export default function CountUp({
  to,
  from = 0,
  direction = 'up',
  delay = 0,
  duration = 2,
  className = '',
  startWhen = true,
  separator = '',
  onStart,
  onEnd
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const settled = useRef(false);
  const motionValue = useMotionValue(direction === 'down' ? to : from);

  const damping = 20 + 40 * (1 / duration);
  const stiffness = 100 * (1 / duration);

  // LOCAL PATCH (deviates from the React Bits registry version).
  // A spring approaches its target asymptotically and stops once it is "at
  // rest", so with large targets it settles a unit or two short — 1,240 would
  // render as 1,238. Relay's whole claim is that these figures are real, so
  // tighten the rest threshold and snap to the exact target on completion.
  const springValue = useSpring(motionValue, {
    damping,
    stiffness,
    restDelta: 0.0001,
    restSpeed: 0.0001
  });

  const isInView = useInView(ref, { once: true, margin: '0px' });

  const getDecimalPlaces = (num: number): number => {
    const str = num.toString();
    if (str.includes('.')) {
      const decimals = str.split('.')[1];
      if (parseInt(decimals) !== 0) {
        return decimals.length;
      }
    }
    return 0;
  };

  const maxDecimals = Math.max(getDecimalPlaces(from), getDecimalPlaces(to));

  const formatValue = useCallback(
    (latest: number) => {
      const hasDecimals = maxDecimals > 0;

      const options: Intl.NumberFormatOptions = {
        useGrouping: !!separator,
        minimumFractionDigits: hasDecimals ? maxDecimals : 0,
        maximumFractionDigits: hasDecimals ? maxDecimals : 0
      };

      const formattedNumber = Intl.NumberFormat('en-US', options).format(latest);

      return separator ? formattedNumber.replace(/,/g, separator) : formattedNumber;
    },
    [maxDecimals, separator]
  );

  useEffect(() => {
    if (ref.current) {
      ref.current.textContent = formatValue(direction === 'down' ? to : from);
    }
  }, [from, to, direction, formatValue]);

  useEffect(() => {
    if (isInView && startWhen) {
      settled.current = false;
      if (typeof onStart === 'function') {
        onStart();
      }

      const timeoutId = setTimeout(() => {
        motionValue.set(direction === 'down' ? from : to);
      }, delay * 1000);

      const durationTimeoutId = setTimeout(
        () => {
          // The spring is still creeping toward the target here; pin the exact
          // value and stop taking further updates from it.
          settled.current = true;
          if (ref.current) {
            ref.current.textContent = formatValue(direction === 'down' ? from : to);
          }
          if (typeof onEnd === 'function') {
            onEnd();
          }
        },
        delay * 1000 + duration * 1000
      );

      return () => {
        clearTimeout(timeoutId);
        clearTimeout(durationTimeoutId);
      };
    }
  }, [isInView, startWhen, motionValue, direction, from, to, delay, onStart, onEnd, duration, formatValue]);

  useEffect(() => {
    const unsubscribe = springValue.on('change', (latest: number) => {
      if (settled.current) return;
      if (ref.current) {
        ref.current.textContent = formatValue(latest);
      }
    });

    // Guarantee the final frame is the exact target, not the spring's resting
    // approximation of it.
    const settle = springValue.on('animationComplete', () => {
      if (ref.current) {
        ref.current.textContent = formatValue(direction === 'down' ? from : to);
      }
    });

    return () => {
      unsubscribe();
      settle();
    };
  }, [springValue, formatValue, direction, from, to]);

  return <span className={className} ref={ref} />;
}
