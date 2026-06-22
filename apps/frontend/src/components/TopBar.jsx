export function TopBar({ connected, selectedLanguage, onOpenLanguagePicker }) {
  return (
    <header className="top-bar">
      <div className="connection-pill" aria-live="polite">
        <span className={`status-dot ${connected ? 'status-dot--live' : ''}`} />
        <span>{connected ? 'Live' : 'Reconnecting'}</span>
      </div>
      <button className="language-dial" onClick={onOpenLanguagePicker} aria-label="Change language">
        <span className="dial-icon" aria-hidden="true" />
        <span>{selectedLanguage?.label || 'Language'}</span>
      </button>
    </header>
  );
}
