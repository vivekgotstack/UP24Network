"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";

/** Content stays visible without JS. Motion is added only after hydration. */
export function Reveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const container = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const inView = useInView(container, { once: true, amount: 0.08 });
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    setReady(true);
  }, []);
  const visible = !ready || reducedMotion || inView;
  return <motion.div ref={container} className={`reveal ${className}`} initial={false}
    animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : 36, filter: visible ? "blur(0px)" : "blur(8px)" }}
    transition={{ duration: reducedMotion ? 0 : 0.75, ease: [0.22, 1, 0.36, 1] }}
    data-reveal={visible ? "visible" : "waiting"}>{children}</motion.div>;
}
