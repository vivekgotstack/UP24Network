export default function Loading() {
  return (
    <main id="main-content" className="page-loading" aria-busy="true" aria-label="Loading reports">
      <div className="loading-masthead skeleton" />
      <div className="loading-title skeleton" />
      <div className="story-grid">
        {[0, 1, 2].map((index) => (
          <div key={index}>
            <div className="loading-cover skeleton" />
            <div className="loading-line skeleton" />
            <div className="loading-line short skeleton" />
          </div>
        ))}
      </div>
      <p className="sr-only" role="status">
        Loading reports…
      </p>
    </main>
  );
}
