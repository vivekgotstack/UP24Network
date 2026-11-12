'use client';

import { motion, useReducedMotion, useScroll, useSpring } from 'framer-motion';

export function ReadingProgress() {
  const { scrollYProgress } = useScroll();
  const smooth = useSpring(scrollYProgress, { stiffness: 160, damping: 28 });
  const reduced = useReducedMotion();
  return (
    <motion.div
      className="reading-progress"
      aria-hidden="true"
      style={{ scaleX: reduced ? scrollYProgress : smooth }}
    />
  );
}
