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

function agentLabel(language, agentState) {
  if (agentState === "connecting") {
    return language === "de" ? "Verbinde" : "Connecting";
  }
  if (agentState === "processing") {
    return language === "de" ? "Analysiert" : "Processing";
  }
  if (agentState === "speaking") {
    return language === "de" ? "Spricht" : "Speaking";
  }
  if (agentState === "interrupted") {
    return language === "de" ? "Unterbrochen" : "Interrupted";
  }
  if (agentState === "listening") {
    return language === "de" ? "Bereit" : "Listening";
  }
  return language === "de" ? "Offline" : "Offline";
}

export default function App() {
  const eventId = useRef(1);
  const wsRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const frameLoopRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const speechRecognitionRef = useRef(null);
  const speakingResetTimerRef = useRef(null);

  const [language, setLanguage] = useState("de");
  const [domain, setDomain] = useState("food");
  const [sessionLive, setSessionLive] = useState(false);
  const [wsStatus, setWsStatus] = useState("disconnected");
  const [appMode, setAppMode] = useState("active_scan");
  const [agentState, setAgentState] = useState("disconnected");
  const [hud, setHud] = useState(INITIAL_HUD);
  const [queryText, setQueryText] = useState("");
  const [barcodeText, setBarcodeText] = useState("");
  const [spokenText, setSpokenText] = useState("");
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);
  const [uncertainText, setUncertainText] = useState("");
  const [uncertainCandidates, setUncertainCandidates] = useState([]);
  const [events, setEvents] = useState([
    {
      id: 1,
      time: formatClock(),
      de: "UI bereit. Starte die Session fuer Live Kamera + Analyse.",
      en: "UI ready. Start session for live camera + analysis."
    }
  ]);

  const confidencePercent = useMemo(() => Math.round((hud.confidence || 0) * 100), [hud.confidence]);
  const confidenceLow = (hud.confidence || 0) < 0.65;

  const pushEvent = (de, en) => {
    eventId.current += 1;
    setEvents((prev) => [{ id: eventId.current, time: formatClock(), de, en }, ...prev].slice(0, 10));
  };

  const clearUncertainState = () => {
    setUncertainText("");
    setUncertainCandidates([]);
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

  const stopAudioCapture = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
    mediaRecorderRef.current = null;
  };

  const stopCamera = () => {
    stopFrameLoop();
    stopAudioCapture();
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

  const blobToDataUrl = (blob) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  const startAudioCapture = () => {
    stopAudioCapture();
    const stream = mediaStreamRef.current;
    if (!stream || typeof MediaRecorder === "undefined") {
      return;
    }

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
      return;
    }

    const audioStream = new MediaStream(audioTracks);
    let recorder;
    try {
      const preferredMime = "audio/webm;codecs=opus";
      const options = MediaRecorder.isTypeSupported?.(preferredMime) ? { mimeType: preferredMime } : undefined;
      recorder = new MediaRecorder(audioStream, options);
    } catch {
      return;
    }
    recorder.ondataavailable = async (event) => {
      if (!event.data || event.data.size === 0) {
        return;
      }
      const socket = wsRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        return;
      }
      try {
        const audioB64 = await blobToDataUrl(event.data);
        socket.send(JSON.stringify({ type: "audio_chunk", audio_b64: audioB64 }));
      } catch {
        // ignore chunk conversion errors
      }
    };
    recorder.start(1000);
    mediaRecorderRef.current = recorder;
  };

  const connectSocket = () =>
    new Promise((resolve, reject) => {
      const socket = new WebSocket(backendWsUrl());
      let settled = false;

      socket.onopen = () => {
        wsRef.current = socket;
        setWsStatus("connected");
        setAgentState("listening");
        socket.send(
          JSON.stringify({
            type: "session_start",
            domain,
            language
          })
        );
        settled = true;
        resolve();
      };

      socket.onerror = () => {
        setWsStatus("error");
        setAgentState("disconnected");
        if (!settled) {
          reject(new Error("WebSocket connection failed"));
        }
      };

      socket.onclose = () => {
        setWsStatus("disconnected");
        setSessionLive(false);
        setAgentState("disconnected");
        setAppMode("active_scan");
        stopCamera();
      };

      socket.onmessage = (event) => {
        let data;
        try {
          data = JSON.parse(event.data);
        } catch {
          pushEvent("Ungueltiges Backend-Ereignis empfangen.", "Invalid backend event received.");
          return;
        }
        const eventType = data.event_type || data.type;

        if (eventType === "hud_update") {
          setHud(data);
          setAppMode("hud_active");
          clearUncertainState();
          pushEvent(
            `HUD aktualisiert: ${data.product_identity?.name || "Produkt"}`,
            `HUD updated: ${data.product_identity?.name || "product"}`
          );
          return;
        }

        if (eventType === "speech_text") {
          setSpokenText(data.text || "");
          setAgentState("speaking");
          if (window.speechSynthesis && data.text) {
            const utterance = new SpeechSynthesisUtterance(data.text);
            utterance.lang = data.language === "de" ? "de-DE" : "en-US";
            utterance.onend = () => {
              setAgentState((prev) => (prev === "interrupted" ? prev : "listening"));
            };
            window.speechSynthesis.cancel();
            window.speechSynthesis.speak(utterance);
          } else {
            window.clearTimeout(speakingResetTimerRef.current);
            speakingResetTimerRef.current = window.setTimeout(() => {
              setAgentState((prev) => (prev === "interrupted" ? prev : "listening"));
            }, 1200);
          }
          return;
        }

        if (eventType === "uncertain_match") {
          setAppMode("uncertain_match");
          setAgentState("listening");
          setUncertainText(data.message || "Unclear product match.");
          const candidates = Array.isArray(data.details?.candidates) ? data.details.candidates : [];
          setUncertainCandidates(candidates);
          pushEvent(
            "Unklare Zuordnung: Rueckfrage an Nutzer erforderlich.",
            "Uncertain match: user clarification required."
          );
          return;
        }

        if (eventType === "barge_ack") {
          setAgentState("interrupted");
          window.clearTimeout(speakingResetTimerRef.current);
          speakingResetTimerRef.current = window.setTimeout(() => {
            setAgentState("listening");
          }, 350);
          const message = data.message || "Barge-in acknowledged";
          pushEvent(message, message);
          return;
        }

        if (eventType === "tool_call") {
          setAppMode("analyzing");
          setAgentState("processing");
        }

        if (eventType === "session_state") {
          if ((data.message || "").toLowerCase().includes("started")) {
            setAgentState("listening");
            setAppMode("active_scan");
          }
          if ((data.message || "").toLowerCase().includes("stopped")) {
            setAgentState("disconnected");
          }
        }

        const message = data.message || eventType || "event";
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
      audio: {
        echoCancellation: true,
        noiseSuppression: true
      }
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
      setWsStatus("connecting");
      setAgentState("connecting");
      setAppMode("active_scan");
      clearUncertainState();
      setSpokenText("");
      await startCamera();
      await connectSocket();
      setSessionLive(true);
      startFrameLoop();
      startAudioCapture();
      pushEvent("Live Session gestartet (Kamera + Audio).", "Live session started (camera + audio).");
    } catch {
      stopCamera();
      closeSocket();
      setSessionLive(false);
      setWsStatus("error");
      setAgentState("disconnected");
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
    setWsStatus("disconnected");
    setAgentState("disconnected");
    setAppMode("active_scan");
    clearUncertainState();
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

  const sendQuery = (queryOverride) => {
    const socket = wsRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      pushEvent("Keine Verbindung zum Backend.", "No backend connection.");
      return;
    }

    const cleanQuery = (queryOverride ?? queryText).trim();
    const cleanBarcode = barcodeText.trim();

    if (!cleanQuery && !cleanBarcode) {
      pushEvent("Bitte Frage oder Barcode eingeben.", "Please provide question or barcode.");
      return;
    }

    setAppMode("analyzing");
    setAgentState("processing");
    clearUncertainState();

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

  const sendCandidateSelection = (candidateName) => {
    setQueryText(candidateName);
    sendQuery(candidateName);
  };

  const toggleVoiceInput = () => {
    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      pushEvent("Sprachaufnahme wird in diesem Browser nicht unterstuetzt.", "Voice input is not supported in this browser.");
      return;
    }

    if (voiceListening && speechRecognitionRef.current) {
      speechRecognitionRef.current.stop();
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = language === "de" ? "de-DE" : "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setVoiceListening(true);
    recognition.onend = () => setVoiceListening(false);
    recognition.onerror = () => {
      setVoiceListening(false);
      pushEvent("Sprachaufnahme fehlgeschlagen.", "Voice capture failed.");
    };
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim() || "";
      if (!transcript) {
        return;
      }
      setQueryText(transcript);
      sendQuery(transcript);
      pushEvent(`Sprachfrage erkannt: ${transcript}`, `Voice query recognized: ${transcript}`);
    };

    speechRecognitionRef.current = recognition;
    recognition.start();
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
    setAgentState("interrupted");
    setSpokenText(language === "de" ? "Unterbrochen." : "Interrupted.");
    window.clearTimeout(speakingResetTimerRef.current);
    speakingResetTimerRef.current = window.setTimeout(() => {
      setAgentState("listening");
      setSpokenText("");
    }, 350);
    pushEvent("Barge-in gesendet.", "Barge-in sent.");
  };

  useEffect(() => {
    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    setVoiceSupported(Boolean(SpeechRecognitionCtor));

    return () => {
      stopCamera();
      closeSocket();
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop();
      }
      window.clearTimeout(speakingResetTimerRef.current);
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

            <div className={`session-pill ${wsStatus === "connecting" ? "connecting" : sessionLive ? "live" : wsStatus === "error" ? "error" : "idle"}`}>
              {agentLabel(language, agentState)}
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
              {appMode !== "analyzing" && <div className="scan-line" />}

              <div className="product-badge">
                <p>{hud.product_identity?.brand || "-"}</p>
                <strong>{hud.product_identity?.name || "No product"}</strong>
              </div>

              {appMode === "uncertain_match" && (
                <div className="uncertain-overlay">
                  <div className="uncertain-card">
                    <h3>{language === "de" ? "Unklare Zuordnung" : "Unclear match"}</h3>
                    <p>
                      {uncertainText ||
                        (language === "de"
                          ? "Bitte Produkt genauer beschreiben oder eine Option auswaehlen."
                          : "Please clarify the product or pick an option.")}
                    </p>
                    {uncertainCandidates.length > 0 && (
                      <div className="candidate-row">
                        {uncertainCandidates.map((candidate, index) => (
                          <button
                            key={`${candidate.id || candidate.name || "candidate"}-${index}`}
                            type="button"
                            onClick={() => sendCandidateSelection(candidate.name || "")}
                            className="candidate-chip"
                          >
                            {candidate.name || `${language === "de" ? "Option" : "Option"} ${index + 1}`}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="hud-panel">
                <p className="hud-title">{language === "de" ? "Sprachantwort" : "Voice output"}</p>
                <p className="hud-verdict">
                  {appMode === "analyzing"
                    ? language === "de"
                      ? "Analysiere Anfrage und Produktdaten ..."
                      : "Analyzing query and product data ..."
                    : spokenText ||
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
              <button className="btn" onClick={() => sendQuery()}>
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
            {sessionLive ? (language === "de" ? "Session stoppen" : "Stop session") : language === "de" ? "Session starten" : "Start session"}
          </button>

          <button className="btn" onClick={triggerBargeIn}>
            {language === "de" ? "Barge-in" : "Barge-in"}
          </button>

          <button className="btn" onClick={toggleVoiceInput} disabled={!voiceSupported}>
            {voiceListening ? (language === "de" ? "Aufnahme stoppen" : "Stop listening") : language === "de" ? "Sprachfrage" : "Voice query"}
          </button>

          <button className="btn" onClick={() => window.speechSynthesis?.cancel()}>
            {language === "de" ? "Audio stoppen" : "Stop audio"}
          </button>

          <button
            className="btn"
            onClick={() => {
              setHud(INITIAL_HUD);
              setAppMode("active_scan");
              clearUncertainState();
            }}
          >
            {language === "de" ? "HUD reset" : "Reset HUD"}
          </button>
        </section>

        <footer className="disclaimer fade-in delay-3">
          <p>
            Hinweis: Nur zu Informationszwecken. Keine medizinische Beratung. Bei Allergien/Erkrankungen bitte Arzt:in
            fragen.
          </p>
          {confidenceLow && (
            <p className="low-confidence-note">
              {language === "de"
                ? "Konfidenz niedrig: Bitte Produktbezeichnung oder Barcode bestaetigen."
                : "Low confidence: please confirm product name or barcode."}
            </p>
          )}
        </footer>
      </main>
    </div>
  );
}
