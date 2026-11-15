'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Dialog } from 'radix-ui';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import styles from './pwa-install.module.css';

type InstallPrompt = Event & {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export function PwaInstall() {
  const pathname = usePathname();
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [ios, setIos] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if ('serviceWorker' in navigator && window.isSecureContext)
      void navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).catch(() => undefined);
    if (window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone) return;
    let hidden = false;
    try { hidden = Date.now() - Number(localStorage.getItem('up24:install-dismissed:v1') ?? 0) < 7 * 86400000; } catch { }
    setDismissed(hidden);
    setIos(/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
    const available = (event: Event) => { event.preventDefault(); setPrompt(event as InstallPrompt); };
    const installed = () => { setPrompt(null); setDismissed(true); };
    window.addEventListener('beforeinstallprompt', available);
    window.addEventListener('appinstalled', installed);
    return () => { window.removeEventListener('beforeinstallprompt', available); window.removeEventListener('appinstalled', installed); };
  }, []);
  if (dismissed || (!prompt && !ios) || /^\/(admin|newsroom|account)(\/|$)/.test(pathname)) return null;
  const dismiss = () => {
    setDismissed(true);
    try { localStorage.setItem('up24:install-dismissed:v1', String(Date.now())); } catch { }
  };
  return <aside className={styles.panel} aria-label="Install UP24Network">
    {prompt ? <Button variant="outline" disabled={busy} onClick={async () => {
      setBusy(true);
      try { await prompt.prompt(); if ((await prompt.userChoice).outcome === 'accepted') setDismissed(true); }
      finally { setPrompt(null); setBusy(false); }
    }}><Download aria-hidden="true" size={16} />ऐप इंस्टॉल करें</Button> : <Dialog.Root>
      <Dialog.Trigger asChild><Button variant="outline"><Download size={16} aria-hidden="true" />ऐप इंस्टॉल करें</Button></Dialog.Trigger>
      <Dialog.Portal><Dialog.Overlay className="confirmation-overlay" /><Dialog.Content className="confirmation-dialog">
        <Dialog.Title>UP24Network को होम स्क्रीन पर जोड़ें</Dialog.Title>
        <Dialog.Description>Safari में Share खोलें, फिर “Add to Home Screen” चुनें। ऐप सीधे आपके होम स्क्रीन से खुलेगा।</Dialog.Description>
        <Dialog.Close asChild><Button variant="outline">बंद करें</Button></Dialog.Close>
      </Dialog.Content></Dialog.Portal>
    </Dialog.Root>}
    <Button variant="ghost" size="icon" aria-label="Dismiss app installation" onClick={dismiss}><X size={16} aria-hidden="true" /></Button>
  </aside>;
}
