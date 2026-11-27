import { brand } from '@/lib/brand';

export function BrandLogo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="brand-wordmark" lang="hi" aria-hidden="true">
      <span className="brand-title">
        <span className="brand-prefix">द</span> {brand.mastheadTitle}
      </span>
      {!compact && (
        <span className="brand-subtitle">
          लखनऊ से प्रकाशित हिंदी दैनिक <span aria-hidden="true">•</span> खबर हमारी, यकीन आपका
        </span>
      )}
    </span>
  );
}
