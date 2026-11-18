'use client';

import { createContext, useContext, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Dialog } from 'radix-ui';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { saveConsent, useConsent } from '@/lib/consent';
import styles from './cookie-consent.module.css';

const OpenCookiePreferences = createContext<(trigger: HTMLButtonElement) => void>(() => {});

export function CookiePreferences({ children = 'कुकी सेटिंग्स' }: { children?: ReactNode }) {
  const open = useContext(OpenCookiePreferences);
  return (
    <button
      type="button"
      className={styles.preferences}
      aria-haspopup="dialog"
      onClick={(event) => open(event.currentTarget)}
    >
      {children}
    </button>
  );
}

export function CookiePreferencesProvider({ children }: { children: ReactNode }) {
  const { choice } = useConsent();
  const [open, setOpen] = useState(false),
    [video, setVideo] = useState(false);
  const returnFocus = useRef<HTMLButtonElement>(null);
  function show(trigger: HTMLButtonElement) {
    returnFocus.current = trigger;
    setVideo(choice?.externalVideo ?? false);
    setOpen(true);
  }
  function save(externalVideo: boolean) {
    setOpen(false);
    saveConsent(externalVideo);
  }
  return (
    <OpenCookiePreferences.Provider value={show}>
      {children}
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className={styles.overlay} />
          <Dialog.Content
            className={styles.dialog}
            lang="hi"
            onCloseAutoFocus={(event) => {
              if (returnFocus.current?.isConnected) {
                event.preventDefault();
                returnFocus.current.focus({ preventScroll: true });
              }
            }}
          >
            <Dialog.Title>आपकी गोपनीयता, आपकी पसंद</Dialog.Title>
            <Dialog.Description>
              पढ़ने के लिए वैकल्पिक सेवाओं की अनुमति देना ज़रूरी नहीं है। अपनी पसंद कभी भी बदल सकते हैं।
            </Dialog.Description>
            <div className={styles.option}>
              <div>
                <strong>ज़रूरी सुविधाएँ</strong>
                <p>सुरक्षित लॉगिन, सुरक्षा जाँच और आपकी कुकी पसंद को याद रखने के लिए।</p>
              </div>
              <span>हमेशा चालू</span>
            </div>
            <label className={styles.option}>
              <span>
                <strong>बाहरी वीडियो</strong>
                <span className={styles.explanation}>
                  अनुमति देकर वीडियो चलाने पर YouTube या Instagram का प्लेयर लोड होगा। उस सेवा को आपका IP
                  पता और डिवाइस की जानकारी मिल सकती है।
                </span>
              </span>
              <input
                aria-label="YouTube और Instagram के वीडियो की अनुमति"
                type="checkbox"
                checked={video}
                onChange={(event) => setVideo(event.target.checked)}
              />
            </label>
            <p>
              यह साइट अभी विज्ञापन ट्रैकिंग या बाहरी एनालिटिक्स नहीं चलाती।{' '}
              <Link href="/cookies" onClick={() => setOpen(false)}>
                कुकी नीति
              </Link>{' '}
              ·{' '}
              <Link href="/privacy" onClick={() => setOpen(false)}>
                गोपनीयता नीति
              </Link>
            </p>
            <div className={styles.actions}>
              <Button variant="outline" onClick={() => save(false)}>
                वैकल्पिक सेवाएँ अस्वीकार करें
              </Button>
              <Button variant="outline" onClick={() => save(video)}>
                मेरी पसंद सहेजें
              </Button>
            </div>
            <Dialog.Close asChild>
              <button className={styles.close} aria-label="सेटिंग्स बंद करें">
                <X size={22} />
              </button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </OpenCookiePreferences.Provider>
  );
}
export function CookieConsent() {
  const { choice, ready } = useConsent();
  if (!ready || choice) return null;
  return (
    <section className={styles.banner} aria-label="कुकी और गोपनीयता विकल्प" lang="hi">
      <div>
        <h2>आपकी गोपनीयता का सम्मान</h2>
        <p>
          ज़रूरी कुकी सुरक्षित सुविधाएँ चलाती हैं। YouTube और Instagram के वीडियो आपकी अनुमति के बाद ही लोड होते
          हैं। आप वैकल्पिक सेवाएँ अस्वीकार करके भी खबरें पढ़ सकते हैं। <Link href="/cookies">जानें कैसे</Link>
        </p>
      </div>
      <div className={styles.actions}>
        <Button variant="outline" onClick={() => saveConsent(false)}>
          वैकल्पिक सेवाएँ अस्वीकार करें
        </Button>
        <Button variant="outline" onClick={() => saveConsent(true)}>
          वैकल्पिक सेवाएँ स्वीकार करें
        </Button>
        <CookiePreferences>पसंद चुनें</CookiePreferences>
      </div>
    </section>
  );
}
