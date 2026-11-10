"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main id="main-content" className="empty-state" role="alert">
    <p className="eyebrow">UP24 NETWORK</p><h1>The newsroom is temporarily unavailable.</h1>
    <p>Please try again in a moment.</p><button onClick={reset}>Try again</button>
  </main>;
}
