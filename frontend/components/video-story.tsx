"use client";

import Image from "next/image";
import { Play } from "lucide-react";
import { useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type VideoStoryProps = { title: string; poster: string; src: string; large?: boolean };

export function VideoStory({ title, poster, src, large = false }: VideoStoryProps) {
  const preview = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const reducedMotion = useReducedMotion();

  function previewVideo() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    preview.current?.play().catch(() => {});
  }

  function stopPreview() {
    preview.current?.pause();
    setPlaying(false);
  }

  return (
    <Dialog open={open} onOpenChange={(value) => { setOpen(value); setFailed(false); stopPreview(); }}>
      <DialogTrigger asChild>
        <motion.button className={`video-trigger ${large ? "video-trigger-large" : ""}`} aria-label={`Play video: ${title}`}
          whileHover={reducedMotion ? undefined : { scale: 1.015 }} whileTap={reducedMotion ? undefined : { scale: 0.985 }}
          onPointerEnter={previewVideo} onPointerLeave={stopPreview} onFocus={previewVideo} onBlur={stopPreview}>
          <Image src={poster} alt="" fill sizes={large ? "(max-width: 800px) 100vw, 65vw" : "(max-width: 600px) 100vw, 33vw"} />
          <video ref={preview} src={src} muted loop playsInline preload="none" aria-hidden="true" tabIndex={-1}
            className="video-hover-preview" data-playing={playing} onPlaying={() => setPlaying(true)} onError={stopPreview} />
          <span className="video-shade" /><span className="play-mark"><Play size={22} fill="currentColor" aria-hidden="true" /></span>
          <span className="video-label">VIDEO</span><span className="video-action">Watch film</span>
        </motion.button>
      </DialogTrigger>
      <DialogContent className="video-dialog gap-0 overflow-hidden border-white/15 bg-[#071c36] p-0 text-white sm:max-w-5xl" onCloseAutoFocus={stopPreview}>
        <DialogHeader className="video-dialog-heading">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="text-slate-300">Sample film · CC0 footage from MDN</DialogDescription>
        </DialogHeader>
        {failed ? <div className="video-unavailable"><Image src={poster} alt="Story photograph" width={1200} height={800} />
          <p>The video is unavailable. You can still view the story photograph.</p></div> :
          <video className="video-player" src={src} controls autoPlay playsInline poster={poster}
            aria-label={title} onError={() => setFailed(true)}>
            <track kind="captions" src="/videos/nature-sample.vtt" srcLang="en" label="English" default />
            Your browser does not support embedded video.
          </video>}
      </DialogContent>
    </Dialog>
  );
}
