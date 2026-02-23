import { useEffect, useMemo, useRef, useState } from "react";

const CATEGORY_LABEL = {
  authorized: "Authorized",
  restricted: "Restricted",
  warning_required: "Warning required",
  not_authorized: "Not authorized",
  uncertain: "Uncertain"
};

const DOMAIN_LABEL = {
  food: { de: "Lebensmittel", en: "Food" },
  beauty: { de: "Kosmetik Beta", en: "Cosmetics Beta" }
};

const INITIAL_HUD = {
  product_identity: {
    id: "unknown",
    name: "No product yet",
    brand: "Point camera and ask"
  },
  grade_or_tier: "-",
  confidence: 0,
  warnings: [],
  metrics: [],
  data_sources: [],
  explanation_bullets: []
};

function formatClock() {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function pick(language, value) {
  return language === "de" ? value.de : value.en;
}

function backendWsUrl() {
  if (import.meta.env.VITE_BACKEND_WS_URL) {
    return import.meta.env.VITE_BACKEND_WS_URL;
  }

  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  return `${protocol}://${window.location.hostname}:8000/ws/live`;
}

export default function App() {
  const eventId = useRef(1);
  const wsRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const frameLoopRef = useRef(null);

  const [language, setLanguage] = useState("de");
  const [domain, setDomain] = useState("food");
  const [sessionLive, setSessionLive] = useState(false);
  const [wsStatus, setWsStatus] = useState("disconnected");
  const [hud, setHud] = useState(INITIAL_HUD);
  const [queryText, setQueryText] = useState("");
  const [barcodeText, setBarcodeText] = useState("");
  const [spokenText, setSpokenText] = useState("");
  const [events, setEvents] = useState([
    {
      id: 1,
      time: formatClock(),
      de: "UI bereit. Starte die Session fuer Live Kamera + Analyse.",
      en: "UI ready. Start session for live camera + analysis."
    }
  ]);

  const confidencePercent = useMemo(() => Math.round((hud.confidence || 0) * 100), [hud.confidence]);

  const pushEvent = (de, en) => {
    eventId.current += 1;
    setEvents((prev) => [{ id: eventId.current, time: formatClock(), de, en }, ...prev].slice(0, 10));
  };

  const closeSocket = () => {
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {
        // noop
      }
      wsRef.current = null;
    }
  };

  const stopFrameLoop = () => {
    if (frameLoopRef.current) {
      window.clearInterval(frameLoopRef.current);
      frameLoopRef.current = null;
    }
  };

  const stopCamera = () => {
    stopFrameLoop();
    const stream = mediaStreamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  const startFrameLoop = () => {
    stopFrameLoop();
    frameLoopRef.current = window.setInterval(() => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const socket = wsRef.current;
      if (!video || !canvas || !socket || socket.readyState !== WebSocket.OPEN) {
        return;
      }

      if (video.videoWidth === 0 || video.videoHeight === 0) {
        return;
      }

      canvas.width = 640;
      canvas.height = 360;
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) {
        return;
      }

      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const image = canvas.toDataURL("image/jpeg", 0.65);
      socket.send(JSON.stringify({ type: "frame", image_b64: image }));
    }, 1000);
  };

  const connectSocket = () =>
    new Promise((resolve, reject) => {
      const socket = new WebSocket(backendWsUrl());

      socket.onopen = () => {
        wsRef.current = socket;
        setWsStatus("connected");
        socket.send(
          JSON.stringify({
            type: "session_start",
            domain,
            language
          })
        );
        resolve();
      };

      socket.onerror = () => {
        setWsStatus("error");
        reject(new Error("WebSocket connection failed"));
      };

      socket.onclose = () => {
        setWsStatus("disconnected");
        setSessionLive(false);
      };

      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.event_type === "hud_update") {
          setHud(data);
          pushEvent(
            `HUD aktualisiert: ${data.product_identity?.name || "Produkt"}`,
            `HUD updated: ${data.product_identity?.name || "product"}`
          );
          return;
        }

        if (data.event_type === "speech_text") {
          setSpokenText(data.text || "");
          if (window.speechSynthesis && data.text) {
            const utterance = new SpeechSynthesisUtterance(data.text);
            utterance.lang = data.language === "de" ? "de-DE" : "en-US";
            window.speechSynthesis.cancel();
            window.speechSynthesis.speak(utterance);
          }
          return;
        }

        const message = data.message || data.event_type || "event";
        pushEvent(message, message);
      };
    });

  const startCamera = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "environment",
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    });

    mediaStreamRef.current = stream;
    const video = videoRef.current;
    if (video) {
      video.srcObject = stream;
      await video.play();
    }
  };

  const startSession = async () => {
    if (sessionLive) {
      return;
    }

    try {
      await startCamera();
      setWsStatus("connecting");
      await connectSocket();
      setSessionLive(true);
      startFrameLoop();
      pushEvent("Live Session gestartet.", "Live session started.");
    } catch (error) {
      stopCamera();
      closeSocket();
      setWsStatus("error");
      pushEvent("Sessionstart fehlgeschlagen. Kamera oder Backend pruefen.", "Session start failed. Check camera/backend.");
    }
  };

  const stopSession = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "session_end" }));
    }
    stopCamera();
    closeSocket();
    setSessionLive(false);
    setHud(INITIAL_HUD);
    setSpokenText("");
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    pushEvent("Live Session beendet.", "Live session stopped.");
  };

  const toggleSession = () => {
    if (sessionLive) {
      stopSession();
      return;
    }
    void startSession();
  };

  const sendQuery = () => {
    const socket = wsRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      pushEvent("Keine Verbindung zum Backend.", "No backend connection.");
      return;
    }

    const cleanQuery = queryText.trim();
    const cleanBarcode = barcodeText.trim();

    if (!cleanQuery && !cleanBarcode) {
      pushEvent("Bitte Frage oder Barcode eingeben.", "Please provide question or barcode.");
      return;
    }

    socket.send(
      JSON.stringify({
        type: "user_query",
        text: cleanQuery,
        barcode: cleanBarcode,
        domain
      })
    );
    pushEvent(
      cleanQuery ? `Frage gesendet: ${cleanQuery}` : `Barcode gesendet: ${cleanBarcode}`,
      cleanQuery ? `Query sent: ${cleanQuery}` : `Barcode sent: ${cleanBarcode}`
    );
  };

  const triggerBargeIn = () => {
    const socket = wsRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      pushEvent("Barge-in nur in aktiver Session moeglich.", "Barge-in requires active session.");
      return;
    }
    socket.send(JSON.stringify({ type: "barge_in" }));
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    pushEvent("Barge-in gesendet.", "Barge-in sent.");
  };

  useEffect(() => {
    return () => {
      stopCamera();
      closeSocket();
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return (
    <div className="page-bg">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <main className="app-shell">
        <header className="topbar card fade-in">
          <div>
            <p className="eyebrow">NutriVision Live</p>
            <h1>Realtime Camera + Voice Copilot</h1>
          </div>

          <div className="topbar-controls">
            <label>
              <span>{language === "de" ? "Sprache" : "Language"}</span>
              <select value={language} onChange={(event) => setLanguage(event.target.value)}>
                <option value="de">Deutsch</option>
                <option value="en">English</option>
              </select>
            </label>

            <label>
              <span>{language === "de" ? "Domain" : "Domain"}</span>
              <select value={domain} onChange={(event) => setDomain(event.target.value)}>
                <option value="food">Food</option>
                <option value="beauty">Cosmetics Beta</option>
              </select>
            </label>

            <div className={`session-pill ${sessionLive ? "live" : "idle"}`}>
              {sessionLive ? (language === "de" ? "Session Live" : "Session Live") : language === "de" ? "Session Aus" : "Session Off"}
            </div>
          </div>
        </header>

        <section className="status-grid fade-in delay-1">
          <article className="card status-card">
            <p>{language === "de" ? "Domain" : "Domain"}</p>
            <strong>{pick(language, DOMAIN_LABEL[domain])}</strong>
          </article>
          <article className="card status-card">
            <p>{language === "de" ? "Vertrauen" : "Confidence"}</p>
            <strong>{confidencePercent}%</strong>
          </article>
          <article className="card status-card">
            <p>{language === "de" ? "WS Status" : "WS Status"}</p>
            <strong>{wsStatus}</strong>
          </article>
        </section>

        <section className="workspace fade-in delay-2">
          <article className="card camera-card">
            <div className="camera-viewport">
              <video ref={videoRef} autoPlay playsInline muted className="camera-video" />
              <canvas ref={canvasRef} className="camera-canvas" />
              <div className="scan-line" />

              <div className="product-badge">
                <p>{hud.product_identity?.brand || "-"}</p>
                <strong>{hud.product_identity?.name || "No product"}</strong>
              </div>

              <div className="hud-panel">
                <p className="hud-title">{language === "de" ? "Sprachantwort" : "Voice output"}</p>
                <p className="hud-verdict">
                  {spokenText ||
                    (language === "de"
                      ? "Starte Session, halte Produkt ins Bild und stelle eine Frage."
                      : "Start session, point camera to product, and ask a question.")}
                </p>
              </div>
            </div>

            <div className="query-dock">
              <input
                type="text"
                value={queryText}
                placeholder={language === "de" ? "Frage z.B. Ist das fuer Kinder okay?" : "Ask e.g. Is this good for kids?"}
                onChange={(event) => setQueryText(event.target.value)}
              />
              <input
                type="text"
                value={barcodeText}
                placeholder={language === "de" ? "Barcode optional" : "Barcode optional"}
                onChange={(event) => setBarcodeText(event.target.value)}
              />
              <button className="btn" onClick={sendQuery}>
                {language === "de" ? "Senden" : "Send"}
              </button>
            </div>

            <div className="sources-row">
              {(hud.data_sources || []).map((source) => (
                <span key={source} className="source-chip">
                  {source}
                </span>
              ))}
            </div>
          </article>

          <article className="card insight-card">
            <section>
              <h2>{language === "de" ? "Warnhinweise" : "Warnings"}</h2>
              <div className="warning-grid">
                {(hud.warnings || []).length === 0 ? (
                  <div className="warning-chip">
                    <span>Info</span>
                    <strong>{language === "de" ? "Noch keine Warnungen" : "No warnings yet"}</strong>
                  </div>
                ) : (
                  (hud.warnings || []).map((warning, index) => (
                    <div key={`${warning.category}-${index}`} className="warning-chip">
                      <span>{CATEGORY_LABEL[warning.category] || warning.category}</span>
                      <strong>{warning.label}</strong>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section>
              <h2>{language === "de" ? "Analyse-Chart" : "Analysis chart"}</h2>
              <div className="metric-list">
                {(hud.metrics || []).length === 0 ? (
                  <div className="metric-item">
                    <div className="metric-head">
                      <span>{language === "de" ? "Keine Metriken" : "No metrics"}</span>
                      <strong>-</strong>
                    </div>
                    <div className="meter-track" />
                  </div>
                ) : (
                  (hud.metrics || []).map((metric, index) => (
                    <div key={`${metric.name}-${index}`} className="metric-item">
                      <div className="metric-head">
                        <span>{metric.name}</span>
                        <strong>{metric.value}</strong>
                      </div>
                      <div className="meter-track">
                        <div className={`meter-fill ${metric.band}`} style={{ width: `${metric.score}%` }} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section>
              <h2>{language === "de" ? "Live Ereignisse" : "Live events"}</h2>
              <ul className="event-list">
                {events.map((eventItem) => (
                  <li key={eventItem.id}>
                    <span>{eventItem.time}</span>
                    <p>{language === "de" ? eventItem.de : eventItem.en}</p>
                  </li>
                ))}
              </ul>
            </section>
          </article>
        </section>

        <section className="control-dock card fade-in delay-3">
          <button className="btn primary" onClick={toggleSession}>
            {sessionLive
              ? language === "de"
                ? "Session stoppen"
                : "Stop session"
              : language === "de"
                ? "Session starten"
                : "Start session"}
          </button>

          <button className="btn" onClick={triggerBargeIn}>
            {language === "de" ? "Barge-in" : "Barge-in"}
          </button>

          <button className="btn" onClick={() => window.speechSynthesis?.cancel()}>
            {language === "de" ? "Audio stoppen" : "Stop audio"}
          </button>

          <button className="btn" onClick={() => setHud(INITIAL_HUD)}>
            {language === "de" ? "HUD reset" : "Reset HUD"}
          </button>
        </section>

        <footer className="disclaimer fade-in delay-3">
          <p>
            Hinweis: Nur zu Informationszwecken. Keine medizinische Beratung. Bei Allergien/Erkrankungen bitte Arzt:in
            fragen.
          </p>
        </footer>
      </main>
    </div>
  );
}
