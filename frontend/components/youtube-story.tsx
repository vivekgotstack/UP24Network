"use client";

import { Play } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function YouTubeStory({ videoId, title }: { videoId: string; title: string }) {
  const reducedMotion = useReducedMotion();
  return <Dialog>
    <DialogTrigger asChild>
      <motion.button className="video-trigger video-trigger-large" aria-label="Play UP24Network on YouTube"
        whileHover={reducedMotion ? undefined : { scale: 1.015 }} whileTap={reducedMotion ? undefined : { scale: 0.985 }}>
        <img src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`} alt="" width={480} height={360} loading="lazy" />
        <span className="video-shade" /><span className="play-mark"><Play size={22} fill="currentColor" aria-hidden="true" /></span>
        <span className="video-label">UP24Network / YouTube</span><span className="video-action">Watch report</span>
      </motion.button>
    </DialogTrigger>
    <DialogContent className="video-dialog gap-0 overflow-hidden border-white/15 bg-[#071c36] p-0 text-white sm:max-w-5xl">
      <DialogHeader className="video-dialog-heading">
        <DialogTitle lang="hi">{title}</DialogTitle>
        <DialogDescription className="text-slate-300">From the UP24Network YouTube channel</DialogDescription>
      </DialogHeader>
      <iframe className="youtube-player" src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`}
        title={title} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin" />
      <a className="youtube-direct-link" href={`https://www.youtube.com/watch?v=${videoId}`} target="_blank" rel="noopener noreferrer">Open on YouTube</a>
    </DialogContent>
  </Dialog>;
}
