import Image from 'next/image';
import type { CSSProperties } from 'react';
import zodiacArtwork from '@/public/images/zodiac/zodiac-atlas.png';
import { zodiacFor } from '@/lib/zodiac';

/** Each frame shows a complete illustration from one shared, transparent atlas. */
export function ZodiacArt({ sign, large = false }: { sign: string; large?: boolean }) {
  const zodiac = zodiacFor(sign);
  if (!zodiac) return null;
  const row = Math.floor(zodiac.tile / 3);
  const top = Math.floor((row * zodiacArtwork.height) / 4);
  const bottom = Math.floor(((row + 1) * zodiacArtwork.height) / 4);
  const cellHeight = bottom - top;
  const frameStyle = {
    '--zodiac-left': `${-(zodiac.tile % 3) * 100}%`,
    '--zodiac-top': `${(-top / cellHeight) * 100}%`,
    '--zodiac-height': `${(zodiacArtwork.height / cellHeight) * 100}%`,
    aspectRatio: `${zodiacArtwork.width / 3} / ${cellHeight}`,
  } as CSSProperties;
  return (
    <span className={`zodiac-art${large ? ' zodiac-art-large' : ''}`} style={frameStyle} aria-hidden="true">
      <Image src={zodiacArtwork} alt="" className="zodiac-sheet" sizes={large ? '(max-width: 760px) 540px, 840px' : '216px'} />
    </span>
  );
}
