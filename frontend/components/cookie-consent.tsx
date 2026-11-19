'use client';

import { createContext, useContext, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Dialog } from 'radix-ui';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { saveConsent, useConsent } from '@/lib/consent';
import { copy, type SiteLocale } from '@/lib/locale';
import styles from './cookie-consent.module.css';

const CookieDialog = createContext<{ locale: SiteLocale; open: (trigger: HTMLButtonElement) => void }>({ locale: 'hi', open: () => {} });

export function CookiePreferences({ children }: { children?: ReactNode }) {
  const { open, locale } = useContext(CookieDialog);
  return (
    <button
      type="button"
      className={styles.preferences}
      aria-haspopup="dialog"
      onClick={(event) => open(event.currentTarget)}
    >
      {children ?? copy(locale, 'कुकी सेटिंग्स', 'Cookie settings')}
    </button>
  );
}

export function CookiePreferencesProvider({ children, locale }: { children: ReactNode; locale: SiteLocale }) {
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
    <CookieDialog.Provider value={{ open: show, locale }}>
      {children}
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className={styles.overlay} />
          <Dialog.Content
            className={styles.dialog}
            lang={locale}
            onCloseAutoFocus={(event) => {
              if (returnFocus.current?.isConnected) {
                event.preventDefault();
                returnFocus.current.focus({ preventScroll: true });
              }
            }}
          >
            <Dialog.Title>{copy(locale, 'गोपनीयता सेटिंग्स', 'Privacy settings')}</Dialog.Title>
            <Dialog.Description>
              {copy(locale, 'आप वैकल्पिक सेवाएँ बंद रखकर भी पढ़ सकते हैं। अपनी पसंद कभी भी बदलें।', 'You can read with optional services turned off. Change your choices anytime.')}
            </Dialog.Description>
            <div className={styles.option}>
              <div>
                <strong>{copy(locale, 'ज़रूरी सुविधाएँ', 'Essential services')}</strong>
                <p>{copy(locale, 'सुरक्षित लॉगिन, सुरक्षा जाँच और आपकी कुकी पसंद याद रखने के लिए।', 'These support sign-in, security checks, and your cookie preferences.')}</p>
              </div>
              <span>{copy(locale, 'हमेशा चालू', 'Always on')}</span>
            </div>
            <label className={styles.option}>
              <span>
                <strong>{copy(locale, 'बाहरी वीडियो', 'External videos')}</strong>
                <span className={styles.explanation}>
                  {copy(locale, 'वीडियो चलाने की अनुमति देने पर YouTube का प्लेयर लोड होगा। YouTube को आपका IP पता और डिवाइस की जानकारी मिल सकती है।', 'When you allow and play a video, YouTube loads its player and may receive your IP address and device information.')}
                </span>
              </span>
              <input
                aria-label={copy(locale, 'YouTube वीडियो की अनुमति', 'Allow YouTube videos')}
                type="checkbox"
                checked={video}
                onChange={(event) => setVideo(event.target.checked)}
              />
            </label>
            <p>
              {copy(locale, 'यह साइट अभी विज्ञापन ट्रैकिंग या बाहरी एनालिटिक्स नहीं चलाती।', 'The site currently uses no advertising trackers or external analytics.')}{' '}
              <Link href="/cookies" onClick={() => setOpen(false)}>
                {copy(locale, 'कुकी नीति', 'Cookie policy')}
              </Link>{' '}
              ·{' '}
              <Link href="/privacy" onClick={() => setOpen(false)}>
                {copy(locale, 'गोपनीयता नीति', 'Privacy policy')}
              </Link>
            </p>
            <div className={styles.actions}>
              <Button variant="outline" onClick={() => save(false)}>
                {copy(locale, 'वैकल्पिक सेवाएँ अस्वीकार करें', 'Reject optional services')}
              </Button>
              <Button variant="outline" onClick={() => save(video)}>
                {copy(locale, 'पसंद सहेजें', 'Save choices')}
              </Button>
            </div>
            <Dialog.Close asChild>
              <button className={styles.close} aria-label={copy(locale, 'सेटिंग्स बंद करें', 'Close settings')}>
                <X size={22} />
              </button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </CookieDialog.Provider>
  );
}
export function CookieConsent({ locale }: { locale: SiteLocale }) {
  const { choice, ready } = useConsent();
  if (!ready || choice) return null;
  return (
    <section className={styles.banner} aria-label={copy(locale, 'कुकी और गोपनीयता विकल्प', 'Cookie and privacy choices')} lang={locale}>
      <div>
        <h2>{copy(locale, 'कुकी और गोपनीयता', 'Cookies and privacy')}</h2>
        <p>
          {copy(locale, 'ज़रूरी कुकी साइट को सुरक्षित ढंग से चलाती हैं। YouTube के वीडियो आपकी अनुमति पर लोड होते हैं।', 'Essential cookies help keep the site secure. YouTube videos load with your permission.')}{' '}
          <Link href="/cookies">{copy(locale, 'कुकी नीति', 'Cookie policy')}</Link>
        </p>
      </div>
      <div className={styles.actions}>
        <Button variant="outline" onClick={() => saveConsent(false)}>
          {copy(locale, 'वैकल्पिक सेवाएँ अस्वीकार करें', 'Reject optional services')}
        </Button>
        <Button variant="outline" onClick={() => saveConsent(true)}>
          {copy(locale, 'वैकल्पिक सेवाएँ स्वीकार करें', 'Allow optional services')}
        </Button>
        <CookiePreferences>{copy(locale, 'पसंद चुनें', 'Customize')}</CookiePreferences>
      </div>
    </section>
  );
}
