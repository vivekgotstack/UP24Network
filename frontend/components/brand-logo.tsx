export function BrandLogo({ markOnly = false }: { markOnly?: boolean }) {
  return (
    <span className="brand-wordmark" aria-hidden="true" lang="en">
      <span className="brand-sun" />
      {!markOnly && (
        <span className="brand-name">
          <span>The Morning</span>
          <span>Express</span>
        </span>
      )}
    </span>
  );
}
