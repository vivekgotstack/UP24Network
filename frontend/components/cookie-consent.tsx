'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Dialog } from 'radix-ui';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { saveConsent, useConsent } from '@/lib/consent';
import styles from './cookie-consent.module.css';

export function CookiePreferences({ children = 'कुकी सेटिंग्स' }: { children?: React.ReactNode }) {
  const { choice } = useConsent();
  const [open, setOpen] = useState(false), [video, setVideo] = useState(false);
  return <Dialog.Root open={open} onOpenChange={(value) => { setOpen(value); if (value) setVideo(choice?.externalVideo ?? false); }}>
    <Dialog.Trigger asChild><button type="button" className={styles.preferences}>{children}</button></Dialog.Trigger>
    <Dialog.Portal><Dialog.Overlay className={styles.overlay} /><Dialog.Content className={styles.dialog} lang="hi">
      <Dialog.Title>आपकी गोपनीयता, आपकी पसंद</Dialog.Title>
      <Dialog.Description>पढ़ने के लिए वैकल्पिक सेवाओं की अनुमति देना ज़रूरी नहीं है। अपनी पसंद कभी भी बदल सकते हैं।</Dialog.Description>
      <div className={styles.option}><div><strong>ज़रूरी सुविधाएँ</strong><p>सुरक्षित लॉगिन, सुरक्षा जाँच और आपकी कुकी पसंद को याद रखने के लिए।</p></div><span>हमेशा चालू</span></div>
      <label className={styles.option}><div><strong>YouTube वीडियो</strong><p>अनुमति मिलने पर YouTube का बाहरी प्लेयर लोड होगा। वह आपके IP पते और डिवाइस की जानकारी प्राप्त कर सकता है।</p></div><input type="checkbox" checked={video} onChange={(event) => setVideo(event.target.checked)} /></label>
      <p>यह साइट अभी विज्ञापन ट्रैकिंग या बाहरी एनालिटिक्स नहीं चलाती। <Link href="/cookies">कुकी नीति</Link> · <Link href="/privacy">गोपनीयता नीति</Link></p>
      <div className={styles.actions}><Button variant="outline" onClick={() => { saveConsent(false); setOpen(false); }}>वैकल्पिक सेवाएँ अस्वीकार करें</Button><Button variant="outline" onClick={() => { saveConsent(video); setOpen(false); }}>मेरी पसंद सहेजें</Button></div>
      <Dialog.Close asChild><button className={styles.close} aria-label="सेटिंग्स बंद करें"><X size={22} /></button></Dialog.Close>
    </Dialog.Content></Dialog.Portal>
  </Dialog.Root>;
}
export function CookieConsent() {
  const { choice, ready } = useConsent();
  if (!ready || choice) return null;
  return <section className={styles.banner} aria-label="कुकी और गोपनीयता विकल्प" lang="hi">
    <div><h2>आपकी गोपनीयता का सम्मान</h2><p>ज़रूरी कुकी सुरक्षित सुविधाएँ चलाती हैं। YouTube जैसे बाहरी वीडियो आपकी अनुमति के बाद ही लोड होते हैं। आप वैकल्पिक सेवाएँ अस्वीकार करके भी खबरें पढ़ सकते हैं। <Link href="/cookies">जानें कैसे</Link></p></div>
    <div className={styles.actions}><Button variant="outline" onClick={() => saveConsent(false)}>वैकल्पिक सेवाएँ अस्वीकार करें</Button><Button variant="outline" onClick={() => saveConsent(true)}>वैकल्पिक सेवाएँ स्वीकार करें</Button><CookiePreferences>पसंद चुनें</CookiePreferences></div>
  </section>;
}
