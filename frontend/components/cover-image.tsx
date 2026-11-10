"use client";

import Image from "next/image";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

export function CoverImage({ src }: { src: string }) {
  const frame = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: frame, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-5%", "8%"]);
  return <div ref={frame} className="cover-media">
    <motion.div className="cover-media-inner" style={{ y: reduceMotion ? 0 : y }}>
      <Image src={src} alt="" fill sizes="(max-width: 800px) 100vw, 65vw" preload loading="eager" />
    </motion.div>
  </div>;
}
