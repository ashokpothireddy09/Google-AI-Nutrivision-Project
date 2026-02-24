import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  AudioLines,
  BarChart,
  Brain,
  Camera,
  ChevronDown,
  ChevronRight,
  Cloud,
  CloudCog,
  Cpu,
  Eye,
  FlaskConical,
  Focus,
  Github,
  Globe,
  Info,
  Layers,
  LayoutDashboard,
  Lock,
  Mic,
  MicOff,
  Pause,
  Play,
  Scale,
  Scan,
  ScanBarcode,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sparkles,
  StopCircle,
  Volume2,
  Zap
} from "lucide-react";

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

const TECH_STACK = [
  { icon: Cpu, label: "Gemini Multimodal", sublabel: "Live Agent" },
  { icon: CloudCog, label: "Google Cloud Run", sublabel: "Backend" },
  { icon: Layers, label: "GenAI SDK", sublabel: "Streaming" },
  { icon: Smartphone, label: "Mobile-First", sublabel: "PWA" }
];

const LANDING_FEATURES = [
  {
    icon: Scan,
    title: "Barcode-First ID",
    description: "Instant product identification with intelligent fallback to visual search.",
    stat: "1.5s",
    statLabel: "latency"
  },
  {
    icon: Mic,
    title: "Voice Interaction",
    description: "Zero-typing interface with interruptible spoken verdicts and natural follow-ups.",
    stat: "300ms",
    statLabel: "barge-in"
  },
  {
    icon: Eye,
    title: "HUD Overlay",
    description: "Real-time heads-up display with warning chips and 4-bar analysis in camera view.",
    stat: "4-bar",
    statLabel: "analysis"
  },
  {
    icon: Zap,
    title: "Live Agent",
    description: "Gemini multimodal AI for real-time, context-aware product guidance.",
    stat: "Live",
    statLabel: "streaming"
  },
  {
    icon: ShieldCheck,
    title: "Allergen Alerts",
    description: "Conservative, medically-phrased warnings for allergens and restricted ingredients.",
    stat: "5-tier",
    statLabel: "verdicts"
  },
  {
    icon: FlaskConical,
    title: "Cosmetics Beta",
    description: "INCI parsing, fragrance allergen flags, surfactant and microplastics screening.",
    stat: "Beta",
    statLabel: "expanding"
  }
];

const WORKFLOW_STEPS = [
  {
    icon: ScanBarcode,
    title: "Point & Scan",
    description: "Aim your camera at any product barcode or packaging. Auto-detection in under a second.",
    accent: "bg-[#00d7c8]/12 border-[#00d7c8]/35 text-[#00d7c8]"
  },
  {
    icon: Brain,
    title: "AI Identifies",
    description: "Gemini processes the image, identifies the product, and retrieves grounded ingredient data.",
    accent: "bg-[#4fd18f]/12 border-[#4fd18f]/35 text-[#4fd18f]"
  },
  {
    icon: AudioLines,
    title: "Spoken Verdict",
    description: "Receive a concise spoken assessment. Interrupt anytime with natural follow-ups.",
    accent: "bg-[#d1b167]/12 border-[#d1b167]/35 text-[#d1b167]"
  },
  {
    icon: LayoutDashboard,
    title: "HUD Analysis",
    description: "Warning chips and 4-bar analysis overlay in real-time for a complete health snapshot.",
    accent: "bg-[#7ea9c5]/12 border-[#7ea9c5]/35 text-[#7ea9c5]"
  }
];

const TRUST_PILLARS = [
  {
    icon: ShieldCheck,
    title: "Medical Phrasing",
    description:
      "Conservative, medically-responsible language. Clear distinction between informational guidance and medical advice."
  },
  {
    icon: Scale,
    title: "5-Tier Classification",
    description: "Authorized, restricted, warning required, not authorized, or uncertain. Never ambiguous."
  },
  {
    icon: Cloud,
    title: "Cloud-Native",
    description:
      "Google Cloud Run for production-grade reliability, Gemini multimodal AI powering every analysis."
  },
  {
    icon: Lock,
    title: "Privacy First",
    description: "Camera feeds processed in real-time and never stored. Shopping data stays on your device."
  }
];

const CTA_KPIS = [
  { value: "1.5s", label: "Barcode Latency" },
  { value: "300ms", label: "Barge-in Pivot" },
  { value: "85%+", label: "Identification" },
  { value: "3/3", label: "Stability Runs" }
];

const INITIAL_HUD = {
  product_identity: {
    id: "unknown",
    name: "Awaiting target...",
    brand: "SYSTEM STANDBY"
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

function pick(language, value) {
  return language === "de" ? value.de : value.en;
}

function backendWsUrl() {
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  return `${protocol}://${window.location.hostname}:8000/ws/live`;
}

function agentLabel(language, agentState) {
  const labels = {
    connecting: { de: "Uplink...", en: "Uplink..." },
    processing: { de: "Analysiert...", en: "Processing..." },
    speaking: { de: "Audio Out", en: "Audio Out" },
    interrupted: { de: "Halted", en: "Halted" },
    listening: { de: "Active", en: "Active" },
    disconnected: { de: "Offline", en: "Offline" }
  };
  return labels[agentState] ? pick(language, labels[agentState]) : "Offline";
}

function HUDCorner({ position, active }) {
  const base = "absolute h-6 w-6 transition-all duration-500";
  const tone = active ? "border-[#7ea9c5]" : "border-[#4b5563]/30";
  const map = {
    tl: `${base} top-4 left-4 border-t-2 border-l-2 rounded-tl-md ${tone}`,
    tr: `${base} top-4 right-4 border-t-2 border-r-2 rounded-tr-md ${tone}`,
    bl: `${base} bottom-4 left-4 border-b-2 border-l-2 rounded-bl-md ${tone}`,
    br: `${base} bottom-4 right-4 border-b-2 border-r-2 rounded-br-md ${tone}`
  };
  return <div className={map[position]} />;
}

function getWarningTone(category) {
  if (category === "not_authorized") {
    return {
      chip: "bg-[#be5b47]/15 border-[#be5b47]/40 text-[#f5b9ab]",
      row: "bg-[#be5b47]/8 border-[#be5b47]/30",
      text: "text-[#f2d0c7]"
    };
  }
  if (category === "restricted" || category === "warning_required" || category === "uncertain") {
    return {
      chip: "bg-[#c7a66a]/18 border-[#c7a66a]/40 text-[#ecd4ac]",
      row: "bg-[#c7a66a]/8 border-[#c7a66a]/30",
      text: "text-[#ead9b8]"
    };
  }
  return {
    chip: "bg-[#6c8b70]/18 border-[#6c8b70]/35 text-[#d6e6d8]",
    row: "bg-[#6c8b70]/8 border-[#6c8b70]/25",
    text: "text-[#d7e5d8]"
  };
}

function metricColor(band) {
  if (band === "high" || band === "good") return "bg-[#6c8b70]";
  if (band === "medium") return "bg-[#c7a66a]";
  if (band === "low" || band === "bad") return "bg-[#be5b47]";
  return "bg-[#7ea9c5]";
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
      de: "System initialisiert. Warte auf Video-Uplink.",
      en: "System initialized. Awaiting video uplink."
    }
  ]);

  const confidencePercent = useMemo(
    () => Math.round((hud.confidence || 0) * 100),
    [hud.confidence]
  );
  const confidenceLow = (hud.confidence || 0) < 0.65;
  const musicBlocked = !sessionLive || agentState === "speaking" || agentState === "processing";

  const uiPhase = useMemo(() => {
    if (!sessionLive) return "idle";
    if (appMode === "analyzing") return "analyzing";
    if (appMode === "active_scan") return "scanning";
    return "result";
  }, [sessionLive, appMode]);

  const statusClasses = useMemo(() => {
    if (agentState === "speaking") return "text-[#c27d65] border-[#c27d65]/35 bg-[#c27d65]/10";
    if (agentState === "processing") return "text-[#7ea9c5] border-[#7ea9c5]/35 bg-[#7ea9c5]/10";
    if (agentState === "interrupted") return "text-[#c7a66a] border-[#c7a66a]/35 bg-[#c7a66a]/10";
    if (agentState === "listening") return "text-[#7a8b76] border-[#7a8b76]/35 bg-[#7a8b76]/10";
    return "text-[#a6adb3] border-[#3a4652] bg-[#0f1419]";
  }, [agentState]);

  const metricRows = useMemo(() => {
    const base = Array.isArray(hud.metrics) ? hud.metrics.slice(0, 4) : [];
    const rows = base.map((metric) => ({
      name: metric.name || "Metric",
      value: metric.value ?? "-",
      score: Math.min(Math.max(metric.score || 0, 0), 100),
      band: metric.band || "neutral"
    }));
    while (rows.length < 4) {
      rows.push({
        name: language === "de" ? `Metrik ${rows.length + 1}` : `Metric ${rows.length + 1}`,
        value: "-",
        score: 0,
        band: "neutral"
      });
    }
    return rows;
  }, [hud.metrics, language]);

  const pushEvent = (de, en) => {
    eventId.current += 1;
    setEvents((prev) =>
      [{ id: eventId.current, time: formatClock(), de, en }, ...prev].slice(0, 15)
    );
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
    if (recorder && recorder.state !== "inactive") recorder.stop();
    mediaRecorderRef.current = null;
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

    audio.volume = 0.08;
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
    }, 5200);
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
          clearUncertainState();
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
          setUncertainText(data.message || "Unclear target.");
          const candidates = Array.isArray(data.details?.candidates)
            ? data.details.candidates
            : [];
          setUncertainCandidates(candidates);
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
      clearUncertainState();
      setSpokenText("");
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
    clearUncertainState();
    setHud(INITIAL_HUD);
    setSpokenText("");
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    clearAmbientTimers();
    pauseAmbientAudio(true);
    pushEvent("Uplink getrennt.", "Uplink severed.");
  };

  const toggleSession = () => (sessionLive ? stopSession() : startSession());

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
      cleanQuery ? `Transmitting query: ${cleanQuery}` : `Transmitting code: ${cleanBarcode}`,
      cleanQuery ? `Transmitting query: ${cleanQuery}` : `Transmitting code: ${cleanBarcode}`
    );
    if (!queryOverride) setQueryText("");
  };

  const sendCandidateSelection = (candidateName) => {
    setQueryText(candidateName);
    sendQuery(candidateName);
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

    return () => {
      stopCamera();
      closeSocket();
      if (speechRecognitionRef.current) speechRecognitionRef.current.stop();
      window.clearTimeout(speakingResetTimerRef.current);
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      clearAmbientTimers();
      pauseAmbientAudio(true);
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
  }, [musicBlocked, sessionLive, agentState, voiceListening]);

  const showResultPanel = sessionLive && (appMode === "hud_active" || appMode === "analyzing" || Boolean(spokenText));

  return (
    <div className="anim-focus min-h-screen bg-[#0a0d12] text-[#e8edf0]">
      <header className="anim-slide-up d-1 sticky top-0 z-30 border-b border-[#2a3440] bg-[#0a0d12]/90 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-md border border-[#3a4652] bg-[#111922]">
              <Camera className="h-4 w-4 text-[#98b8cf]" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#8b97a3]">NutriVision Live Agent</p>
              <p className="text-sm font-semibold text-[#d7e1e9]">Realtime Copilot Console</p>
            </div>
          </div>

          <div className="hidden items-center gap-5 text-xs font-medium text-[#81919e] lg:flex">
            <span className="cursor-default transition-colors hover:text-[#d7e1e9]">Scanner</span>
            <span className="cursor-default transition-colors hover:text-[#d7e1e9]">Features</span>
            <span className="cursor-default transition-colors hover:text-[#d7e1e9]">How It Works</span>
            <span className="cursor-default transition-colors hover:text-[#d7e1e9]">Trust</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href="#"
              className="hidden items-center gap-1.5 rounded-md border border-[#2f3b48] bg-[#0c1118] px-3 py-1.5 text-xs font-semibold text-[#d1dae1] transition-colors hover:border-[#4a5968] hover:bg-[#141c25] sm:inline-flex"
            >
              <Github className="h-3.5 w-3.5" />
              Repo
            </a>
            <a
              href="#demo"
              className="hidden items-center gap-1.5 rounded-md border border-[#00d7c8]/50 bg-[#00d7c8] px-3 py-1.5 text-xs font-semibold text-[#031414] transition-colors hover:bg-[#09c8bc] sm:inline-flex"
            >
              <Play className="h-3.5 w-3.5" />
              Demo
            </a>
            <label className="rounded-md border border-[#2f3b48] bg-[#10161d] px-2 py-1 text-xs text-[#a9b3bb]">
              <Globe className="mr-1 inline h-3 w-3" />
              <select
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
                className="bg-transparent outline-none"
              >
                <option value="de" className="bg-[#10161d]">DE</option>
                <option value="en" className="bg-[#10161d]">EN</option>
              </select>
            </label>

            <label className="rounded-md border border-[#2f3b48] bg-[#10161d] px-2 py-1 text-xs text-[#a9b3bb]">
              <BarChart className="mr-1 inline h-3 w-3" />
              <select
                value={domain}
                onChange={(event) => setDomain(event.target.value)}
                className="bg-transparent outline-none"
              >
                <option value="food" className="bg-[#10161d]">Food</option>
                <option value="beauty" className="bg-[#10161d]">Cosmetics Beta</option>
              </select>
            </label>

            <div className={`rounded-md border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.17em] ${statusClasses}`}>
              {agentLabel(language, agentState)}
            </div>
          </div>
        </div>
      </header>

      <main
        id="scanner"
        className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 md:px-6 md:py-5 lg:flex-row lg:gap-6"
      >
        <section className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="anim-slide-up d-2 relative min-h-[500px] overflow-hidden rounded-2xl border border-[#2a3440] bg-[#0f141b] lg:min-h-[620px]">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`absolute inset-0 h-full w-full object-cover transition-all duration-700 ${sessionLive ? "opacity-100" : "opacity-0"}`}
            />
            <canvas ref={canvasRef} className="hidden" />

            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,#131c26_0%,#0b1017_85%)]" />
            <div
              className="absolute inset-0 opacity-[0.06]"
              style={{
                backgroundImage:
                  "linear-gradient(#7ea9c5 1px, transparent 1px), linear-gradient(90deg, #7ea9c5 1px, transparent 1px)",
                backgroundSize: "48px 48px"
              }}
            />
            <div className="absolute inset-0 bg-black/35" />

            <HUDCorner position="tl" active={sessionLive} />
            <HUDCorner position="tr" active={sessionLive} />
            <HUDCorner position="bl" active={sessionLive} />
            <HUDCorner position="br" active={sessionLive} />

            {(uiPhase === "scanning" || uiPhase === "analyzing") && (
              <div className="pointer-events-none absolute inset-x-6 inset-y-6 overflow-hidden rounded-xl">
                <div className="absolute left-0 right-0 h-px animate-scanline bg-[#7ea9c5]/70 shadow-[0_0_20px_4px_rgba(126,169,197,0.35)]" />
              </div>
            )}

            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div
                className={`anim-reticle relative transition-all duration-700 ${
                  uiPhase === "scanning"
                    ? "h-36 w-36 md:h-44 md:w-44"
                    : uiPhase === "analyzing"
                      ? "h-28 w-28 md:h-32 md:w-32"
                      : uiPhase === "result"
                        ? "h-20 w-20 md:h-24 md:w-24 opacity-60"
                        : "h-32 w-32 md:h-40 md:w-40"
                }`}
              >
                <div className={`absolute inset-0 rounded-full border ${uiPhase === "idle" ? "border-[#5a6570]/25" : "border-[#7ea9c5]/50"}`} />
                <div className={`absolute inset-3 rounded-full border ${uiPhase === "idle" ? "border-[#5a6570]/15" : "border-[#7ea9c5]/30"}`} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className={`h-1.5 w-1.5 rounded-full ${uiPhase === "idle" ? "bg-[#5a6570]/50" : "bg-[#7ea9c5]"}`} />
                </div>
                <div className={`absolute left-1/2 top-0 h-4 w-px -translate-x-1/2 ${uiPhase === "idle" ? "bg-[#5a6570]/25" : "bg-[#7ea9c5]/35"}`} />
                <div className={`absolute bottom-0 left-1/2 h-4 w-px -translate-x-1/2 ${uiPhase === "idle" ? "bg-[#5a6570]/25" : "bg-[#7ea9c5]/35"}`} />
                <div className={`absolute left-0 top-1/2 h-px w-4 -translate-y-1/2 ${uiPhase === "idle" ? "bg-[#5a6570]/25" : "bg-[#7ea9c5]/35"}`} />
                <div className={`absolute right-0 top-1/2 h-px w-4 -translate-y-1/2 ${uiPhase === "idle" ? "bg-[#5a6570]/25" : "bg-[#7ea9c5]/35"}`} />
              </div>
            </div>

            <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between p-4">
              <div className="rounded-lg border border-[#324050] bg-[#0f141b]/80 px-3 py-1.5 backdrop-blur-md">
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#d4e1ea]">
                  {uiPhase === "idle"
                    ? "Ready"
                    : uiPhase === "scanning"
                      ? "Scanning"
                      : uiPhase === "analyzing"
                        ? "Analyzing"
                        : "Complete"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleVoiceInput}
                  disabled={!voiceSupported || !sessionLive}
                  className={`flex h-8 w-8 items-center justify-center rounded-md border ${
                    voiceListening
                      ? "border-[#c27d65]/40 bg-[#c27d65]/20 text-[#efcebf]"
                      : "border-[#324050] bg-[#0f141b]/80 text-[#8f9ba6]"
                  } disabled:opacity-40`}
                >
                  <span className={voiceListening ? "pulse-mic rounded-full p-0.5" : ""}>
                    {voiceListening ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
                  </span>
                </button>
                <div className="rounded-md border border-[#324050] bg-[#0f141b]/80 px-2 py-1 backdrop-blur-md">
                  <span className="text-[10px] font-mono text-[#93a3af]">
                    {voiceListening ? (language === "de" ? "Aufnahme" : "Listening") : language === "de" ? "Stumm" : "Muted"}
                  </span>
                </div>
              </div>
            </div>

            {!sessionLive && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#090d13]/75 backdrop-blur-sm">
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-[#324050] bg-[#111922]">
                  <Focus className="h-6 w-6 text-[#87929d]" />
                </div>
                <p className="mb-5 text-xs uppercase tracking-[0.2em] text-[#95a2ad]">
                  {language === "de" ? "Kamera offline" : "Camera offline"}
                </p>
                <button
                  type="button"
                  onClick={toggleSession}
                  className="inline-flex items-center gap-2 rounded-md border border-[#7ea9c5]/40 bg-[#7ea9c5]/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#d6e7f2]"
                >
                  <Play className="h-3.5 w-3.5" />
                  {language === "de" ? "Session starten" : "Start session"}
                </button>
              </div>
            )}

            {uiPhase === "idle" && sessionLive && (
              <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center">
                <div className="mt-40 flex flex-col items-center gap-3">
                  <ScanBarcode className="h-7 w-7 text-[#6f7b87]/50" />
                  <p className="text-xs font-mono text-[#7f8a95]">
                    {language === "de" ? "Produkt in den Fokus halten" : "Point at a product to scan"}
                  </p>
                </div>
              </div>
            )}

            {uiPhase === "analyzing" && (
              <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center">
                <div className="mt-32 flex flex-col items-center gap-3">
                  <Sparkles className="h-6 w-6 animate-spin text-[#7ea9c5]" />
                  <p className="text-xs font-mono tracking-wider text-[#9fc0d7]">
                    {language === "de" ? "Gemini analysiert..." : "Gemini analyzing..."}
                  </p>
                </div>
              </div>
            )}

            {appMode === "uncertain_match" && (
              <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#090d13]/80 p-4 backdrop-blur-sm">
                <div className="w-full max-w-md rounded-xl border border-[#c7a66a]/40 bg-[#10161d] p-5 shadow-2xl">
                  <div className="mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-[#e0c996]" />
                    <h3 className="text-[11px] uppercase tracking-[0.15em] text-[#e0c996]">
                      {language === "de" ? "Unklare Zuordnung" : "Unclear match"}
                    </h3>
                  </div>
                  <p className="mb-4 text-sm text-[#d8e1e9]">
                    {uncertainText || (language === "de" ? "Bitte Produkt spezifizieren." : "Please specify the product.")}
                  </p>
                  <div className="max-h-52 space-y-2 overflow-y-auto custom-scrollbar">
                    {uncertainCandidates.map((candidate, index) => (
                      <button
                        key={`${candidate.name || "candidate"}-${index}`}
                        type="button"
                        onClick={() => sendCandidateSelection(candidate.name || "")}
                        className="flex w-full items-center justify-between rounded-md border border-[#304050] bg-[#0b1118] px-3 py-2 text-left hover:border-[#c7a66a]/40 hover:bg-[#c7a66a]/10"
                      >
                        <span className="truncate pr-4 text-sm text-[#e3ebf2]">
                          {candidate.name || `${language === "de" ? "Option" : "Option"} ${index + 1}`}
                        </span>
                        <ChevronRight className="h-4 w-4 text-[#c7a66a]" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div
              className={`absolute bottom-0 inset-x-0 z-20 transition-all duration-700 ease-out ${
                showResultPanel ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
              }`}
            >
              <div className="rounded-t-2xl border-x border-t border-[#2d3946] bg-[#0f151d]/90 p-4 backdrop-blur-xl md:p-5">
                <div className="mb-3 flex items-center gap-3">
                  <div className="rounded-full border border-[#324050] bg-[#121b25] px-2.5 py-1">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#a7b8c5]">
                      {hud.grade_or_tier || "-"}
                    </span>
                  </div>
                  <span className="truncate text-sm font-semibold text-[#e3ecf3]">
                    {hud.product_identity?.name || (language === "de" ? "Warte auf Ziel" : "Awaiting target")}
                  </span>
                  <span className="ml-auto text-[10px] font-mono text-[#9baab6]">{confidencePercent}%</span>
                </div>

                <div className="mb-3 grid grid-cols-2 gap-x-6 gap-y-2.5">
                  {metricRows.map((bar, idx) => (
                    <div key={`${bar.name}-${idx}`}>
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-[10px] uppercase tracking-wider text-[#8b98a4]">{bar.name}</span>
                        <span className="text-[10px] font-mono font-bold text-[#dbe7ef]">{bar.value}</span>
                      </div>
                      <div className="h-[3px] overflow-hidden bg-[#28303a]">
                        <div
                          className={`metric-fill-anim h-full transition-all duration-700 ${metricColor(bar.band)}`}
                          style={{ "--target-width": `${bar.score}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {(hud.warnings || []).length === 0 ? (
                    <span className="rounded-full border border-[#6c8b70]/35 bg-[#6c8b70]/12 px-2 py-1 text-[10px] text-[#d5e6d8]">
                      <ShieldCheck className="mr-1 inline h-3 w-3" />
                      {language === "de" ? "Keine Warnung" : "No warning"}
                    </span>
                  ) : (
                    (hud.warnings || []).map((warning, index) => {
                      const tone = getWarningTone(warning.category);
                      return (
                        <span
                          key={`${warning.category}-${index}`}
                          className={`rounded-full border px-2 py-1 text-[10px] ${tone.chip}`}
                        >
                          <AlertTriangle className="mr-1 inline h-3 w-3" />
                          {CATEGORY_LABEL[warning.category] || warning.category}
                        </span>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="anim-slide-up d-3 rounded-xl border border-[#2a3440] bg-[#0f151d] p-2">
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <input
                type="text"
                value={queryText}
                onChange={(event) => setQueryText(event.target.value)}
                placeholder={language === "de" ? "Frage stellen..." : "Ask a question..."}
                onKeyDown={(event) => event.key === "Enter" && sendQuery()}
                className="h-10 flex-1 rounded-md border border-[#324050] bg-[#0c1118] px-3 text-sm text-[#deebf4] placeholder:text-[#7d8a96] outline-none focus:border-[#7ea9c5]"
              />
              <input
                type="text"
                value={barcodeText}
                onChange={(event) => setBarcodeText(event.target.value)}
                placeholder="Barcode"
                onKeyDown={(event) => event.key === "Enter" && sendQuery()}
                className="h-10 w-full rounded-md border border-[#324050] bg-[#0c1118] px-3 text-xs font-mono uppercase tracking-[0.1em] text-[#b7c4ce] placeholder:text-[#6f7b87] outline-none focus:border-[#7ea9c5] md:w-40"
              />
              <div className="flex items-center gap-2 md:ml-1">
                <button
                  type="button"
                  onClick={toggleVoiceInput}
                  disabled={!voiceSupported || !sessionLive}
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-md border ${
                    voiceListening
                      ? "border-[#c27d65]/45 bg-[#c27d65]/20 text-[#f0cfbf]"
                      : "border-[#324050] bg-[#0c1118] text-[#9aa7b2]"
                  } disabled:opacity-40`}
                  title={language === "de" ? "Spracheingabe" : "Voice input"}
                >
                  <Mic className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={triggerBargeIn}
                  disabled={!sessionLive}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-[#324050] bg-[#0c1118] text-[#9aa7b2] hover:border-[#c7a66a]/50 hover:text-[#dcc38e] disabled:opacity-40"
                  title={language === "de" ? "Unterbrechen" : "Interrupt"}
                >
                  <StopCircle className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={toggleSession}
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-md border ${
                    sessionLive
                      ? "border-[#be5b47]/40 bg-[#be5b47]/18 text-[#efc0b5]"
                      : "border-[#6c8b70]/40 bg-[#6c8b70]/15 text-[#cfe1d2]"
                  }`}
                  title={sessionLive ? "Stop session" : "Start session"}
                >
                  {sessionLive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </button>

                <button
                  type="button"
                  onClick={() => sendQuery()}
                  className="inline-flex h-10 items-center justify-center rounded-md border border-[#7ea9c5]/45 bg-[#7ea9c5]/18 px-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#d9e9f3]"
                >
                  {language === "de" ? "Senden" : "Send"}
                </button>
              </div>
            </div>
          </div>
        </section>

        <aside className="w-full lg:w-[360px] xl:w-[390px]">
          <div className="flex max-h-[calc(100vh-120px)] flex-col gap-4 overflow-y-auto pr-1 custom-scrollbar">
            <section className="anim-slide-right d-4 rounded-xl border border-[#2a3440] bg-[#0f151d]">
              <div className="border-b border-[#293542] px-4 py-3">
                <div className="flex items-center gap-2">
                  <Volume2 className="h-3.5 w-3.5 text-[#7ea9c5]" />
                  <span className="text-xs uppercase tracking-[0.15em] text-[#9fb0bc]">
                    {language === "de" ? "Sprachantwort" : "Spoken verdict"}
                  </span>
                  <span className="ml-auto rounded border border-[#6c8b70]/45 bg-[#6c8b70]/15 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.08em] text-[#d6e6d8]">
                    Live
                  </span>
                </div>
              </div>
              <div className="p-4">
                {appMode === "analyzing" ? (
                  <div className="flex items-center gap-2 py-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#7ea9c5] border-t-transparent" />
                    <span className="text-xs font-mono text-[#9eb0bd]">
                      {language === "de" ? "Verarbeite..." : "Processing..."}
                    </span>
                  </div>
                ) : spokenText ? (
                  <p className="text-sm leading-relaxed text-[#dde7ef]">{spokenText}</p>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Eye className="mb-2 h-6 w-6 text-[#6d7a87]/45" />
                    <p className="text-xs text-[#7c8996]">
                      {language === "de" ? "Scan starten fuer Live-Verlauf" : "Start scanning for live verdict"}
                    </p>
                  </div>
                )}

                <div className="mt-4 border-t border-[#2a3440] pt-3">
                  <p className="flex items-start gap-2 text-[10px] leading-relaxed text-[#8f9ca8]">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    Hinweis: Nur zu Informationszwecken. Keine medizinische Beratung. Bei Allergien/Erkrankungen bitte Arzt:in fragen.
                  </p>
                  {confidenceLow && sessionLive && (
                    <p className="mt-2 rounded-md border border-[#be5b47]/35 bg-[#be5b47]/12 px-2 py-1 text-[10px] uppercase tracking-[0.11em] text-[#e7b6ab]">
                      {language === "de"
                        ? "Konfidenz niedrig: Bitte Name oder Barcode bestaetigen."
                        : "Low confidence: confirm product name or barcode."}
                    </p>
                  )}
                </div>
              </div>
            </section>

            <section className="anim-slide-right d-5 rounded-xl border border-[#2a3440] bg-[#0f151d]">
              <div className="border-b border-[#293542] px-4 py-3">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-3.5 w-3.5 text-[#7ea9c5]" />
                  <span className="text-xs uppercase tracking-[0.15em] text-[#9fb0bc]">
                    {language === "de" ? "Warnhinweise" : "Warnings"}
                  </span>
                </div>
              </div>
              <div className="space-y-2 p-4">
                {(hud.warnings || []).length === 0 ? (
                  <div className="rounded-md border border-[#6c8b70]/30 bg-[#6c8b70]/10 px-3 py-2 text-xs text-[#d8e8db]">
                    <ShieldCheck className="mr-1.5 inline h-3.5 w-3.5" />
                    {language === "de" ? "Keine Warnungen erkannt" : "No warnings detected"}
                  </div>
                ) : (
                  (hud.warnings || []).map((warning, index) => {
                    const tone = getWarningTone(warning.category);
                    return (
                      <div key={`${warning.category}-${index}`} className={`rounded-md border px-3 py-2 ${tone.row}`}>
                        <p className="text-[10px] uppercase tracking-[0.12em] text-[#9fb0bc]">
                          {CATEGORY_LABEL[warning.category] || warning.category}
                        </p>
                        <p className={`mt-1 text-sm leading-snug ${tone.text}`}>{warning.label}</p>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            <section className="rounded-xl border border-[#2a3440] bg-[#0f151d]">
              <div className="border-b border-[#293542] px-4 py-3">
                <div className="flex items-center gap-2">
                  <BarChart className="h-3.5 w-3.5 text-[#7ea9c5]" />
                  <span className="text-xs uppercase tracking-[0.15em] text-[#9fb0bc]">
                    {language === "de" ? "4-Bar Analyse" : "4-bar analysis"}
                  </span>
                </div>
              </div>
              <div className="space-y-3 p-4">
                {metricRows.map((metric, index) => (
                  <div key={`${metric.name}-${index}`}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-[#94a3af]">{metric.name}</span>
                      <span className="font-mono text-[#d6e3ed]">{metric.value}</span>
                    </div>
                    <div className="h-[3px] overflow-hidden bg-[#27313b]">
                      <div className={`h-full ${metricColor(metric.band)}`} style={{ width: `${metric.score}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-[#2a3440] bg-[#0f151d]">
              <div className="border-b border-[#293542] px-4 py-3">
                <div className="flex items-center gap-2">
                  <Activity className="h-3.5 w-3.5 text-[#7ea9c5]" />
                  <span className="text-xs uppercase tracking-[0.15em] text-[#9fb0bc]">
                    {language === "de" ? "Systemprotokoll" : "System log"}
                  </span>
                </div>
              </div>
              <div className="h-40 overflow-y-auto p-4 font-mono text-[10px] custom-scrollbar">
                <ul className="space-y-2">
                  {events.map((eventItem, idx) => (
                    <li key={eventItem.id} className={idx === 0 ? "text-[#d7e5f0]" : "text-[#6f7f8d]"}>
                      <span className="mr-2 opacity-60">[{eventItem.time}]</span>
                      <span>{language === "de" ? eventItem.de : eventItem.en}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <section className="anim-slide-right d-6 rounded-xl border border-[#2a3440] bg-[#0f151d] p-3">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-base font-mono font-bold text-[#8eb2cb]">{wsStatus === "connected" ? "live" : wsStatus}</p>
                  <p className="text-[9px] uppercase tracking-[0.11em] text-[#7f8e9a]">WS</p>
                </div>
                <div>
                  <p className="text-base font-mono font-bold text-[#8eb2cb]">{confidencePercent}%</p>
                  <p className="text-[9px] uppercase tracking-[0.11em] text-[#7f8e9a]">confidence</p>
                </div>
                <div>
                  <p className="text-base font-mono font-bold text-[#8eb2cb]">{pick(language, DOMAIN_LABEL[domain])}</p>
                  <p className="text-[9px] uppercase tracking-[0.11em] text-[#7f8e9a]">domain</p>
                </div>
              </div>
            </section>
          </div>
        </aside>
      </main>

      <div className="flex justify-center pb-4">
        <ChevronDown className="h-4 w-4 animate-bounce text-[#556474]" />
      </div>

      <section className="border-y border-[#22303b]/50 py-10">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-8 px-4 md:gap-14 md:px-6">
          {TECH_STACK.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="flex items-center gap-2.5 text-[#8b99a6]">
                <Icon className="h-4 w-4 text-[#00d7c8]/70" />
                <div>
                  <p className="text-xs font-medium text-[#d5e1e9]">{item.label}</p>
                  <p className="text-[9px] text-[#6e7d8b]">{item.sublabel}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section id="features" className="py-18 md:py-24">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="mb-12 text-center">
            <span className="inline-flex rounded-full border border-[#00d7c8]/30 bg-[#00d7c8]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#00d7c8]">
              Capabilities
            </span>
            <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight text-[#ecf2f7] md:text-5xl">
              Precision Instrument for Everyday Decisions
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-[#8593a1]">
              Every feature calibrated for speed, accuracy, and clarity.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {LANDING_FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <article
                  key={feature.title}
                  className="rounded-2xl border border-[#22303b]/55 bg-[#0c131a] p-5 transition-all hover:border-[#00d7c8]/28 hover:shadow-[0_10px_30px_rgba(0,215,200,0.08)]"
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#00d7c8]/25 bg-[#00d7c8]/10">
                      <Icon className="h-4 w-4 text-[#00d7c8]" />
                    </div>
                    <div className="text-right">
                      <span className="text-3xl font-mono font-bold leading-none text-[#00d7c8]">
                        {feature.stat}
                      </span>
                      <p className="text-[9px] uppercase tracking-wider text-[#70808e]">{feature.statLabel}</p>
                    </div>
                  </div>
                  <h3 className="mb-2 text-xl font-semibold text-[#e8eff5]">{feature.title}</h3>
                  <p className="text-sm leading-relaxed text-[#8192a0]">{feature.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-18 md:py-24">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="mb-12 text-center">
            <span className="inline-flex rounded-full border border-[#00d7c8]/30 bg-[#00d7c8]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#00d7c8]">
              Workflow
            </span>
            <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight text-[#ecf2f7] md:text-5xl">
              Scan to Verdict in Under Two Seconds
            </h2>
          </div>

          <div className="relative">
            <div className="absolute bottom-0 left-5 top-0 w-px bg-[#22303b] md:left-1/2 md:-translate-x-1/2" />
            <div className="space-y-6 md:space-y-0">
              {WORKFLOW_STEPS.map((step, index) => {
                const Icon = step.icon;
                const even = index % 2 === 0;
                return (
                  <div
                    key={step.title}
                    className={`relative flex items-start gap-4 md:items-center ${even ? "md:flex-row" : "md:flex-row-reverse"}`}
                  >
                    <div className={`flex-1 md:px-12 ${even ? "md:text-right" : "md:text-left"}`}>
                      <article
                        className={`inline-block rounded-xl border border-[#22303b]/55 bg-[#0c131a] p-5 text-left md:max-w-md ${even ? "md:ml-auto" : "md:mr-auto"}`}
                      >
                        <h3 className="mb-1 text-lg font-semibold text-[#e8eff5]">{step.title}</h3>
                        <p className="text-sm leading-relaxed text-[#8293a1]">{step.description}</p>
                      </article>
                    </div>
                    <div className="relative z-10">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full border ${step.accent}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="hidden flex-1 md:block" />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section id="trust" className="py-18 md:py-24">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="mb-12 text-center">
            <span className="inline-flex rounded-full border border-[#00d7c8]/30 bg-[#00d7c8]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#00d7c8]">
              Trust & Compliance
            </span>
            <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight text-[#ecf2f7] md:text-5xl">
              Built on Transparency
            </h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {TRUST_PILLARS.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <article key={pillar.title} className="rounded-2xl border border-[#22303b]/55 bg-[#0c131a] p-5">
                  <div className="flex items-start gap-4">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#00d7c8]/25 bg-[#00d7c8]/10">
                      <Icon className="h-4 w-4 text-[#00d7c8]" />
                    </div>
                    <div>
                      <h3 className="mb-1 text-lg font-semibold text-[#e8eff5]">{pillar.title}</h3>
                      <p className="text-sm leading-relaxed text-[#8192a0]">{pillar.description}</p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <article className="mt-4 rounded-2xl border border-[#22303b]/55 bg-[#0c131a] p-4">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#738594]">Disclaimer</p>
            <p className="text-sm leading-relaxed text-[#7f919f]">
              Hinweis: Nur zu Informationszwecken. Keine medizinische Beratung. Bei Allergien/Erkrankungen bitte Arzt:in fragen.
            </p>
            <p className="mt-1 text-sm leading-relaxed text-[#677986]">
              Notice: For informational purposes only. Not medical advice. For allergies or health conditions, please consult a physician.
            </p>
          </article>
        </div>
      </section>

      <section id="demo" className="py-18 md:py-24">
        <div className="mx-auto max-w-3xl px-4 text-center md:px-6">
          <span className="inline-flex rounded-full border border-[#00d7c8]/30 bg-[#00d7c8]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#00d7c8]">
            Hackathon Submission
          </span>
          <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight text-[#ecf2f7] md:text-5xl">
            Watch the Live Demo
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-[#8294a1]">
            See NutriVision analyze products in real-time, barcode scanning, voice interaction, and HUD overlay working together.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href="#"
              className="inline-flex items-center gap-2 rounded-xl border border-[#00d7c8]/45 bg-[#00d7c8] px-6 py-3 text-base font-semibold text-[#041414] transition-colors hover:bg-[#09c8bc]"
            >
              <Play className="h-4 w-4" />
              Watch Demo Video
            </a>
            <a
              href="#"
              className="inline-flex items-center gap-2 rounded-xl border border-[#2b3945] bg-[#0c1118] px-6 py-3 text-base font-semibold text-[#d8e2e9] transition-colors hover:bg-[#131b24]"
            >
              <Github className="h-4 w-4" />
              View Repository
            </a>
          </div>

          <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {CTA_KPIS.map((kpi) => (
              <div key={kpi.label} className="text-center">
                <p className="text-4xl font-mono font-bold text-[#00d7c8]">{kpi.value}</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-[#70818f]">{kpi.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-[#22303b]/50 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 md:flex-row md:justify-between md:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md border border-[#00d7c8]/25 bg-[#00d7c8]/10">
              <Eye className="h-3 w-3 text-[#00d7c8]" />
            </div>
            <span className="text-xs font-semibold text-[#e5eef5]">NutriVision</span>
          </div>
          <p className="text-center text-[10px] text-[#687a88] md:text-right">
            Built for the Gemini Live Agent Challenge · Powered by Google Cloud
          </p>
        </div>
      </footer>

    </div>
  );
}
