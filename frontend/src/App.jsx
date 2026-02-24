import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  AudioLines,
  Camera,
  Circle,
  Eye,
  Github,
  Globe,
  Info,
  Mic,
  MicOff,
  Play,
  ScanLine,
  SendHorizonal,
  Shield,
  Volume2
} from "lucide-react";

const DEMO_PRODUCTS = [
  {
    name: "Organic Oat Cereal",
    category: "Food",
    bars: [
      { label: "Metrik 1", value: 88 },
      { label: "Metrik 2", value: 95 },
      { label: "Metrik 3", value: 72 },
      { label: "Metrik 4", value: 65 }
    ],
    spokenVerdict:
      "This organic oat cereal has a strong nutritional profile with minimal additives. Note: contains gluten. Suitable for most diets.",
    warnings: ["Gluten present", "High fiber"]
  },
  {
    name: "Berry Energy Drink",
    category: "Food",
    bars: [
      { label: "Metrik 1", value: 35 },
      { label: "Metrik 2", value: 42 },
      { label: "Metrik 3", value: 29 },
      { label: "Metrik 4", value: 84 }
    ],
    spokenVerdict:
      "Warning: high caffeine, artificial colorings, and significant added sugars. Not recommended for children or caffeine-sensitive individuals.",
    warnings: ["High caffeine", "Artificial colors"]
  },
  {
    name: "Gentle Face Cream",
    category: "Cosmetics (Beta)",
    bars: [
      { label: "Metrik 1", value: 71 },
      { label: "Metrik 2", value: 52 },
      { label: "Metrik 3", value: 43 },
      { label: "Metrik 4", value: 79 }
    ],
    spokenVerdict:
      "This face cream contains a flagged fragrance allergen and a harsh surfactant. Individuals with sensitive skin should patch-test first.",
    warnings: ["Fragrance allergen", "Surfactant flag"]
  }
];

const INITIAL_HUD = {
  product_identity: {
    id: "unknown",
    name: "Awaiting target...",
    brand: "SYSTEM"
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
    minute: "2-digit",
    second: "2-digit"
  });
}

function backendWsUrl() {
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  return `${protocol}://${window.location.hostname}:8000/ws/live`;
}

function scoreTone(score) {
  if (score >= 75) return "score-high";
  if (score >= 50) return "score-mid";
  if (score >= 35) return "score-low";
  return "score-bad";
}

function userLanguageLabel(lang) {
  return lang === "de" ? "DE" : "EN";
}

function SendIcon() {
  return <SendHorizonal size={14} />;
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
  const ambientAudioRef = useRef(null);
  const ambientLoopRef = useRef(null);
  const ambientPauseTimerRef = useRef(null);

  const [language, setLanguage] = useState("de");
  const [domain, setDomain] = useState("food");
  const [sessionLive, setSessionLive] = useState(false);
  const [wsStatus, setWsStatus] = useState("disconnected");
  const [agentState, setAgentState] = useState("disconnected");
  const [appMode, setAppMode] = useState("active_scan");
  const [hud, setHud] = useState(INITIAL_HUD);
  const [queryText, setQueryText] = useState("");
  const [barcodeText, setBarcodeText] = useState("");
  const [spokenText, setSpokenText] = useState("");
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);
  const [demoIndex, setDemoIndex] = useState(0);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [events, setEvents] = useState([
    {
      id: 1,
      time: formatClock(),
      de: "System initialisiert. Warte auf Video-Uplink.",
      en: "System initialized. Awaiting video uplink."
    }
  ]);

  const selectedDemo = DEMO_PRODUCTS[demoIndex];
  const hasLiveHud = sessionLive && hud.product_identity?.id && hud.product_identity.id !== "unknown";

  const metricRows = useMemo(() => {
    const rows = Array.isArray(hud.metrics)
      ? hud.metrics.slice(0, 4).map((metric, index) => ({
          label: metric.name || `Metrik ${index + 1}`,
          score: Math.max(0, Math.min(100, Number(metric.score || 0))),
          value: metric.value ?? "-"
        }))
      : [];

    while (rows.length < 4) {
      rows.push({
        label: `Metrik ${rows.length + 1}`,
        score: 0,
        value: "-"
      });
    }

    return rows;
  }, [hud.metrics]);

  const analysisRows = hasLiveHud
    ? metricRows
    : selectedDemo.bars.map((bar, index) => ({
        label: bar.label || `Metrik ${index + 1}`,
        score: bar.value,
        value: "-"
      }));

  const speechPanelText =
    spokenText ||
    (sessionLive ? "Live-Antwort wird verarbeitet..." : "Scan starten fuer Live-Verlauf");

  const warningRows = hasLiveHud
    ? (hud.warnings || []).map((warning) => warning.label).filter(Boolean)
    : [];

  const warningText = warningRows.length > 0 ? warningRows.join(" | ") : "Keine Warnungen erkannt";

  const musicBlocked =
    !audioUnlocked || !sessionLive || agentState === "speaking" || agentState === "processing";

  const checklist = [
    { label: "Live Session", value: sessionLive ? "ACTIVE" : "OFFLINE", ok: sessionLive },
    { label: "Backend Uplink", value: wsStatus.toUpperCase(), ok: wsStatus === "connected" },
    { label: "Voice Input", value: voiceSupported ? "READY" : "UNSUPPORTED", ok: voiceSupported },
    {
      label: "Ambient Audio",
      value: !musicBlocked ? "PLAYING" : "PAUSED",
      ok: !musicBlocked
    }
  ];

  const pushEvent = (de, en) => {
    eventId.current += 1;
    setEvents((prev) => [{ id: eventId.current, time: formatClock(), de, en }, ...prev].slice(0, 20));
  };

  const clearAmbientTimers = () => {
    if (ambientLoopRef.current) {
      window.clearInterval(ambientLoopRef.current);
      ambientLoopRef.current = null;
    }
    if (ambientPauseTimerRef.current) {
      window.clearTimeout(ambientPauseTimerRef.current);
      ambientPauseTimerRef.current = null;
    }
  };

  const pauseAmbientAudio = (reset = false) => {
    const audio = ambientAudioRef.current;
    if (!audio) return;
    audio.pause();
    if (reset) audio.currentTime = 0;
  };

  const playAmbientBit = async () => {
    const audio = ambientAudioRef.current;
    if (!audio || musicBlocked) return;

    audio.volume = 0.07;

    try {
      await audio.play();
    } catch {
      return;
    }

    if (ambientPauseTimerRef.current) {
      window.clearTimeout(ambientPauseTimerRef.current);
    }

    ambientPauseTimerRef.current = window.setTimeout(() => {
      pauseAmbientAudio();
    }, 4600);
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
    if (recorder && recorder.state !== "inactive") recorder.stop();
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
      if (!video || !canvas || !socket || socket.readyState !== WebSocket.OPEN) return;
      if (video.videoWidth === 0 || video.videoHeight === 0) return;

      canvas.width = 640;
      canvas.height = 360;
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) return;

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
    if (!stream || typeof MediaRecorder === "undefined") return;

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) return;

    const audioStream = new MediaStream(audioTracks);

    let recorder;
    try {
      const preferredMime = "audio/webm;codecs=opus";
      const options = MediaRecorder.isTypeSupported?.(preferredMime)
        ? { mimeType: preferredMime }
        : undefined;
      recorder = new MediaRecorder(audioStream, options);
    } catch {
      return;
    }

    recorder.ondataavailable = async (event) => {
      if (!event.data || event.data.size === 0) return;
      const socket = wsRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN) return;

      try {
        const audioB64 = await blobToDataUrl(event.data);
        socket.send(JSON.stringify({ type: "audio_chunk", audio_b64: audioB64 }));
      } catch {
        // noop
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
        socket.send(JSON.stringify({ type: "session_start", domain, language }));
        settled = true;
        resolve();
      };

      socket.onerror = () => {
        setWsStatus("error");
        setAgentState("disconnected");
        if (!settled) reject(new Error("WebSocket connection failed"));
      };

      socket.onclose = () => {
        setWsStatus("disconnected");
        setSessionLive(false);
        setAgentState("disconnected");
        setAppMode("active_scan");
        clearAmbientTimers();
        pauseAmbientAudio(true);
        stopCamera();
      };

      socket.onmessage = (event) => {
        let data;

        try {
          data = JSON.parse(event.data);
        } catch {
          pushEvent("Datenpaket korrupt.", "Data packet corrupt.");
          return;
        }

        const eventType = data.event_type || data.type;

        if (eventType === "hud_update") {
          setHud(data);
          setAppMode("hud_active");
          pushEvent(
            `Ziel erfasst: ${data.product_identity?.name || "Unbekannt"}`,
            `Target acquired: ${data.product_identity?.name || "Unknown"}`
          );
          return;
        }

        if (eventType === "speech_text") {
          setSpokenText(data.text || "");
          setAgentState("speaking");

          if (window.speechSynthesis && data.text) {
            const utterance = new SpeechSynthesisUtterance(data.text);
            utterance.lang = data.language === "de" ? "de-DE" : "en-US";
            utterance.onend = () =>
              setAgentState((prev) => (prev === "interrupted" ? prev : "listening"));
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
          pushEvent(
            "Zieldaten mehrdeutig. Manuelle Auswahl erforderlich.",
            "Target data ambiguous. Manual override required."
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
    if (sessionLive) return;

    try {
      setWsStatus("connecting");
      setAgentState("connecting");
      setAppMode("active_scan");
      setSpokenText("");
      setAudioUnlocked(true);
      await startCamera();
      await connectSocket();
      setSessionLive(true);
      startFrameLoop();
      startAudioCapture();
      pushEvent("Uplink etabliert (A/V).", "Uplink established (A/V).");
    } catch {
      stopCamera();
      closeSocket();
      setSessionLive(false);
      setWsStatus("error");
      setAgentState("disconnected");
      pushEvent("Uplink fehlgeschlagen. Sensoren pruefen.", "Uplink failed. Check sensors.");
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
    setHud(INITIAL_HUD);
    setSpokenText("");

    if (window.speechSynthesis) window.speechSynthesis.cancel();

    clearAmbientTimers();
    pauseAmbientAudio(true);
    pushEvent("Uplink getrennt.", "Uplink severed.");
  };

  const sendQuery = (queryOverride) => {
    const socket = wsRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      pushEvent("Kein Backend-Uplink.", "No backend uplink.");
      return;
    }

    const cleanQuery = (queryOverride ?? queryText).trim();
    const cleanBarcode = barcodeText.trim();
    if (!cleanQuery && !cleanBarcode) return;

    setAppMode("analyzing");
    setAgentState("processing");

    socket.send(
      JSON.stringify({
        type: "user_query",
        text: cleanQuery,
        barcode: cleanBarcode,
        domain
      })
    );

    pushEvent(
      cleanQuery ? `Transmitting query: ${cleanQuery}` : `Transmitting code: ${cleanBarcode}`,
      cleanQuery ? `Transmitting query: ${cleanQuery}` : `Transmitting code: ${cleanBarcode}`
    );

    if (!queryOverride) setQueryText("");
  };

  const toggleVoiceInput = () => {
    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      pushEvent("Audio-Eingabe nicht unterstuetzt.", "Audio input unsupported.");
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
      pushEvent("Audio-Erfassung fehlgeschlagen.", "Audio capture failed.");
    };
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim() || "";
      if (!transcript) return;
      setQueryText(transcript);
      sendQuery(transcript);
      pushEvent(`Audio decodiert: ${transcript}`, `Audio decoded: ${transcript}`);
    };

    speechRecognitionRef.current = recognition;
    recognition.start();
  };

  const triggerBargeIn = () => {
    const socket = wsRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify({ type: "barge_in" }));

    if (window.speechSynthesis) window.speechSynthesis.cancel();

    setAgentState("interrupted");
    setSpokenText(language === "de" ? "System unterbrochen." : "System halted.");

    window.clearTimeout(speakingResetTimerRef.current);
    speakingResetTimerRef.current = window.setTimeout(() => {
      setAgentState("listening");
      setSpokenText("");
    }, 500);

    pushEvent("Barge-in command transmitted.", "Barge-in command transmitted.");
  };

  useEffect(() => {
    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    setVoiceSupported(Boolean(SpeechRecognitionCtor));

    const ambient = new Audio("/Echoes_of_the_Neon_Garden.mp3");
    ambient.preload = "auto";
    ambientAudioRef.current = ambient;

    const unlockAudio = async () => {
      const audio = ambientAudioRef.current;
      if (!audio) return;
      try {
        audio.volume = 0.001;
        await audio.play();
        audio.pause();
        audio.currentTime = 0;
      } catch {
        // ignore browser autoplay policy
      }
      setAudioUnlocked(true);
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
      window.removeEventListener("touchstart", unlockAudio);
    };

    window.addEventListener("pointerdown", unlockAudio);
    window.addEventListener("keydown", unlockAudio);
    window.addEventListener("touchstart", unlockAudio);

    return () => {
      stopCamera();
      closeSocket();
      if (speechRecognitionRef.current) speechRecognitionRef.current.stop();
      window.clearTimeout(speakingResetTimerRef.current);
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      clearAmbientTimers();
      pauseAmbientAudio(true);
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
      window.removeEventListener("touchstart", unlockAudio);
      ambientAudioRef.current = null;
    };
  }, []);

  useEffect(() => {
    clearAmbientTimers();
    if (musicBlocked) {
      pauseAmbientAudio();
      return;
    }

    playAmbientBit();
    ambientLoopRef.current = window.setInterval(() => {
      playAmbientBit();
    }, 12000);

    return () => {
      clearAmbientTimers();
    };
  }, [musicBlocked]);

  useEffect(() => {
    if (!hasLiveHud) return;
    const liveName = String(hud.product_identity?.name || "").toLowerCase();
    const idx = DEMO_PRODUCTS.findIndex((product) =>
      liveName.includes(product.name.toLowerCase())
    );
    if (idx >= 0 && idx !== demoIndex) setDemoIndex(idx);
  }, [hasLiveHud, hud.product_identity?.name, demoIndex]);

  return (
    <div className="nv-app anim-focus">
      <header className="nv-topbar anim-slide-up d-1">
        <div className="nv-brand">
          <div className="nv-logo-box">
            <Camera size={14} />
          </div>
          <div className="nv-brand-copy">
            <p className="nv-kicker">NUTRIVISION LIVE AGENT</p>
            <p className="nv-title">Realtime Copilot Console</p>
          </div>
        </div>

        <nav className="nv-nav-links">
          <a href="#scanner">Scanner</a>
          <a href="#features">Features</a>
          <a href="#workflow">How It Works</a>
          <a href="#trust">Trust</a>
        </nav>

        <div className="nv-actions">
          <a href="#" className="nv-btn nv-btn-dark">
            <Github size={14} />
            Repo
          </a>
          <a href="#demo" className="nv-btn nv-btn-primary">
            <Play size={14} />
            Demo
          </a>

          <div className="nv-select-wrap">
            <Globe size={13} />
            <select
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
              aria-label="Language"
            >
              <option value="de">{userLanguageLabel("de")}</option>
              <option value="en">{userLanguageLabel("en")}</option>
            </select>
          </div>

          <div className="nv-select-wrap nv-domain">
            <AudioLines size={13} />
            <select
              value={domain}
              onChange={(event) => setDomain(event.target.value)}
              aria-label="Domain"
            >
              <option value="food">Food</option>
              <option value="beauty">Cosmetics</option>
            </select>
          </div>

          <div className={`nv-status-badge ${wsStatus === "connected" ? "is-online" : "is-offline"}`}>
            {wsStatus === "connected" ? "ONLINE" : "OFFLINE"}
          </div>
        </div>
      </header>

      <main id="scanner" className="nv-main">
        <section className="nv-grid">
          <div className="nv-left-col">
            <article className="nv-camera-card anim-slide-up d-2">
              <video ref={videoRef} autoPlay playsInline muted className="nv-video" />
              <canvas ref={canvasRef} className="nv-hidden-canvas" />

              <div className="nv-camera-overlay" />
              <div className="nv-camera-grid" />

              <div className="nv-center-lockup">
                <div className="nv-reticle">
                  <ScanLine size={20} />
                </div>
                <p>{sessionLive ? "LIVE UPLINK" : "KAMERA OFFLINE"}</p>
                <button
                  type="button"
                  className="nv-session-btn"
                  onClick={sessionLive ? stopSession : startSession}
                >
                  <Play size={14} />
                  {sessionLive ? "SESSION STOPPEN" : "SESSION STARTEN"}
                </button>
              </div>
            </article>

            <article className="nv-command-dock anim-slide-up d-3">
              <input
                type="text"
                value={queryText}
                onChange={(event) => setQueryText(event.target.value)}
                placeholder={language === "de" ? "Frage stellen..." : "Ask a question..."}
                onKeyDown={(event) => {
                  if (event.key === "Enter") sendQuery();
                }}
              />

              <input
                type="text"
                value={barcodeText}
                onChange={(event) => setBarcodeText(event.target.value)}
                placeholder="BARCODE"
                onKeyDown={(event) => {
                  if (event.key === "Enter") sendQuery();
                }}
              />

              <button
                type="button"
                className={`nv-icon-btn ${voiceListening ? "is-active" : ""}`}
                onClick={toggleVoiceInput}
                disabled={!voiceSupported}
                title="Voice input"
              >
                {voiceListening ? <Mic size={14} /> : <MicOff size={14} />}
              </button>

              <button
                type="button"
                className="nv-icon-btn"
                onClick={triggerBargeIn}
                disabled={!sessionLive}
                title="Barge in"
              >
                <Circle size={14} />
              </button>

              <button type="button" className="nv-send-btn" onClick={() => sendQuery()}>
                <SendIcon />
                SENDEN
              </button>
            </article>
          </div>

          <aside className="nv-right-col">
            <article className="nv-panel anim-slide-right d-2">
              <header>
                <span>
                  <Volume2 size={12} />
                  SPRACHANTWORT
                </span>
                <span className="nv-live-chip">LIVE</span>
              </header>

              <div className="nv-panel-blank">
                <Eye size={20} />
                <p>{speechPanelText}</p>
              </div>

              <footer>
                <Info size={12} />
                Hinweis: Nur zu Informationszwecken. Keine medizinische Beratung. Bei Allergien/Erkrankungen bitte Arzt:in fragen.
              </footer>
            </article>

            <article className="nv-panel anim-slide-right d-3">
              <header>
                <span>
                  <Shield size={12} />
                  WARNHINWEISE
                </span>
              </header>
              <div className="nv-warning-box">{warningText}</div>
            </article>

            <article className="nv-panel anim-slide-right d-4">
              <header>
                <span>
                  <AudioLines size={12} />
                  4-BAR ANALYSE
                </span>
              </header>

              <div className="nv-metric-list">
                {analysisRows.map((row, index) => (
                  <div key={`${row.label}-${index}`} className="nv-metric-row">
                    <span>{row.label}</span>
                    <span>{sessionLive ? `${Math.round(row.score)}%` : "-"}</span>
                    {sessionLive && <i className={`nv-mini-bar ${scoreTone(row.score)}`} style={{ width: `${row.score}%` }} />}
                  </div>
                ))}
              </div>
            </article>

            <article className="nv-panel nv-log-panel anim-slide-right d-5">
              <header>
                <span>
                  <AudioLines size={12} />
                  SYSTEMPROTOKOLL
                </span>
              </header>
              <div className="nv-log-body">
                {events.slice(0, 6).map((evt) => (
                  <p key={evt.id}>
                    [{evt.time}] <strong>{language === "de" ? evt.de : evt.en}</strong>
                  </p>
                ))}
              </div>
            </article>
          </aside>
        </section>
      </main>

      <section id="features" className="nv-landing reveal-up d-4">
        <div className="nv-landing-inner">
          <span className="nv-chip">HACKATHON CHECKLIST</span>
          <h2>Status & Business Requirements</h2>
          <p>
            Live scanner shell, multilingual interaction, spoken verdict surface, warnings, and low-volume ambient music with speaking pause.
          </p>

          <div className="nv-check-grid">
            {checklist.map((item) => (
              <article key={item.label} className="nv-check-card">
                <p>{item.label}</p>
                <strong className={item.ok ? "ok" : "warn"}>{item.value}</strong>
              </article>
            ))}
          </div>

          <div className="nv-warning-tags">
            {(hasLiveHud ? warningRows : selectedDemo.warnings).slice(0, 3).map((warning) => (
              <span key={warning}>
                <AlertTriangle size={12} />
                {warning}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section id="workflow" className="nv-landing reveal-up d-5">
        <div className="nv-landing-inner">
          <span className="nv-chip">WORKFLOW</span>
          <h2>Scan to Verdict in Under Two Seconds</h2>
          <p>
            Camera uplink, AI identification, spoken reasoning, and warning analysis are synced for live demo scoring and business clarity.
          </p>
          <div className="nv-flow-grid">
            <article>
              <h3>1. Point & Scan</h3>
              <p>Start session and capture barcode or product image.</p>
            </article>
            <article>
              <h3>2. AI Identifies</h3>
              <p>Multimodal backend classifies product and risk signals.</p>
            </article>
            <article>
              <h3>3. Spoken Verdict</h3>
              <p>Agent responds with concise, interruptible guidance.</p>
            </article>
          </div>
        </div>
      </section>

      <section id="trust" className="nv-landing reveal-up d-6" aria-label="Trust section">
        <div className="nv-landing-inner">
          <span className="nv-chip">TRUST</span>
          <h2>Built for Hackathon + Real Business Use</h2>
          <p>
            Conservative language, transparent warnings, real-time controls, and clear audit logs for demo judges and stakeholders.
          </p>
        </div>
      </section>

      <section id="demo" className="nv-landing nv-cta reveal-up d-6">
        <div className="nv-landing-inner">
          <span className="nv-chip">HACKATHON SUBMISSION</span>
          <h2>Watch the Live Demo</h2>
          <p>
            See NutriVision analyze products in real-time with barcode scanning, speech interaction, and HUD-style monitoring.
          </p>
          <div className="nv-cta-actions">
            <a href="#" className="nv-btn nv-btn-primary">
              <Play size={14} />
              Watch Demo Video
            </a>
            <a href="#" className="nv-btn nv-btn-dark">
              <Github size={14} />
              View Repository
            </a>
          </div>
        </div>
      </section>

      <footer className="nv-footer">
        <span>NutriVision</span>
        <span>Built for the Gemini Live Agent Challenge · Powered by Google Cloud</span>
      </footer>
    </div>
  );
}
