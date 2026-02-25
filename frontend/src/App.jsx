import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  AudioLines,
  Brain,
  Camera,
  CheckCircle2,
  ChevronDown,
  Circle,
  Cloud,
  CloudCog,
  Cpu,
  Eye,
  FlaskConical,
  Github,
  HelpCircle,
  Info,
  LayoutDashboard,
  Layers,
  Lock,
  Mic,
  MicOff,
  Play,
  Scale,
  Scan,
  ScanLine,
  SendHorizonal,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Volume2,
  XCircle,
  Zap
} from "lucide-react";

const DEMO_PRODUCTS = [
  {
    name: "Organic Oat Cereal",
    category: "Food",
    verdict: "authorized",
    bars: [
      { label: "Nutrition", value: 88 },
      { label: "Additives", value: 95 },
      { label: "Processing", value: 72 },
      { label: "Allergens", value: 65 }
    ],
    spokenVerdict:
      "This organic oat cereal has a strong nutritional profile with minimal additives. Note: contains gluten. Suitable for most diets.",
    warnings: ["Gluten present", "High fiber"],
    latency: "1.2s"
  },
  {
    name: "Berry Energy Drink",
    category: "Food",
    verdict: "warning_required",
    bars: [
      { label: "Nutrition", value: 35 },
      { label: "Additives", value: 40 },
      { label: "Processing", value: 25 },
      { label: "Allergens", value: 90 }
    ],
    spokenVerdict:
      "Warning: high caffeine, artificial colorings, and significant added sugars. Not recommended for children or caffeine-sensitive individuals.",
    warnings: ["High caffeine", "Artificial colors", "Added sugars"],
    latency: "1.4s"
  },
  {
    name: "Gentle Face Cream",
    category: "Cosmetics (Beta)",
    verdict: "restricted",
    bars: [
      { label: "Safety", value: 70 },
      { label: "INCI", value: 55 },
      { label: "Allergens", value: 45 },
      { label: "Eco", value: 80 }
    ],
    spokenVerdict:
      "This face cream contains a flagged fragrance allergen and a harsh surfactant. Individuals with sensitive skin should patch-test first.",
    warnings: ["Fragrance allergen", "Surfactant flag"],
    latency: "2.8s"
  }
];

const STACK_ITEMS = [
  { icon: Cpu, label: "Gemini Multimodal", sublabel: "Live Agent" },
  { icon: CloudCog, label: "Google Cloud Run", sublabel: "Backend" },
  { icon: Layers, label: "GenAI SDK", sublabel: "Streaming" },
  { icon: Smartphone, label: "Mobile-First", sublabel: "PWA" }
];

const FEATURE_ITEMS = [
  {
    icon: Scan,
    title: "Barcode-First ID",
    description:
      "Instant product identification with intelligent fallback to visual search.",
    stat: "1.5s",
    statLabel: "latency"
  },
  {
    icon: Mic,
    title: "Voice Interaction",
    description:
      "Zero-typing interface with interruptible spoken verdicts and natural follow-ups.",
    stat: "300ms",
    statLabel: "barge-in"
  },
  {
    icon: Eye,
    title: "HUD Overlay",
    description: "Warning chips and 4-bar analysis in live camera view.",
    stat: "4-bar",
    statLabel: "analysis"
  },
  {
    icon: Zap,
    title: "Live Agent",
    description:
      "Gemini multimodal AI for real-time, context-aware product guidance.",
    stat: "Live",
    statLabel: "streaming"
  },
  {
    icon: ShieldCheck,
    title: "Allergen Alerts",
    description:
      "Conservative, medically-phrased warnings for allergens and restricted ingredients.",
    stat: "5-tier",
    statLabel: "verdicts"
  },
  {
    icon: FlaskConical,
    title: "Cosmetics Beta",
    description:
      "INCI parsing, fragrance allergen flags, surfactant and microplastics screening.",
    stat: "Beta",
    statLabel: "expanding"
  }
];

const HOW_STEPS = [
  {
    icon: Scan,
    title: "Point & Scan",
    description:
      "Aim your camera at any product barcode or packaging. Auto-detection in under a second."
  },
  {
    icon: Brain,
    title: "AI Identifies",
    description:
      "Gemini processes the image, identifies the product, and retrieves grounded ingredient data."
  },
  {
    icon: AudioLines,
    title: "Spoken Verdict",
    description:
      "Receive a concise 2-3 sentence spoken assessment. Interrupt anytime with follow-ups."
  },
  {
    icon: LayoutDashboard,
    title: "HUD Analysis",
    description:
      "Warning chips and 4-bar analysis overlay in real-time for a complete health snapshot."
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
    description:
      "Authorized, restricted, warning required, not authorized, or uncertain. Never ambiguous."
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
    description:
      "Camera feeds processed in real-time and never stored. Shopping data stays on your device."
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

const VERDICT_MAP = {
  authorized: { label: "AUTHORIZED", icon: CheckCircle2, tone: "ok" },
  warning_required: { label: "WARNING", icon: AlertTriangle, tone: "warn" },
  restricted: { label: "RESTRICTED", icon: ShieldAlert, tone: "warn" },
  not_authorized: { label: "NOT AUTHORIZED", icon: XCircle, tone: "bad" },
  uncertain: { label: "UNCERTAIN", icon: HelpCircle, tone: "muted" }
};

function formatClock() {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

function backendWsUrl() {
  if (import.meta.env.VITE_BACKEND_WS_URL) {
    return import.meta.env.VITE_BACKEND_WS_URL;
  }
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  if (import.meta.env.DEV) {
    return `${protocol}://${window.location.hostname}:8000/ws/live`;
  }
  return `${protocol}://${window.location.host}/ws/live`;
}

const LANGUAGE_OPTIONS = [
  { code: "de", label: "DE", locale: "de-DE" },
  { code: "en", label: "EN", locale: "en-US" },
  { code: "es", label: "ES", locale: "es-ES" },
  { code: "fr", label: "FR", locale: "fr-FR" },
  { code: "hi", label: "HI", locale: "hi-IN" },
  { code: "it", label: "IT", locale: "it-IT" },
  { code: "pt", label: "PT", locale: "pt-PT" }
];

function languageLocale(code) {
  const found = LANGUAGE_OPTIONS.find((option) => option.code === code);
  return found?.locale || "en-US";
}

function detectInitialLanguage() {
  const browserLocale = String(globalThis?.navigator?.language || "")
    .trim()
    .toLowerCase();
  const matched = LANGUAGE_OPTIONS.find((option) => browserLocale.startsWith(option.code));
  return matched?.code || "en";
}

function scoreTone(score) {
  if (score >= 75) return "score-high";
  if (score >= 50) return "score-mid";
  if (score >= 35) return "score-low";
  return "score-bad";
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
  const voiceAutoRestartRef = useRef(false);
  const lastVoiceTranscriptRef = useRef({ text: "", ts: 0 });
  const speechFallbackTimerRef = useRef(null);
  const speakingResetTimerRef = useRef(null);
  const visionProbeTimerRef = useRef(null);
  const ambientAudioRef = useRef(null);
  const ambientLoopRef = useRef(null);
  const ambientPauseTimerRef = useRef(null);
  const serverAudioRef = useRef(null);
  const serverAudioUrlRef = useRef("");
  const lastServerAudioTurnRef = useRef("");
  const pendingSpeechTurnRef = useRef("");
  const clientClosingSocketRef = useRef(null);
  const barcodeDetectorRef = useRef(null);
  const lastDetectedBarcodeRef = useRef("");
  const lastDetectedBarcodeAtRef = useRef(0);
  const sessionStartingRef = useRef(false);
  const socketGenerationRef = useRef(0);
  const lastEventRef = useRef({ key: "", ts: 0 });
  const lastSentQueryRef = useRef({ signature: "", ts: 0 });
  const agentStateRef = useRef("disconnected");
  const backendAudioActiveRef = useRef(false);
  const spokenTextRef = useRef("");

  const [language, setLanguage] = useState(detectInitialLanguage);
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
  const [micEnabled, setMicEnabled] = useState(true);
  const [demoIndex, setDemoIndex] = useState(0);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [sessionError, setSessionError] = useState("");
  const [cameraReady, setCameraReady] = useState(false);
  const [scannerSupported, setScannerSupported] = useState(false);
  const [backendAudioActive, setBackendAudioActive] = useState(false);
  const [uncertainPrompt, setUncertainPrompt] = useState("");
  const [uncertainCandidates, setUncertainCandidates] = useState([]);
  const [events, setEvents] = useState([
    {
      id: 1,
      time: formatClock(),
      de: "System initialisiert. Warte auf Video-Uplink.",
      en: "System initialized. Awaiting video uplink."
    }
  ]);

  const selectedDemo = DEMO_PRODUCTS[demoIndex];
  const wsEndpoint = useMemo(() => backendWsUrl(), []);
  const hasLiveHud = sessionLive && hud.product_identity?.id && hud.product_identity.id !== "unknown";

  const metricRows = useMemo(() => {
    const rows = Array.isArray(hud.metrics)
      ? hud.metrics.slice(0, 4).map((metric, index) => ({
          label: metric.name || `Metric ${index + 1}`,
          score: Math.max(0, Math.min(100, Number(metric.score || 0))),
          value: metric.value ?? "-"
        }))
      : [];

    while (rows.length < 4) {
      rows.push({
        label: `Metric ${rows.length + 1}`,
        score: 0,
        value: "-"
      });
    }

    return rows;
  }, [hud.metrics]);

  const analysisRows = hasLiveHud
    ? metricRows
    : selectedDemo.bars.map((bar, index) => ({
        label: bar.label || `Metric ${index + 1}`,
        score: bar.value,
        value: "-"
      }));

  const warningRows = hasLiveHud
    ? (hud.warnings || []).map((warning) => warning.label).filter(Boolean)
    : selectedDemo.warnings;

  const speechPanelText =
    spokenText ||
    (sessionLive
      ? "Live response is being processed..."
      : selectedDemo.spokenVerdict);

  const musicBlocked =
    !audioUnlocked || sessionLive || agentState === "speaking" || agentState === "processing";

  const activeVerdict = VERDICT_MAP[selectedDemo.verdict] || VERDICT_MAP.uncertain;
  const VerdictIcon = activeVerdict.icon;

  const statusText =
    appMode === "analyzing" || agentState === "processing"
      ? "ANALYZING"
      : sessionLive
        ? cameraReady
          ? "LIVE"
          : "UPLINKED"
        : "READY";

  const pushEvent = (de, en) => {
    const now = Date.now();
    const key = `${String(de || "").trim()}|${String(en || "").trim()}`;
    const previous = lastEventRef.current;
    if (key && key === previous.key && now - previous.ts < 1400) return;
    lastEventRef.current = { key, ts: now };
    eventId.current += 1;
    setEvents((prev) => [{ id: eventId.current, time: formatClock(), de, en }, ...prev].slice(0, 20));
  };

  useEffect(() => {
    agentStateRef.current = agentState;
  }, [agentState]);

  useEffect(() => {
    backendAudioActiveRef.current = backendAudioActive;
  }, [backendAudioActive]);

  useEffect(() => {
    spokenTextRef.current = spokenText;
  }, [spokenText]);

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

  const stopServerAudioPlayback = () => {
    const activeAudio = serverAudioRef.current;
    if (activeAudio) {
      activeAudio.onended = null;
      activeAudio.onerror = null;
      activeAudio.pause();
      activeAudio.src = "";
    }
    if (serverAudioUrlRef.current) {
      URL.revokeObjectURL(serverAudioUrlRef.current);
      serverAudioUrlRef.current = "";
    }
    serverAudioRef.current = null;
    setBackendAudioActive(false);
  };

  const decodeAudioBlob = (audioB64, mimeType) => {
    if (!audioB64 || typeof audioB64 !== "string") return null;
    const trimmed = audioB64.trim();
    if (!trimmed) return null;
    const dataUrl = trimmed.startsWith("data:")
      ? trimmed
      : `data:${mimeType || "audio/wav"};base64,${trimmed}`;
    const splitIndex = dataUrl.indexOf(",");
    if (splitIndex < 0) return null;
    const header = dataUrl.slice(0, splitIndex);
    const payload = dataUrl.slice(splitIndex + 1);
    const mimeMatch = header.match(/^data:([^;]+);base64$/i);
    const resolvedMime = mimeType || mimeMatch?.[1] || "audio/wav";
    try {
      const binary = window.atob(payload);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
      }
      return new Blob([bytes], { type: resolvedMime });
    } catch {
      return null;
    }
  };

  const playServerAudio = async (audioB64, mimeType) => {
    if (!audioB64) return;
    stopServerAudioPlayback();
    if (window.speechSynthesis) window.speechSynthesis.cancel();

    const blob = decodeAudioBlob(audioB64, mimeType);
    if (!blob) throw new Error("Unable to decode backend audio payload");
    const objectUrl = URL.createObjectURL(blob);
    serverAudioUrlRef.current = objectUrl;
    const audio = new Audio(objectUrl);
    audio.onended = () => {
      setBackendAudioActive(false);
      setAgentState((prev) => (prev === "interrupted" ? prev : "listening"));
      if (serverAudioUrlRef.current) {
        URL.revokeObjectURL(serverAudioUrlRef.current);
        serverAudioUrlRef.current = "";
      }
      serverAudioRef.current = null;
    };
    audio.onerror = () => {
      setBackendAudioActive(false);
      setAgentState((prev) => (prev === "interrupted" ? prev : "listening"));
      if (serverAudioUrlRef.current) {
        URL.revokeObjectURL(serverAudioUrlRef.current);
        serverAudioUrlRef.current = "";
      }
      serverAudioRef.current = null;
      pushEvent("Server-Audio konnte nicht abgespielt werden.", "Server audio playback failed.");
    };

    serverAudioRef.current = audio;
    setBackendAudioActive(true);
    setAgentState("speaking");
    await audio.play();
  };

  const speakWithBrowserTts = (text, voiceLanguageCode) => {
    if (!window.speechSynthesis || !text) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = languageLocale(String(voiceLanguageCode || language));
    utterance.onend = () =>
      setAgentState((prev) => (prev === "interrupted" ? prev : "listening"));
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const playAmbientBit = async () => {
    const audio = ambientAudioRef.current;
    if (!audio || musicBlocked) return;

    audio.volume = 0.03;

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
    }, 10000);
  };

  const closeSocket = () => {
    socketGenerationRef.current += 1;
    if (wsRef.current) {
      const activeSocket = wsRef.current;
      clientClosingSocketRef.current = activeSocket;
      try {
        activeSocket.close();
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

  const stopVisionProbeLoop = () => {
    if (visionProbeTimerRef.current) {
      window.clearInterval(visionProbeTimerRef.current);
      visionProbeTimerRef.current = null;
    }
  };

  const stopVoiceRecognitionLoop = () => {
    voiceAutoRestartRef.current = false;
    const recognition = speechRecognitionRef.current;
    speechRecognitionRef.current = null;
    if (!recognition) {
      setVoiceListening(false);
      return;
    }
    recognition.onend = null;
    recognition.onerror = null;
    recognition.onresult = null;
    try {
      recognition.stop();
    } catch {
      // noop
    }
    setVoiceListening(false);
  };

  const detectBarcodeAndQuery = async (canvas) => {
    if (!scannerSupported || typeof window.BarcodeDetector === "undefined") return;
    const socket = wsRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;

    try {
      if (!barcodeDetectorRef.current) {
        barcodeDetectorRef.current = new window.BarcodeDetector({
          formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "qr_code"]
        });
      }
      const matches = await barcodeDetectorRef.current.detect(canvas);
      if (!Array.isArray(matches) || matches.length === 0) return;

      const candidate = String(matches[0]?.rawValue || "").trim();
      if (!candidate) return;

      const now = Date.now();
      const isDuplicate = candidate === lastDetectedBarcodeRef.current && now - lastDetectedBarcodeAtRef.current < 8000;
      if (isDuplicate) return;

      lastDetectedBarcodeRef.current = candidate;
      lastDetectedBarcodeAtRef.current = now;
      sendQuery("", candidate);
      pushEvent(`Barcode erkannt: ${candidate}`, `Barcode detected: ${candidate}`);
    } catch {
      // Ignore detector errors and keep frame uplink running.
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
    setCameraReady(false);
  };

  const startFrameLoop = () => {
    stopFrameLoop();

    frameLoopRef.current = window.setInterval(() => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const socket = wsRef.current;
      if (!video || !canvas || !socket || socket.readyState !== WebSocket.OPEN) return;
      if (video.videoWidth === 0 || video.videoHeight === 0) return;

      const targetWidth = Math.min(960, video.videoWidth);
      const scale = targetWidth / video.videoWidth;
      canvas.width = Math.max(640, Math.round(video.videoWidth * scale));
      canvas.height = Math.max(360, Math.round(video.videoHeight * scale));
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) return;

      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const image = canvas.toDataURL("image/jpeg", 0.85);
      socket.send(JSON.stringify({ type: "frame", image_b64: image }));
      void detectBarcodeAndQuery(canvas);
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
      const generation = socketGenerationRef.current + 1;
      socketGenerationRef.current = generation;
      const socket = new WebSocket(wsEndpoint);
      let settled = false;

      socket.onopen = () => {
        if (generation !== socketGenerationRef.current) {
          try {
            socket.close();
          } catch {
            // noop
          }
          return;
        }
        wsRef.current = socket;
        setWsStatus("connected");
        setAgentState("listening");
        setSessionError("");
        socket.send(JSON.stringify({ type: "session_start", domain, language }));
        settled = true;
        resolve();
      };

      socket.onerror = () => {
        if (generation !== socketGenerationRef.current) return;
        if (clientClosingSocketRef.current === socket) return;
        if (wsRef.current && wsRef.current !== socket) return;
        setWsStatus("error");
        setAgentState("disconnected");
        setSessionError(`WebSocket error. Check backend endpoint: ${wsEndpoint}`);
        if (!settled) reject(new Error("WebSocket connection failed"));
      };

      socket.onclose = () => {
        if (generation !== socketGenerationRef.current) return;
        if (clientClosingSocketRef.current === socket) {
          clientClosingSocketRef.current = null;
          return;
        }
        if (wsRef.current && wsRef.current !== socket) return;
        setWsStatus("disconnected");
        setSessionLive(false);
        setAgentState("disconnected");
        setAppMode("active_scan");
        pendingSpeechTurnRef.current = "";
        lastServerAudioTurnRef.current = "";
        window.clearTimeout(speechFallbackTimerRef.current);
        stopVoiceRecognitionLoop();
        stopServerAudioPlayback();
        clearAmbientTimers();
        pauseAmbientAudio(true);
        stopCamera();
      };

      socket.onmessage = (event) => {
        if (generation !== socketGenerationRef.current) return;
        if (clientClosingSocketRef.current === socket) return;
        if (wsRef.current && wsRef.current !== socket) return;
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
          setUncertainPrompt("");
          setUncertainCandidates([]);
          pushEvent(
            `Ziel erfasst: ${data.product_identity?.name || "Unbekannt"}`,
            `Target acquired: ${data.product_identity?.name || "Unknown"}`
          );
          return;
        }

        if (eventType === "speech_text") {
          setSpokenText(data.text || "");
          setAgentState("speaking");
          const turnId = String(data.turn_id || "");
          pendingSpeechTurnRef.current = turnId;
          window.clearTimeout(speechFallbackTimerRef.current);
          speechFallbackTimerRef.current = window.setTimeout(() => {
            const hasActiveServerAudio = Boolean(serverAudioRef.current);
            const hasAudioForTurn = turnId && lastServerAudioTurnRef.current === turnId;
            if (!hasActiveServerAudio && !hasAudioForTurn) {
              speakWithBrowserTts(data.text, data.language);
            } else {
              window.clearTimeout(speakingResetTimerRef.current);
              speakingResetTimerRef.current = window.setTimeout(() => {
                const stillActiveServerAudio = Boolean(serverAudioRef.current);
                if (!stillActiveServerAudio) {
                  setAgentState((prev) => (prev === "interrupted" ? prev : "listening"));
                }
              }, 2800);
            }
          }, 2200);
          return;
        }

        if (eventType === "speech_audio") {
          const audioTurnId = String(data.turn_id || "");
          if (audioTurnId) {
            lastServerAudioTurnRef.current = audioTurnId;
            if (pendingSpeechTurnRef.current === audioTurnId) {
              window.clearTimeout(speechFallbackTimerRef.current);
            }
          }
          if (data.audio_b64) {
            playServerAudio(data.audio_b64, data.mime_type).then(() => {
              window.clearTimeout(speechFallbackTimerRef.current);
            }).catch(() => {
              setBackendAudioActive(false);
              pushEvent("Server-Audio Start fehlgeschlagen.", "Server audio playback start failed.");
              const textFallback = String(spokenTextRef.current || "");
              if (textFallback) speakWithBrowserTts(textFallback, data.language || language);
            });
            pushEvent("Server-Audio empfangen.", "Server audio stream received.");
          }
          return;
        }

        if (eventType === "uncertain_match") {
          setAppMode("uncertain_match");
          setAgentState("listening");
          const options = Array.isArray(data.details?.candidates)
            ? data.details.candidates.slice(0, 3)
            : [];
          setUncertainCandidates(options);
          setUncertainPrompt(
            data.message ||
              (language === "de"
                ? "Mehrere Treffer gefunden. Bitte waehle das Produkt."
                : "Multiple matches found. Please choose the product.")
          );
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
          setUncertainPrompt("");
          setUncertainCandidates([]);
        }

        if (eventType === "session_state") {
          if ((data.message || "").toLowerCase().includes("started")) {
            setAgentState("listening");
            setAppMode("active_scan");
            setSessionError("");
            setUncertainPrompt("");
            setUncertainCandidates([]);
          }
          if ((data.message || "").toLowerCase().includes("stopped")) {
            setAgentState("disconnected");
            setUncertainPrompt("");
            setUncertainCandidates([]);
          }
        }

        const message = data.message || eventType || "event";
        pushEvent(message, message);
      };
    });

  const startCamera = async () => {
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
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
    } catch {
      // Fallback: some desktop webcams reject facingMode=environment.
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true
        }
      });
    }

    mediaStreamRef.current = stream;

    const video = videoRef.current;
    if (video) {
      video.srcObject = stream;
      await video.play();
    }
    setCameraReady(true);
  };

  const startSession = async () => {
    if (sessionLive || sessionStartingRef.current || wsStatus === "connecting") return;
    sessionStartingRef.current = true;

    try {
      setWsStatus("connecting");
      setAgentState("connecting");
      setAppMode("active_scan");
      setSpokenText("");
      setSessionError("");
      setUncertainPrompt("");
      setUncertainCandidates([]);
      setAudioUnlocked(true);
      clearAmbientTimers();
      pauseAmbientAudio(true);
      closeSocket();
      await startCamera();
      await connectSocket();
      setSessionLive(true);
      startFrameLoop();
      startAudioCapture();
      pushEvent("Uplink etabliert (A/V).", "Uplink established (A/V).");
    } catch (error) {
      stopCamera();
      closeSocket();
      setSessionLive(false);
      setWsStatus("error");
      setAgentState("disconnected");
      const detail = error instanceof Error ? error.message : "Unknown startup failure";
      setSessionError(detail);
      const fallbackPrompt =
        language === "de"
          ? "Kamera oder Mikrofon konnte nicht gestartet werden. Bitte pruefe Berechtigungen und nenne mir alternativ den Produktnamen."
          : "Camera or microphone could not start. Please check permissions and alternatively tell me the product name.";
      setSpokenText(fallbackPrompt);
      speakWithBrowserTts(fallbackPrompt, language);
      pushEvent(
        `Uplink fehlgeschlagen. Sensoren pruefen. (${detail})`,
        `Uplink failed. Check sensors. (${detail})`
      );
    } finally {
      sessionStartingRef.current = false;
    }
  };

  const stopSession = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "session_end" }));
    }

    stopCamera();
    stopVisionProbeLoop();
    stopVoiceRecognitionLoop();
    closeSocket();
    setSessionLive(false);
    setWsStatus("disconnected");
    setAgentState("disconnected");
    setAppMode("active_scan");
    setHud(INITIAL_HUD);
    setSpokenText("");
    setSessionError("");
    setUncertainPrompt("");
    setUncertainCandidates([]);
    pendingSpeechTurnRef.current = "";
    lastServerAudioTurnRef.current = "";

    if (window.speechSynthesis) window.speechSynthesis.cancel();

    window.clearTimeout(speechFallbackTimerRef.current);
    stopServerAudioPlayback();
    clearAmbientTimers();
    pauseAmbientAudio(true);
    pushEvent("Uplink getrennt.", "Uplink severed.");
  };

  const sendQuery = (queryOverride, barcodeOverride, options = {}) => {
    const socket = wsRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      pushEvent("Kein Backend-Uplink.", "No backend uplink.");
      return;
    }

    const allowEmpty = Boolean(options.allowEmpty);
    const silent = Boolean(options.silent);
    const force = Boolean(options.force);
    const source = String(options.source || "manual");
    const cleanQuery = (queryOverride ?? queryText).trim();
    const cleanBarcode = (barcodeOverride ?? barcodeText).trim();
    if (!cleanQuery && !cleanBarcode && !allowEmpty) return;
    if (!force && allowEmpty && (agentState === "processing" || agentState === "speaking")) return;

    const signature = `${domain}|${cleanQuery.toLowerCase()}|${cleanBarcode}`;
    const now = Date.now();
    const previous = lastSentQueryRef.current;
    const duplicateWindow = allowEmpty ? 8000 : 2500;
    if (!force && signature === previous.signature && now - previous.ts < duplicateWindow) {
      return;
    }
    lastSentQueryRef.current = { signature, ts: now };

    setAppMode("analyzing");
    setAgentState("processing");
    setUncertainPrompt("");
    setUncertainCandidates([]);

    socket.send(
      JSON.stringify({
        type: "user_query",
        text: cleanQuery,
        barcode: cleanBarcode,
        domain,
        source
      })
    );

    if (!silent) {
      const message = cleanQuery
        ? `Transmitting query: ${cleanQuery}`
        : cleanBarcode
          ? `Transmitting code: ${cleanBarcode}`
          : "Transmitting vision probe frame";
      pushEvent(message, message);
    }

    if (!queryOverride) setQueryText("");
    if (barcodeOverride !== undefined) setBarcodeText(cleanBarcode);
  };

  const resolveUncertainMatch = (candidate) => {
    const name = String(candidate?.name || "").trim();
    const barcode = String(candidate?.id || "").trim();
    if (!name && !barcode) return;
    sendQuery(name, barcode, { force: true });
    setQueryText("");
  };

  const startVoiceRecognitionLoop = () => {
    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) return;
    if (!sessionLive || wsStatus !== "connected" || !micEnabled) return;
    if (speechRecognitionRef.current) return;

    const recognition = new SpeechRecognitionCtor();
    voiceAutoRestartRef.current = true;
    recognition.lang = languageLocale(language);
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;

    recognition.onstart = () => setVoiceListening(true);
    recognition.onend = () => {
      setVoiceListening(false);
      speechRecognitionRef.current = null;
      if (!voiceAutoRestartRef.current || !sessionLive || wsStatus !== "connected" || !micEnabled) return;
      window.setTimeout(() => {
        startVoiceRecognitionLoop();
      }, 250);
    };
    recognition.onerror = (event) => {
      const errorCode = String(event?.error || "");
      setVoiceListening(false);
      if (errorCode === "not-allowed" || errorCode === "service-not-allowed") {
        voiceAutoRestartRef.current = false;
        setMicEnabled(false);
        pushEvent("Mikrofonzugriff blockiert.", "Microphone permission blocked.");
      }
    };
    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (!result?.isFinal) continue;
        if (backendAudioActiveRef.current) continue;
        if (agentStateRef.current === "speaking" || agentStateRef.current === "processing") continue;
        const alternatives = Array.from(result || [])
          .map((item) => ({
            transcript: String(item?.transcript || "").trim(),
            confidence: typeof item?.confidence === "number" ? item.confidence : 0
          }))
          .filter((item) => item.transcript.length > 0)
          .sort((a, b) => (b.confidence - a.confidence) || (b.transcript.length - a.transcript.length));
        const best = alternatives[0];
        const transcript = best?.transcript || "";
        if (!transcript) continue;

        const now = Date.now();
        const normalizedTranscript = transcript.toLowerCase();
        const spokenSnapshot = String(spokenTextRef.current || "").trim().toLowerCase();
        if (
          spokenSnapshot &&
          normalizedTranscript.length >= 16 &&
          (spokenSnapshot.includes(normalizedTranscript.slice(0, 24)) ||
            normalizedTranscript.includes(spokenSnapshot.slice(0, 24)))
        ) {
          continue;
        }
        if (
          normalizedTranscript.includes("i cannot find a specific product") ||
          normalizedTranscript.includes("i cannot determine a specific product") ||
          normalizedTranscript.includes("please bring the product") ||
          normalizedTranscript.includes("please show the barcode")
        ) {
          continue;
        }
        const previous = lastVoiceTranscriptRef.current;
        if (normalizedTranscript === previous.text && now - previous.ts < 1800) continue;
        lastVoiceTranscriptRef.current = { text: normalizedTranscript, ts: now };

        const shortUtterance = transcript.split(/\s+/).filter(Boolean).length <= 2;
        if (best && best.confidence > 0 && best.confidence < 0.45 && shortUtterance) {
          setQueryText(transcript);
          pushEvent(
            `Unsicher erkannt (${Math.round(best.confidence * 100)}%). Bitte wiederholen oder tippen.`,
            `Low confidence (${Math.round(best.confidence * 100)}%). Please repeat or type it.`
          );
          continue;
        }

        setQueryText(transcript);
        sendQuery(transcript, undefined, { silent: true, source: "voice" });
        pushEvent(`Audio decoded: ${transcript}`, `Audio decoded: ${transcript}`);
      }
    };

    speechRecognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      speechRecognitionRef.current = null;
    }
  };

  const toggleVoiceInput = () => {
    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      pushEvent("Audio-Eingabe nicht unterstuetzt.", "Audio input unsupported.");
      return;
    }
    const nextEnabled = !micEnabled;
    setMicEnabled(nextEnabled);
    if (!nextEnabled) {
      stopVoiceRecognitionLoop();
      pushEvent("Mikrofon stumm.", "Microphone muted.");
      return;
    }
    pushEvent("Mikrofon aktiv.", "Microphone active.");
    if (sessionLive && wsStatus === "connected") {
      startVoiceRecognitionLoop();
    }
  };

  const triggerBargeIn = () => {
    const socket = wsRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify({ type: "barge_in" }));

    if (window.speechSynthesis) window.speechSynthesis.cancel();
    window.clearTimeout(speechFallbackTimerRef.current);
    stopServerAudioPlayback();

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
    setScannerSupported(typeof window.BarcodeDetector !== "undefined");

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
      stopVisionProbeLoop();
      closeSocket();
      stopServerAudioPlayback();
      stopVoiceRecognitionLoop();
      window.clearTimeout(speechFallbackTimerRef.current);
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
    if (!voiceSupported) return;
    if (
      sessionLive &&
      wsStatus === "connected" &&
      micEnabled &&
      !backendAudioActive &&
      agentState !== "speaking" &&
      agentState !== "processing"
    ) {
      startVoiceRecognitionLoop();
      return;
    }
    stopVoiceRecognitionLoop();
  }, [voiceSupported, sessionLive, wsStatus, micEnabled, language, backendAudioActive, agentState]);

  useEffect(() => {
    stopVisionProbeLoop();

    const shouldProbe =
      sessionLive &&
      wsStatus === "connected" &&
      cameraReady &&
      (agentState === "listening" || agentState === "interrupted") &&
      appMode === "active_scan" &&
      uncertainCandidates.length === 0;
    if (!shouldProbe) return undefined;

    visionProbeTimerRef.current = window.setInterval(() => {
      if (queryText.trim() || barcodeText.trim()) return;
      sendQuery("", "", { allowEmpty: true, silent: true });
    }, 8000);

    return () => {
      stopVisionProbeLoop();
    };
  }, [
    sessionLive,
    wsStatus,
    cameraReady,
    agentState,
    appMode,
    voiceListening,
    uncertainCandidates.length,
    queryText,
    barcodeText
  ]);

  useEffect(() => {
    clearAmbientTimers();
    if (musicBlocked) {
      pauseAmbientAudio();
      return;
    }

    playAmbientBit();
    ambientLoopRef.current = window.setInterval(() => {
      playAmbientBit();
    }, 15000);

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
    <div className="nv-app">
      <div id="nv-intro">
        <div className="intro-text">&gt; SENSOR_ALIGNMENT_COMPLETE</div>
        <div className="intro-laser" />
      </div>

      <header className="nv-topbar anim-slide-up d-1">
        <div className="nv-brand">
          <div className="nv-logo-box">
            <Eye size={13} />
          </div>
          <span className="nv-brand-name">NutriVision</span>
          <span className="nv-badge">Gemini Live Agent</span>
        </div>

        <nav className="nv-nav-links">
          <a href="#scanner">Scanner</a>
          <a href="#features">Features</a>
          <a href="#how-it-works">How It Works</a>
          <a href="#trust">Trust</a>
        </nav>

        <div className="nv-actions">
          <a href="#" className="nv-btn nv-btn-dark">
            <Github size={13} />
            Repo
          </a>
          <a href="#demo" className="nv-btn nv-btn-primary">
            <Play size={12} />
            Demo
          </a>
          <select
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
            className="nv-select"
            disabled={sessionLive}
            title={sessionLive ? "Stop session to change language." : "Language"}
          >
            {LANGUAGE_OPTIONS.map((option) => (
              <option key={option.code} value={option.code}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={domain}
            onChange={(event) => setDomain(event.target.value)}
            className="nv-select"
            disabled={sessionLive}
            title={sessionLive ? "Stop session to change domain." : "Domain"}
          >
            <option value="food">Food</option>
            <option value="beauty">Cosmetics</option>
          </select>
          <span className={`nv-status ${wsStatus === "connected" ? "is-on" : ""}`}>
            {wsStatus === "connected" ? "ONLINE" : "OFFLINE"}
          </span>
        </div>
      </header>

      <main id="scanner" className="nv-main">
        <section className="nv-grid">
          <div className="nv-left-col">
            <article className="nv-camera-card anim-slide-up d-2">
              <video ref={videoRef} autoPlay playsInline muted className={`nv-video ${cameraReady ? "is-active" : ""}`} />
              <canvas ref={canvasRef} className="nv-hidden-canvas" />

              <div className={`nv-camera-overlay ${cameraReady ? "is-live" : ""}`} />
              <div className="nv-camera-grid" />

              <div className="nv-hud-top">
                <div className="nv-state-pill">
                  <span className="nv-dot" />
                  {statusText}
                </div>

                <div className="nv-hud-right">
                  <button
                    type="button"
                    className={`nv-hud-btn ${micEnabled ? "is-active" : ""}`}
                    onClick={toggleVoiceInput}
                    disabled={!voiceSupported}
                    title={micEnabled ? "Mute voice input" : "Enable voice input"}
                  >
                    {micEnabled ? <Mic size={13} /> : <MicOff size={13} />}
                  </button>

                  <span className="nv-listen-pill">
                    <AudioLines size={11} />
                    {voiceListening ? "Listening" : micEnabled ? "Armed" : "Muted"}
                  </span>
                </div>
              </div>

              <div className="nv-center-lockup">
                <div className="nv-reticle">
                  <ScanLine size={18} />
                </div>
              </div>

              <div className="nv-bottom-panel">
                <div className="nv-product-line">
                  <span className={`nv-verdict nv-${activeVerdict.tone}`}>
                    <VerdictIcon size={12} />
                    {activeVerdict.label}
                  </span>
                  <span className="nv-product-name">
                    {hasLiveHud ? hud.product_identity?.name || selectedDemo.name : selectedDemo.name}
                  </span>
                  <span className="nv-latency">{selectedDemo.latency}</span>
                </div>

                <div className="nv-analysis-grid">
                  {analysisRows.map((row, index) => (
                    <div key={`${row.label}-${index}`} className="nv-analysis-item">
                      <div className="nv-analysis-head">
                        <span>{row.label}</span>
                        <strong>{Math.round(row.score)}%</strong>
                      </div>
                      <div className="nv-progress">
                        <i
                          className={`nv-progress-bar ${scoreTone(row.score)} bar-${(index % 4) + 1}`}
                          style={{ "--target-width": `${Math.max(3, row.score)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="nv-warning-tags">
                  {warningRows.slice(0, 4).map((warning) => (
                    <span key={warning}>
                      <AlertTriangle size={11} />
                      {warning}
                    </span>
                  ))}
                </div>
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
                className="nv-icon-btn"
                onClick={triggerBargeIn}
                disabled={!sessionLive}
                title="Barge in"
              >
                <Circle size={13} />
              </button>

              <button
                type="button"
                className={`nv-session-btn ${sessionLive ? "is-stop" : "is-start"}`}
                onClick={sessionLive ? stopSession : startSession}
                title={sessionLive ? "Stop session" : "Start session"}
                disabled={wsStatus === "connecting"}
              >
                {sessionLive ? <Circle size={13} /> : <Play size={13} />}
                {sessionLive
                  ? language === "de"
                    ? "SESSION STOPPEN"
                    : "STOP SESSION"
                  : language === "de"
                    ? "SESSION STARTEN"
                    : "START SESSION"}
              </button>

              <button type="button" className="nv-send-btn" onClick={() => sendQuery()}>
                <SendIcon />
                SENDEN
              </button>
            </article>

            <article className="nv-runtime-strip anim-slide-up d-3">
              <div>
                <span>WS</span>
                <strong>{wsEndpoint}</strong>
              </div>
              <div>
                <span>CAM</span>
                <strong>{cameraReady ? "READY" : "OFF"}</strong>
              </div>
              <div>
                <span>SCAN</span>
                <strong>{scannerSupported ? "AUTO" : "MANUAL"}</strong>
              </div>
              <div>
                <span>AUDIO</span>
                <strong>{backendAudioActive ? "MODEL" : "TEXT/TTS"}</strong>
              </div>
              {sessionError && <p>{sessionError}</p>}
            </article>
          </div>

          <aside className="nv-right-col">
            <article className="nv-panel anim-slide-right d-4">
              <header>
                <span>
                  <Camera size={12} />
                  DEMO PRODUCTS
                </span>
              </header>
              <div className="nv-product-list">
                {DEMO_PRODUCTS.map((product, index) => (
                  <button
                    key={product.name}
                    type="button"
                    onClick={() => setDemoIndex(index)}
                    className={`nv-product-item ${index === demoIndex ? "is-selected" : ""}`}
                  >
                    <div className="nv-product-icon">
                      {product.verdict === "authorized" ? <CheckCircle2 size={13} /> : <Shield size={13} />}
                    </div>
                    <div>
                      <p>{product.name}</p>
                      <small>{product.category}</small>
                    </div>
                    {index === demoIndex && <i />}
                  </button>
                ))}
              </div>
            </article>

            <article className="nv-panel nv-spoken-panel anim-slide-right d-5">
              <header>
                <span>
                  <Volume2 size={12} />
                  SPOKEN VERDICT
                </span>
                <span className="nv-live-chip">{wsStatus === "connected" ? "Live" : "Idle"}</span>
              </header>

              <div className="nv-spoken-body">
                <p>{speechPanelText}</p>
              </div>

              <footer>
                <Info size={11} />
                Hinweis: Nur zu Informationszwecken. Keine medizinische Beratung.
              </footer>
            </article>

            {uncertainCandidates.length > 0 && (
              <article className="nv-panel nv-candidate-panel anim-slide-right d-5">
                <header>
                  <span>
                    <HelpCircle size={12} />
                    MATCH CLARIFICATION
                  </span>
                </header>
                <p className="nv-candidate-prompt">
                  {uncertainPrompt ||
                    (language === "de"
                      ? "Bitte waehle das richtige Produkt."
                      : "Please choose the correct product.")}
                </p>
                <div className="nv-candidate-list">
                  {uncertainCandidates.map((candidate) => (
                    <button
                      key={`${candidate.id}-${candidate.name}`}
                      type="button"
                      className="nv-candidate-item"
                      onClick={() => resolveUncertainMatch(candidate)}
                    >
                      <strong>{candidate.name || candidate.id}</strong>
                      <small>{candidate.id}</small>
                    </button>
                  ))}
                </div>
              </article>
            )}

            <article className="nv-panel nv-kpi-panel anim-slide-right d-6">
              <div className="nv-kpi-grid">
                <div>
                  <strong>1.5s</strong>
                  <span>BARCODE</span>
                </div>
                <div>
                  <strong>300ms</strong>
                  <span>BARGE-IN</span>
                </div>
                <div>
                  <strong>85%+</strong>
                  <span>ID RATE</span>
                </div>
              </div>
            </article>

            <article className="nv-panel nv-log-panel anim-slide-right d-6">
              <header>
                <span>
                  <AudioLines size={12} />
                  SYSTEM LOG
                </span>
              </header>
              <div className="nv-log-body">
                {events.slice(0, 5).map((evt) => (
                  <p key={evt.id}>
                    [{evt.time}] <strong>{language === "de" ? evt.de : evt.en}</strong>
                  </p>
                ))}
              </div>
            </article>
          </aside>
        </section>
      </main>

      <div className="nv-scroll-hint">
        <ChevronDown size={16} />
      </div>

      <section className="nv-tech-strip">
        <div className="nv-shell nv-tech-grid">
          {STACK_ITEMS.map((item) => (
            <div key={item.label} className="nv-tech-item">
              <item.icon size={15} />
              <div>
                <p>{item.label}</p>
                <small>{item.sublabel}</small>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="nv-section">
        <div className="nv-shell">
          <div className="nv-section-head">
            <span>Capabilities</span>
            <h2>Precision Instrument for Everyday Decisions</h2>
            <p>Every feature calibrated for speed, accuracy, and clarity.</p>
          </div>
          <div className="nv-feature-grid">
            {FEATURE_ITEMS.map((feature) => (
              <article key={feature.title} className="nv-feature-card">
                <div className="nv-feature-top">
                  <div className="nv-feature-icon">
                    <feature.icon size={15} />
                  </div>
                  <div className="nv-feature-stat">
                    <strong>{feature.stat}</strong>
                    <small>{feature.statLabel}</small>
                  </div>
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="nv-section">
        <div className="nv-shell">
          <div className="nv-section-head">
            <span>Workflow</span>
            <h2>Scan to Verdict in Under Two Seconds</h2>
          </div>
          <div className="nv-steps-grid">
            {HOW_STEPS.map((step) => (
              <article key={step.title} className="nv-step-card">
                <div className="nv-step-icon">
                  <step.icon size={15} />
                </div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="trust" className="nv-section">
        <div className="nv-shell">
          <div className="nv-section-head">
            <span>Trust & Compliance</span>
            <h2>Built on Transparency</h2>
          </div>
          <div className="nv-trust-grid">
            {TRUST_PILLARS.map((pillar) => (
              <article key={pillar.title} className="nv-trust-card">
                <div className="nv-trust-icon">
                  <pillar.icon size={15} />
                </div>
                <div>
                  <h3>{pillar.title}</h3>
                  <p>{pillar.description}</p>
                </div>
              </article>
            ))}
          </div>
          <article className="nv-disclaimer-card">
            <Info size={16} />
            <div>
              <strong>Disclaimer</strong>
              <p>
                Hinweis: Nur zu Informationszwecken. Keine medizinische Beratung. Bei Allergien/Erkrankungen bitte Arzt:in fragen.
              </p>
              <p>
                Notice: For informational purposes only. Not medical advice. For allergies or health conditions, please consult a physician.
              </p>
            </div>
          </article>
        </div>
      </section>

      <section id="demo" className="nv-section nv-cta">
        <div className="nv-shell nv-cta-shell">
          <span className="nv-pill">Hackathon Submission</span>
          <h2>Watch the Live Demo</h2>
          <p>
            See NutriVision analyze products in real-time: barcode, voice interaction, and HUD overlay.
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
          <div className="nv-cta-kpi-grid">
            {[
              { value: "1.5s", label: "Barcode Latency" },
              { value: "300ms", label: "Barge-in Pivot" },
              { value: "85%+", label: "Identification" },
              { value: "3/3", label: "Stability Runs" }
            ].map((kpi) => (
              <div key={kpi.label}>
                <strong>{kpi.value}</strong>
                <span>{kpi.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="nv-footer">
        <div className="nv-shell nv-footer-inner">
          <div className="nv-brand">
            <div className="nv-logo-box">
              <Eye size={12} />
            </div>
            <span className="nv-brand-name">NutriVision</span>
          </div>
          <p>Built for the Gemini Live Agent Challenge · Powered by Google Cloud</p>
        </div>
      </footer>
    </div>
  );
}
