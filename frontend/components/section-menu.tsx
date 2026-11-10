"use client";

import Link from 'next/link';
import { useState } from 'react';
import { sections } from '@/lib/sections';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';

export function SectionMenu() {
  const [open, setOpen] = useState(false);
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger className="section-menu-trigger">All sections</DialogTrigger>
    <DialogContent><DialogHeader><DialogTitle>News sections</DialogTitle><DialogDescription>Choose your reading desk.</DialogDescription></DialogHeader>
      <nav className="all-sections" aria-label="All news sections">{sections.map(section => <Link key={section} href={`/?category=${encodeURIComponent(section)}#stories`} onClick={() => setOpen(false)}>{section}</Link>)}</nav>
    </DialogContent></Dialog>;
}
