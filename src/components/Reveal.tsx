"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Reveals children once they scroll into view. Used on the landing page so
 * sections arrive rather than appearing all at once.
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // No reduced-motion branch is needed here: the global
    // `prefers-reduced-motion` rule collapses the transition to ~0ms, and the
    // observer fires immediately for anything already in view, so the reveal
    // simply snaps.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${className ?? ""}`}
      data-visible={visible}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
