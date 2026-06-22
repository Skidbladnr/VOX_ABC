export function SessionBlock({ session }) {
  return (
    <section className="session-block">
      <p className="eyebrow">Now speaking</p>
      <h1>{session?.title || 'Waiting for session'}</h1>
      <p>{session?.speaker || 'Speaker feed pending'} · {session?.label || 'Main stage'}</p>
    </section>
  );
}
