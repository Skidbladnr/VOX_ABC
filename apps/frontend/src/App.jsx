import { useEffect, useMemo, useRef, useState } from 'react';
import { LANGUAGES, findLanguage } from '../../../shared/contracts/languages.js';
import { TopBar } from './components/TopBar.jsx';
import { LanguagePicker } from './components/LanguagePicker.jsx';
import { SessionBlock } from './components/SessionBlock.jsx';
import { SlidePanel } from './components/SlidePanel.jsx';
import { CaptionPanel } from './components/CaptionPanel.jsx';
import { AdminDashboard } from './components/AdminDashboard.jsx';
import { getJson, WS_BASE } from './api.js';

const isAdmin = new URLSearchParams(window.location.search).get('admin') === '1';
const storedLanguage = window.localStorage.getItem('vox.language') || 'ja-JP';

export function App() {
  if (isAdmin) return <AdminDashboard />;
  return <AttendeeApp />;
}

function AttendeeApp() {
  const [languages, setLanguages] = useState(LANGUAGES);
  const [selectedCode, setSelectedCode] = useState(storedLanguage);
  const [session, setSession] = useState(null);
  const [slides, setSlides] = useState([]);
  const [slideIndex, setSlideIndex] = useState(0);
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState('connecting');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [previousCaption, setPreviousCaption] = useState(null);
  const [currentCaption, setCurrentCaption] = useState(null);
  const wsRef = useRef(null);
  const reconnectRef = useRef({ timer: null, attempt: 0 });

  const selectedLanguage = useMemo(() => findLanguage(selectedCode), [selectedCode]);

  useEffect(() => {
    getJson('/api/session').then(setSession).catch(() => {});
    getJson('/api/languages').then((payload) => setLanguages(payload.languages || LANGUAGES)).catch(() => {});
  }, []);

  useEffect(() => {
    window.localStorage.setItem('vox.language', selectedCode);
    getJson(`/api/slides?lang=${encodeURIComponent(selectedCode)}`)
      .then((payload) => {
        setSlides(payload.slides || []);
        setSlideIndex(0);
      })
      .catch(() => {});
  }, [selectedCode]);

  useEffect(() => {
    let closedByEffect = false;

    function connect() {
      setStatus('connecting');
      const wsUrl = `${WS_BASE}?lang=${encodeURIComponent(selectedCode)}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.addEventListener('open', () => {
        reconnectRef.current.attempt = 0;
        setConnected(true);
        setStatus('connected');
        ws.send(JSON.stringify({ type: 'subscribe', language: selectedCode }));
      });

      ws.addEventListener('message', (event) => {
        let message;
        try {
          message = JSON.parse(event.data);
        } catch {
          return;
        }
        if (message.type === 'caption') {
          setCurrentCaption((current) => {
            if (current && current.segmentId !== message.segmentId) {
              setPreviousCaption(current);
            }
            return message;
          });
        }
        if (message.type === 'status') setStatus(message.status);
        if (message.type === 'slide') setSlideIndex(message.index);
      });

      ws.addEventListener('close', () => {
        setConnected(false);
        setStatus('reconnecting');
        if (closedByEffect) return;
        const attempt = reconnectRef.current.attempt + 1;
        reconnectRef.current.attempt = attempt;
        const delay = Math.min(1000 * attempt, 5000);
        reconnectRef.current.timer = setTimeout(connect, delay);
      });

      ws.addEventListener('error', () => {
        setConnected(false);
        setStatus('reconnecting');
      });
    }

    connect();
    return () => {
      closedByEffect = true;
      clearTimeout(reconnectRef.current.timer);
      wsRef.current?.close();
    };
  }, [selectedCode]);

  function changeLanguage(code) {
    setSelectedCode(code);
    setPreviousCaption(null);
    setCurrentCaption(null);
  }

  const slide = slides[slideIndex] || slides[0];

  return (
    <main className="app-shell">
      <TopBar connected={connected} selectedLanguage={selectedLanguage} onOpenLanguagePicker={() => setPickerOpen(true)} />
      <SessionBlock session={session} />
      <div className="content-grid">
        <SlidePanel
          slide={slide}
          onPrev={() => setSlideIndex((index) => Math.max(0, index - 1))}
          onNext={() => setSlideIndex((index) => Math.min(slides.length - 1, index + 1))}
        />
        <CaptionPanel previousCaption={previousCaption} currentCaption={currentCaption} status={status} />
      </div>
      <LanguagePicker
        open={pickerOpen}
        languages={languages}
        selectedCode={selectedCode}
        onSelect={changeLanguage}
        onClose={() => setPickerOpen(false)}
      />
    </main>
  );
}
