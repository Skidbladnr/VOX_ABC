export function CaptionPanel({ previousCaption, currentCaption, status }) {
  const isStreaming = currentCaption && !currentCaption.isFinal;

  return (
    <section className="caption-panel" aria-label="Live translated captions">
      <div className="caption-meta">
        <span>Live captions</span>
        <span>{status || 'connected'}</span>
      </div>
      <div className="caption-lines" aria-live="polite">
        <p className="caption-line caption-line--previous">{previousCaption?.text || 'Previous line will appear here.'}</p>
        <p className="caption-line caption-line--current">
          {currentCaption?.text || 'Waiting for speaker captions…'}
          {isStreaming ? <span className="cursor" aria-hidden="true" /> : null}
        </p>
      </div>
      <div className="caption-footer">
        <span>{currentCaption?.provider || 'provider pending'}</span>
        <span>{currentCaption?.latencyMs ? `${currentCaption.latencyMs}ms` : 'latency pending'}</span>
      </div>
    </section>
  );
}
