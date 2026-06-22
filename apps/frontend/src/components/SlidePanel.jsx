export function SlidePanel({ slide, onPrev, onNext }) {
  return (
    <section className="slide-panel" aria-label="Current slide material">
      <div className="slide-thumb">
        <span>{slide?.imageLabel || 'Slide preview'}</span>
      </div>
      <div className="slide-copy">
        <div className="slide-heading-row">
          <p className="eyebrow">Material {slide ? `${slide.index + 1}/${slide.total}` : ''}</p>
          <div className="slide-controls">
            <button onClick={onPrev} aria-label="Previous slide">‹</button>
            <button onClick={onNext} aria-label="Next slide">›</button>
          </div>
        </div>
        <h2>{slide?.title || 'Slides loading…'}</h2>
        <p>{slide?.body || 'Pre-translated materials will appear here when available.'}</p>
      </div>
    </section>
  );
}
