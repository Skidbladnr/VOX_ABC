export function LanguagePicker({ open, languages, selectedCode, onSelect, onClose }) {
  if (!open) return null;

  return (
    <div className="sheet-backdrop" role="presentation" onClick={onClose}>
      <section className="language-sheet" role="dialog" aria-modal="true" aria-label="Select caption language" onClick={(event) => event.stopPropagation()}>
        <div className="sheet-header">
          <div>
            <p className="eyebrow">Caption language</p>
            <h2>Choose your stream</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close language picker">×</button>
        </div>
        <div className="language-list">
          {languages.map((language) => (
            <button
              key={language.code}
              className={`language-row ${language.code === selectedCode ? 'language-row--active' : ''}`}
              onClick={() => {
                onSelect(language.code);
                onClose();
              }}
            >
              <span>
                <strong>{language.label}</strong>
                <small>{language.english}{language.needsQualitySpike ? ' · quality spike needed' : ''}</small>
              </span>
              <span className="checkmark">{language.code === selectedCode ? '✓' : ''}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
