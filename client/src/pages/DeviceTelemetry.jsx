import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import {
  ShieldCheck,
  Terminal,
  Lock,
  Wifi,
  Cpu,
  Monitor,
  Copy,
  Check,
  RefreshCw,
  Info,
  HardDrive,
  Battery,
  Eye,
  Sliders,
} from "lucide-react";
import { useNotification } from "../context/NotificationContext";

function inferBrowserAndOS(ua) {
  let browser = "Unknown";
  let os = "Unknown";

  if (/edg\//i.test(ua)) browser = "Microsoft Edge";
  else if (/opr\/|opera\//i.test(ua)) browser = "Opera";
  else if (/chrome|crios/i.test(ua)) browser = "Google Chrome";
  else if (/firefox|fxios/i.test(ua)) browser = "Mozilla Firefox";
  else if (/safari/i.test(ua)) browser = "Apple Safari";

  if (/iphone/i.test(ua)) os = "iOS";
  else if (/ipad/i.test(ua)) os = "iPadOS";
  else if (/android/i.test(ua)) os = "Android";
  else if (/windows/i.test(ua)) os = "Windows";
  else if (/macintosh|mac os x/i.test(ua)) os = "macOS";
  else if (/linux/i.test(ua)) os = "Linux";

  let classification = "Desktop / Laptop";
  if (/iphone|ipod|android.*mobile/i.test(ua)) classification = "Mobile Phone";
  else if (/ipad|android(?!.*mobile)/i.test(ua)) classification = "Tablet";

  return { browser, os, classification };
}

const DeviceTelemetry = () => {
  const { showNotification } = useNotification();
  const [copied, setCopied] = useState(false);
  const [loadingBackend, setLoadingBackend] = useState(true);
  const [lastBackendCheck, setLastBackendCheck] = useState(() => new Date().toLocaleTimeString());
  const [isOnline, setIsOnline] = useState(() => (typeof navigator.onLine === "boolean" ? navigator.onLine : true));

  // 1. Server-derived session telemetry
  const [serverMeta, setServerMeta] = useState({
    ip: "Detecting...",
    location: "Detecting...",
    time: null,
    secure: window.location.protocol === "https:",
    status: "loading", // "loading" | "success" | "error"
  });

  // 2. Network Information (Browser-derived)
  const [networkInfo, setNetworkInfo] = useState({
    supported: false,
    type: "Not exposed by browser",
    effectiveType: "Not exposed by browser",
    downlink: "Not exposed by browser",
    rtt: "Not exposed by browser",
    saveData: false,
  });

  // 3. Hardware & Display
  const [viewportSize, setViewportSize] = useState(() => `${window.innerWidth} × ${window.innerHeight}`);
  const [hardwareInfo] = useState({
    deviceClassification: "Desktop / Laptop",
    platform: navigator.platform || "Unavailable",
    cores: navigator.hardwareConcurrency || null,
    memory: navigator.deviceMemory || null,
    screenResolution: `${window.screen.width} × ${window.screen.height}`,
    colorDepth: `${window.screen.colorDepth}-bit`,
    pixelRatio: window.devicePixelRatio || 1,
    hasTouch: navigator.maxTouchPoints > 0,
    maxTouchPoints: navigator.maxTouchPoints || 0,
  });

  // 4. Graphics & WebGL & WebGPU
  const [webglInfo, setWebglInfo] = useState({
    webgl1: false,
    webgl2: false,
    webgpu: false,
    vendor: "Masked / unavailable",
    renderer: "Masked / unavailable",
    maxTextureSize: null,
    maxViewportDims: null,
  });

  // 5. Browser Identity
  const [identityInfo] = useState(() => {
    const ua = navigator.userAgent;
    const inferred = inferBrowserAndOS(ua);
    return {
      userAgent: ua,
      browser: inferred.browser,
      os: inferred.os,
      classification: inferred.classification,
      language: navigator.language || "Unavailable",
      languages: navigator.languages ? navigator.languages.join(", ") : navigator.language || "Unavailable",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Unavailable",
    };
  });

  // 6. Permissions state
  const [permissions, setPermissions] = useState({
    camera: "Querying...",
    microphone: "Querying...",
    geolocation: "Querying...",
    notifications: "Querying...",
    clipboardRead: "Querying...",
  });

  // 7. Storage
  const [storageInfo, setStorageInfo] = useState({
    localStorage: false,
    sessionStorage: false,
    indexedDB: false,
    cacheStorage: false,
    serviceWorker: false,
    quota: null,
    usage: null,
  });

  // 8. Battery & Audio
  const [batteryInfo, setBatteryInfo] = useState({
    supported: false,
    level: null,
    charging: null,
    chargingTime: null,
    dischargingTime: null,
  });

  const [audioInfo, setAudioInfo] = useState({
    sampleRate: "Unavailable",
  });

  // Reference for battery event listeners cleanup
  const batteryListenersRef = useRef({ battery: null, handlers: {} });

  // Fetch Server-side session telemetry
  const fetchServerTelemetry = useCallback(async () => {
    setLoadingBackend(true);
    try {
      const res = await api.get("/api/auth/session-security");
      if (res.data?.success && res.data.ip) {
        setServerMeta({
          ip: res.data.ip,
          location: res.data.location || "Unavailable",
          time: res.data.time || null,
          secure: res.data.secure !== undefined ? Boolean(res.data.secure) : window.location.protocol === "https:",
          status: "success",
        });
      } else {
        setServerMeta({
          ip: "Unavailable",
          location: "Unavailable",
          time: null,
          secure: window.location.protocol === "https:",
          status: "error",
        });
      }
    } catch {
      setServerMeta({
        ip: "Unavailable",
        location: "Backend telemetry unavailable",
        time: null,
        secure: window.location.protocol === "https:",
        status: "error",
      });
    } finally {
      setLoadingBackend(false);
      setLastBackendCheck(new Date().toLocaleTimeString());
    }
  }, []);

  useEffect(() => {
    fetchServerTelemetry();
  }, [fetchServerTelemetry]);

  // Online / Offline monitor
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Viewport resize monitor
  useEffect(() => {
    const handleResize = () => {
      setViewportSize(`${window.innerWidth} × ${window.innerHeight}`);
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Network Information API
  useEffect(() => {
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (conn) {
      const updateConn = () => {
        setNetworkInfo({
          supported: true,
          type: conn.type ? String(conn.type).toUpperCase() : "Unavailable",
          effectiveType: conn.effectiveType ? String(conn.effectiveType).toUpperCase() : "Unavailable",
          downlink: conn.downlink ? `${conn.downlink} Mbps` : "Unavailable",
          rtt: conn.rtt ? `${conn.rtt} ms` : "Unavailable",
          saveData: Boolean(conn.saveData),
        });
      };
      updateConn();
      conn.addEventListener("change", updateConn);
      return () => {
        conn.removeEventListener("change", updateConn);
      };
    } else {
      setNetworkInfo({
        supported: false,
        type: "Not exposed by browser",
        effectiveType: "Not exposed by browser",
        downlink: "Not exposed by browser",
        rtt: "Not exposed by browser",
        saveData: false,
      });
    }
  }, []);

  // WebGL & WebGPU inspection
  useEffect(() => {
    let hasWebgl1 = false;
    let hasWebgl2 = false;
    let vendor = "Masked / unavailable";
    let renderer = "Masked / unavailable";
    let maxTextureSize = null;
    let maxViewportDims = null;

    try {
      const canvas = document.createElement("canvas");
      const gl1 = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      const gl2 = canvas.getContext("webgl2");

      hasWebgl1 = Boolean(gl1);
      hasWebgl2 = Boolean(gl2);

      const activeGl = gl2 || gl1;
      if (activeGl) {
        maxTextureSize = activeGl.getParameter(activeGl.MAX_TEXTURE_SIZE);
        const dims = activeGl.getParameter(activeGl.MAX_VIEWPORT_DIMS);
        if (dims && dims.length >= 2) {
          maxViewportDims = `${dims[0]} × ${dims[1]}`;
        }

        const debugInfo = activeGl.getExtension("WEBGL_debug_renderer_info");
        if (debugInfo) {
          const v = activeGl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
          const r = activeGl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
          if (v) vendor = v;
          if (r) renderer = r;
        }
      }
    } catch {}

    const hasWebgpu = "gpu" in navigator;

    setWebglInfo({
      webgl1: hasWebgl1,
      webgl2: hasWebgl2,
      webgpu: hasWebgpu,
      vendor,
      renderer,
      maxTextureSize,
      maxViewportDims,
    });
  }, []);

  // Audio Context Sample Rate
  useEffect(() => {
    try {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (AudioCtxClass) {
        const ctx = new AudioCtxClass();
        const rate = ctx.sampleRate ? `${ctx.sampleRate} Hz` : "Unavailable";
        setAudioInfo({ sampleRate: rate });
        ctx.close().catch(() => {});
      } else {
        setAudioInfo({ sampleRate: "Unavailable" });
      }
    } catch {
      setAudioInfo({ sampleRate: "Unavailable" });
    }
  }, []);

  // Battery Status API (with thorough cleanup)
  useEffect(() => {
    let isCancelled = false;

    if (typeof navigator.getBattery === "function") {
      navigator.getBattery()
        .then((battery) => {
          if (isCancelled) return;

          const updateBattery = () => {
            setBatteryInfo({
              supported: true,
              level: typeof battery.level === "number" ? Math.round(battery.level * 100) : null,
              charging: typeof battery.charging === "boolean" ? battery.charging : null,
              chargingTime: Number.isFinite(battery.chargingTime) && battery.chargingTime > 0 ? battery.chargingTime : null,
              dischargingTime: Number.isFinite(battery.dischargingTime) && battery.dischargingTime > 0 ? battery.dischargingTime : null,
            });
          };

          updateBattery();

          battery.addEventListener("levelchange", updateBattery);
          battery.addEventListener("chargingchange", updateBattery);
          battery.addEventListener("chargingtimechange", updateBattery);
          battery.addEventListener("dischargingtimechange", updateBattery);

          batteryListenersRef.current = {
            battery,
            handlers: { updateBattery },
          };
        })
        .catch(() => {
          if (!isCancelled) {
            setBatteryInfo({
              supported: false,
              level: null,
              charging: null,
              chargingTime: null,
              dischargingTime: null,
            });
          }
        });
    } else {
      setBatteryInfo({
        supported: false,
        level: null,
        charging: null,
        chargingTime: null,
        dischargingTime: null,
      });
    }

    return () => {
      isCancelled = true;
      const { battery, handlers } = batteryListenersRef.current;
      if (battery && handlers.updateBattery) {
        battery.removeEventListener("levelchange", handlers.updateBattery);
        battery.removeEventListener("chargingchange", handlers.updateBattery);
        battery.removeEventListener("chargingtimechange", handlers.updateBattery);
        battery.removeEventListener("dischargingtimechange", handlers.updateBattery);
      }
    };
  }, []);

  // Storage inspection (quota estimation)
  useEffect(() => {
    let hasLocal = false;
    let hasSession = false;
    let hasIndexed = false;
    let hasCache = "caches" in window;
    let hasServiceWorker = "serviceWorker" in navigator;

    try {
      localStorage.setItem("__cn_test__", "1");
      localStorage.removeItem("__cn_test__");
      hasLocal = true;
    } catch {}

    try {
      sessionStorage.setItem("__cn_test__", "1");
      sessionStorage.removeItem("__cn_test__");
      hasSession = true;
    } catch {}

    try {
      hasIndexed = Boolean(window.indexedDB);
    } catch {}

    setStorageInfo((prev) => ({
      ...prev,
      localStorage: hasLocal,
      sessionStorage: hasSession,
      indexedDB: hasIndexed,
      cacheStorage: hasCache,
      serviceWorker: hasServiceWorker,
    }));

    if (navigator.storage && typeof navigator.storage.estimate === "function") {
      navigator.storage.estimate()
        .then((estimate) => {
          const quotaMB = estimate.quota ? (estimate.quota / (1024 * 1024)).toFixed(1) : null;
          const quotaGB = estimate.quota ? (estimate.quota / (1024 * 1024 * 1024)).toFixed(2) : null;
          const usageMB = estimate.usage ? (estimate.usage / (1024 * 1024)).toFixed(2) : null;

          setStorageInfo((prev) => ({
            ...prev,
            quota: quotaGB && Number(quotaGB) >= 1 ? `${quotaGB} GB (${quotaMB} MB)` : quotaMB ? `${quotaMB} MB` : "Unavailable",
            usage: usageMB ? `${usageMB} MB` : "0 MB",
          }));
        })
        .catch(() => {});
    }
  }, []);

  // Permissions state inspection with live change listeners & cleanup
  useEffect(() => {
    if (!navigator.permissions || typeof navigator.permissions.query !== "function") {
      setPermissions({
        camera: "Unsupported",
        microphone: "Unsupported",
        geolocation: "Unsupported",
        notifications: "Unsupported",
        clipboardRead: "Unsupported",
      });
      return;
    }

    const permissionNames = [
      { key: "camera", descriptor: { name: "camera" } },
      { key: "microphone", descriptor: { name: "microphone" } },
      { key: "geolocation", descriptor: { name: "geolocation" } },
      { key: "notifications", descriptor: { name: "notifications" } },
      { key: "clipboardRead", descriptor: { name: "clipboard-read" } },
    ];

    const activeListeners = [];

    const formatState = (state) => {
      if (state === "granted") return "Granted";
      if (state === "denied") return "Denied";
      if (state === "prompt") return "Prompt";
      return state || "Unsupported";
    };

    permissionNames.forEach(({ key, descriptor }) => {
      try {
        navigator.permissions.query(descriptor)
          .then((status) => {
            if (!status) {
              setPermissions((prev) => ({ ...prev, [key]: "Unsupported" }));
              return;
            }

            setPermissions((prev) => ({ ...prev, [key]: formatState(status.state) }));

            const handleChange = () => {
              setPermissions((prev) => ({ ...prev, [key]: formatState(status.state) }));
            };

            status.addEventListener("change", handleChange);
            activeListeners.push({ status, handler: handleChange });
          })
          .catch(() => {
            setPermissions((prev) => ({ ...prev, [key]: "Unsupported" }));
          });
      } catch {
        setPermissions((prev) => ({ ...prev, [key]: "Unsupported" }));
      }
    });

    return () => {
      activeListeners.forEach(({ status, handler }) => {
        try {
          status.removeEventListener("change", handler);
        } catch {}
      });
    };
  }, []);

  // Browser capabilities dynamically derived from verified tests
  const capabilitiesList = [
    { label: "JavaScript Execution", available: true },
    { label: "WebGL 1.0", available: webglInfo.webgl1 },
    { label: "WebGL 2.0", available: webglInfo.webgl2 },
    { label: "WebGPU", available: webglInfo.webgpu },
    { label: "WebAssembly", available: typeof WebAssembly === "object" },
    { label: "Web Workers", available: typeof Worker !== "undefined" },
    { label: "Service Workers", available: storageInfo.serviceWorker },
    { label: "IndexedDB", available: storageInfo.indexedDB },
    { label: "Local Storage", available: storageInfo.localStorage },
    { label: "Session Storage", available: storageInfo.sessionStorage },
    { label: "Cache API", available: storageInfo.cacheStorage },
    { label: "Notifications API", available: "Notification" in window },
    { label: "Geolocation API", available: "geolocation" in navigator },
    { label: "Clipboard API", available: "clipboard" in navigator },
    { label: "WebRTC (RTCPeerConnection)", available: Boolean(window.RTCPeerConnection) },
    { label: "Web Share API", available: "share" in navigator },
    { label: "Push Manager API", available: "PushManager" in window },
  ];

  const handleCopyReport = async () => {
    const report = `CAMPUSNODE DEVICE & PRIVACY DIAGNOSTIC

Generated: ${new Date().toISOString()}

NETWORK & SERVER
Public IP                 : ${serverMeta.ip}
Approximate Location      : ${serverMeta.location}
Connection Security       : ${serverMeta.secure ? "HTTPS connection" : "HTTP (Unencrypted)"}
Online Status             : ${isOnline ? "Online" : "Offline"}
Connection Type           : ${networkInfo.type}
Effective Connection Type : ${networkInfo.effectiveType}
Estimated Downlink        : ${networkInfo.downlink}
Estimated RTT             : ${networkInfo.rtt}
Save Data Mode            : ${networkInfo.saveData ? "Enabled" : "Disabled / Not active"}
Last Backend Check        : ${lastBackendCheck}

DEVICE & HARDWARE
Classification            : ${hardwareInfo.deviceClassification}
Operating Platform        : ${hardwareInfo.platform}
Logical CPU Cores         : ${hardwareInfo.cores ? `${hardwareInfo.cores} logical cores` : "Unavailable"}
Approx. Device Memory     : ${hardwareInfo.memory ? `${hardwareInfo.memory} GB` : "Not exposed by browser"}
Touch Support             : ${hardwareInfo.hasTouch ? "Supported" : "Not detected"}
Max Touch Points          : ${hardwareInfo.maxTouchPoints}

DISPLAY
Screen Resolution         : ${hardwareInfo.screenResolution}
Browser Viewport          : ${viewportSize}
Device Pixel Ratio (DPR)  : ${hardwareInfo.pixelRatio}
Color Depth               : ${hardwareInfo.colorDepth}

GRAPHICS / WEBGL
WebGL 1.0 Support         : ${webglInfo.webgl1 ? "Available" : "Not available"}
WebGL 2.0 Support         : ${webglInfo.webgl2 ? "Available" : "Not available"}
WebGPU Support            : ${webglInfo.webgpu ? "Available" : "Not available"}
Browser-exposed GPU Vendor: ${webglInfo.vendor}
Browser-exposed GPU Renderer: ${webglInfo.renderer}
Max Texture Size          : ${webglInfo.maxTextureSize ? `${webglInfo.maxTextureSize}px` : "Unavailable"}
Max Viewport Dimensions   : ${webglInfo.maxViewportDims ? `${webglInfo.maxViewportDims}px` : "Unavailable"}

BROWSER IDENTITY
Inferred Browser          : ${identityInfo.browser}
Inferred Operating System : ${identityInfo.os}
Platform                  : ${hardwareInfo.platform}
Languages                 : ${identityInfo.languages}
Timezone                  : ${identityInfo.timezone}
User-Agent                : ${identityInfo.userAgent}

BROWSER CAPABILITIES
${capabilitiesList.map((c) => `${c.label.padEnd(28)}: ${c.available ? "Available" : "Not available"}`).join("\n")}

PERMISSIONS
Camera                    : ${permissions.camera}
Microphone                : ${permissions.microphone}
Geolocation               : ${permissions.geolocation}
Notifications             : ${permissions.notifications}
Clipboard Read            : ${permissions.clipboardRead}

STORAGE
Local Storage             : ${storageInfo.localStorage ? "Available" : "Not available"}
Session Storage           : ${storageInfo.sessionStorage ? "Available" : "Not available"}
IndexedDB                 : ${storageInfo.indexedDB ? "Available" : "Not available"}
Cache API                 : ${storageInfo.cacheStorage ? "Available" : "Not available"}
Service Worker Support    : ${storageInfo.serviceWorker ? "Available" : "Not available"}
Estimated Storage Quota   : ${storageInfo.quota || "Unavailable"}
Estimated Storage Usage   : ${storageInfo.usage || "Unavailable"}

BATTERY & SENSORS
Battery Status            : ${batteryInfo.supported && batteryInfo.level !== null ? `${batteryInfo.level}% (${batteryInfo.charging ? "Charging" : "Discharging"})` : "Not exposed by browser"}
Audio Context Sample Rate : ${audioInfo.sampleRate}

FINGERPRINTING SIGNALS
Exposed Signals           : Screen resolution, Browser Viewport, DPR, Color depth, Logical CPU cores, Approx. device memory, Timezone, Browser language list, Platform string, Touch capabilities, WebGL renderer, Audio sample rate.
Note: Browser fingerprinting combines technical configuration signals to distinguish or recognize browser environments. These signals may contribute to fingerprinting when combined with other information. Campusnode does not generate, log, or persist browser fingerprints.

CAMPUSNODE DATA HANDLING
Receives                  : Source IP address, User-Agent & request metadata, requested endpoint, session cookies/tokens when authenticated.
Processes                 : Session verification, rate limiting, brute-force & DDoS protection, event registration eligibility checks.
Stores                    : Explicit user account details, event participations, attendance records, verified payment transaction IDs, administrative export and security audit logs.
Not Collected             : Battery status, GPU renderer, exact GPS location, camera/mic streams, local device files, audio context sample rate.
`;

    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      showNotification("Diagnostic report copied to clipboard.", "success");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showNotification("Failed to copy diagnostic report to clipboard.", "error");
    }
  };

  return (
    <div className="min-h-screen bg-cn-bg myfont text-neutral-900 dark:text-neutral-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-7">

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-6 border-b border-neutral-200 dark:border-zinc-800">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-black dark:text-white">
              What Websites Can Access About You
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-2 max-w-2xl leading-relaxed">
              Websites can receive some information automatically through network requests and can access additional information through browser APIs. Some information requires user permission, and browser privacy protections can limit what is exposed.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 pt-1">
            <button
              onClick={fetchServerTelemetry}
              disabled={loadingBackend}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-neutral-200 dark:border-zinc-800 bg-cn-surface hover:bg-neutral-100 dark:hover:bg-zinc-800 text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
            >
              <RefreshCw size={13} className={loadingBackend ? "animate-spin text-brand-600" : ""} />
              <span>Refresh</span>
            </button>

            <button
              onClick={handleCopyReport}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg bg-brand-600 hover:bg-brand-500 text-white transition-colors cursor-pointer shadow-xs"
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              <span>{copied ? "Copied" : "Copy Diagnostic Report"}</span>
            </button>
          </div>
        </div>

        {/* Overview Tiles (Public IP, Approximate Location, Browser, Device) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl border border-neutral-200 dark:border-zinc-800 bg-cn-surface space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Public IP</span>
            <p className="font-mono text-base font-medium text-neutral-900 dark:text-neutral-100 truncate select-all">
              {serverMeta.ip}
            </p>
            <span className="text-[10px] text-neutral-400 block truncate">Server-derived request address</span>
          </div>

          <div className="p-4 rounded-xl border border-neutral-200 dark:border-zinc-800 bg-cn-surface space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Approximate Location</span>
            <p className="text-base font-medium text-neutral-900 dark:text-neutral-100 truncate">
              {serverMeta.location}
            </p>
            <span className="text-[10px] text-neutral-400 block truncate">Server-resolved IP geolocation</span>
          </div>

          <div className="p-4 rounded-xl border border-neutral-200 dark:border-zinc-800 bg-cn-surface space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Browser</span>
            <p className="text-base font-medium text-neutral-900 dark:text-neutral-100 truncate">
              {identityInfo.browser}
            </p>
            <span className="text-[10px] text-neutral-400 block truncate">Inferred from User-Agent</span>
          </div>

          <div className="p-4 rounded-xl border border-neutral-200 dark:border-zinc-800 bg-cn-surface space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Device</span>
            <p className="text-base font-medium text-neutral-900 dark:text-neutral-100 truncate">
              {identityInfo.classification}
            </p>
            <span className="text-[10px] text-neutral-400 block truncate">Inferred classification</span>
          </div>
        </div>

        {/* Section 01: Network & Server */}
        <section className="p-5 sm:p-6 rounded-xl border border-neutral-200 dark:border-zinc-800 bg-cn-surface space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-neutral-100 dark:border-zinc-800">
            <Wifi size={16} className="text-brand-600 dark:text-brand-400" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-black dark:text-white">
              01. Network & Server
            </h2>
          </div>

          <div className="divide-y divide-neutral-100 dark:divide-zinc-800/80 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 gap-1">
              <span className="text-neutral-500 dark:text-neutral-400">Public IP</span>
              <span className="font-mono font-medium text-neutral-900 dark:text-neutral-100 select-all">
                {serverMeta.ip}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 gap-1">
              <span className="text-neutral-500 dark:text-neutral-400">Approximate Location</span>
              <span className="font-medium text-neutral-900 dark:text-neutral-100">
                {serverMeta.location}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 gap-1">
              <span className="text-neutral-500 dark:text-neutral-400">Connection Security</span>
              <span className="font-medium text-neutral-900 dark:text-neutral-100">
                {serverMeta.secure ? "HTTPS connection" : "HTTP connection"}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 gap-1">
              <span className="text-neutral-500 dark:text-neutral-400">Online Status</span>
              <span className={`font-medium ${isOnline ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                {isOnline ? "Online" : "Offline"}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 gap-1">
              <span className="text-neutral-500 dark:text-neutral-400">Connection Type</span>
              <span className="font-medium text-neutral-900 dark:text-neutral-100">
                {networkInfo.type}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 gap-1">
              <span className="text-neutral-500 dark:text-neutral-400">Effective Connection Type</span>
              <span className="font-medium text-neutral-900 dark:text-neutral-100">
                {networkInfo.effectiveType}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 gap-1">
              <div>
                <span className="text-neutral-500 dark:text-neutral-400">Estimated Downlink</span>
                <span className="text-[10px] text-neutral-400 block sm:inline sm:ml-2">
                  (Browser-reported estimate; not a speed test)
                </span>
              </div>
              <span className="font-medium text-neutral-900 dark:text-neutral-100">
                {networkInfo.downlink}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 gap-1">
              <div>
                <span className="text-neutral-500 dark:text-neutral-400">Estimated RTT</span>
                <span className="text-[10px] text-neutral-400 block sm:inline sm:ml-2">
                  (Browser-reported round trip estimate)
                </span>
              </div>
              <span className="font-mono text-neutral-900 dark:text-neutral-100">
                {networkInfo.rtt}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 gap-1">
              <span className="text-neutral-500 dark:text-neutral-400">Save Data Mode</span>
              <span className="text-neutral-900 dark:text-neutral-100">
                {networkInfo.saveData ? "Enabled" : "Disabled / Not active"}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 gap-1">
              <span className="text-neutral-500 dark:text-neutral-400">Last Telemetry Check</span>
              <span className="font-mono text-neutral-500 dark:text-neutral-400 text-[11px]">
                {lastBackendCheck}
              </span>
            </div>
          </div>
          <p className="text-[11px] text-neutral-400 pt-1">
            Note: Public IP and location are server-derived via incoming request handling and IP geolocation resolution. Connection metrics are browser-reported estimates via the Network Information API.
          </p>
        </section>

        {/* Section 02 & 03: Hardware and Display (Side-by-side on lg) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Section 02: Device & Hardware */}
          <section className="p-5 sm:p-6 rounded-xl border border-neutral-200 dark:border-zinc-800 bg-cn-surface space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-neutral-100 dark:border-zinc-800">
              <Cpu size={16} className="text-brand-600 dark:text-brand-400" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-black dark:text-white">
                02. Device & Hardware
              </h2>
            </div>

            <div className="divide-y divide-neutral-100 dark:divide-zinc-800/80 text-xs">
              <div className="flex items-center justify-between py-2">
                <span className="text-neutral-500 dark:text-neutral-400">Device Classification</span>
                <span className="font-medium text-neutral-900 dark:text-neutral-100">
                  {identityInfo.classification}
                </span>
              </div>

              <div className="flex items-center justify-between py-2">
                <span className="text-neutral-500 dark:text-neutral-400">Operating Platform</span>
                <span className="font-mono text-neutral-900 dark:text-neutral-100">
                  {hardwareInfo.platform}
                </span>
              </div>

              <div className="flex items-center justify-between py-2">
                <span className="text-neutral-500 dark:text-neutral-400">Logical CPU Cores</span>
                <span className="font-mono font-medium text-neutral-900 dark:text-neutral-100">
                  {hardwareInfo.cores ? `${hardwareInfo.cores} logical cores` : "Unavailable"}
                </span>
              </div>

              <div className="py-2 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500 dark:text-neutral-400">Approx. Device Memory</span>
                  <span className="font-mono font-medium text-neutral-900 dark:text-neutral-100">
                    {hardwareInfo.memory ? `${hardwareInfo.memory} GB` : "Not exposed by browser"}
                  </span>
                </div>
                <p className="text-[10px] text-neutral-400">
                  Browser-reported estimate; actual physical memory may differ.
                </p>
              </div>

              <div className="flex items-center justify-between py-2">
                <span className="text-neutral-500 dark:text-neutral-400">Touch Support</span>
                <span className="font-medium text-neutral-900 dark:text-neutral-100">
                  {hardwareInfo.hasTouch ? "Supported" : "Not detected"}
                </span>
              </div>

              <div className="flex items-center justify-between py-2">
                <span className="text-neutral-500 dark:text-neutral-400">Maximum Touch Points</span>
                <span className="font-mono text-neutral-900 dark:text-neutral-100">
                  {hardwareInfo.maxTouchPoints}
                </span>
              </div>
            </div>
            <p className="text-[10px] text-neutral-400 pt-1">
              Device classification is inferred from User-Agent and is not physically verified hardware identification.
            </p>
          </section>

          {/* Section 03: Display */}
          <section className="p-5 sm:p-6 rounded-xl border border-neutral-200 dark:border-zinc-800 bg-cn-surface space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-neutral-100 dark:border-zinc-800">
              <Monitor size={16} className="text-brand-600 dark:text-brand-400" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-black dark:text-white">
                03. Display
              </h2>
            </div>

            <div className="divide-y divide-neutral-100 dark:divide-zinc-800/80 text-xs">
              <div className="flex items-center justify-between py-2">
                <span className="text-neutral-500 dark:text-neutral-400">Screen Resolution</span>
                <span className="font-mono font-medium text-neutral-900 dark:text-neutral-100">
                  {hardwareInfo.screenResolution}
                </span>
              </div>

              <div className="flex items-center justify-between py-2">
                <span className="text-neutral-500 dark:text-neutral-400">Browser Viewport</span>
                <span className="font-mono font-medium text-neutral-900 dark:text-neutral-100">
                  {viewportSize}
                </span>
              </div>

              <div className="flex items-center justify-between py-2">
                <span className="text-neutral-500 dark:text-neutral-400">Device Pixel Ratio (DPR)</span>
                <span className="font-mono font-medium text-neutral-900 dark:text-neutral-100">
                  {hardwareInfo.pixelRatio}
                </span>
              </div>

              <div className="flex items-center justify-between py-2">
                <span className="text-neutral-500 dark:text-neutral-400">Color Depth</span>
                <span className="font-mono font-medium text-neutral-900 dark:text-neutral-100">
                  {hardwareInfo.colorDepth}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-neutral-400 pt-1">
              Browser Viewport reflects the current inner window size and updates live when the window is resized.
            </p>
          </section>
        </div>

        {/* Section 04: Graphics / WebGL */}
        <section className="p-5 sm:p-6 rounded-xl border border-neutral-200 dark:border-zinc-800 bg-cn-surface space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-neutral-100 dark:border-zinc-800">
            <Sliders size={16} className="text-brand-600 dark:text-brand-400" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-black dark:text-white">
              04. Graphics / WebGL
            </h2>
          </div>

          <div className="divide-y divide-neutral-100 dark:divide-zinc-800/80 text-xs">
            <div className="flex items-center justify-between py-2">
              <span className="text-neutral-500 dark:text-neutral-400">WebGL 1.0 Support</span>
              <span className="font-medium text-neutral-900 dark:text-neutral-100">
                {webglInfo.webgl1 ? "Available" : "Not available"}
              </span>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-neutral-500 dark:text-neutral-400">WebGL 2.0 Support</span>
              <span className="font-medium text-neutral-900 dark:text-neutral-100">
                {webglInfo.webgl2 ? "Available" : "Not available"}
              </span>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-neutral-500 dark:text-neutral-400">WebGPU Support</span>
              <span className="font-medium text-neutral-900 dark:text-neutral-100">
                {webglInfo.webgpu ? "Available" : "Not available"}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 gap-1">
              <span className="text-neutral-500 dark:text-neutral-400">Browser-exposed GPU Vendor</span>
              <span className="font-mono text-neutral-900 dark:text-neutral-100">
                {webglInfo.vendor}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 gap-1">
              <span className="text-neutral-500 dark:text-neutral-400">Browser-exposed GPU Renderer</span>
              <span className="font-mono text-neutral-900 dark:text-neutral-100 break-all text-right max-w-xl">
                {webglInfo.renderer}
              </span>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-neutral-500 dark:text-neutral-400">Maximum Texture Size</span>
              <span className="font-mono text-neutral-900 dark:text-neutral-100">
                {webglInfo.maxTextureSize ? `${webglInfo.maxTextureSize}px` : "Unavailable"}
              </span>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-neutral-500 dark:text-neutral-400">Maximum Viewport Dimensions</span>
              <span className="font-mono text-neutral-900 dark:text-neutral-100">
                {webglInfo.maxViewportDims ? `${webglInfo.maxViewportDims}px` : "Unavailable"}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-neutral-400 pt-1">
            Note: The WebGL renderer is browser-exposed information and may be masked or standardized by browser anti-fingerprinting shields.
          </p>
        </section>

        {/* Section 05: Browser Identity */}
        <section className="p-5 sm:p-6 rounded-xl border border-neutral-200 dark:border-zinc-800 bg-cn-surface space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-neutral-100 dark:border-zinc-800">
            <Eye size={16} className="text-brand-600 dark:text-brand-400" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-black dark:text-white">
              05. Browser Identity
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-lg border border-neutral-100 dark:border-zinc-800 bg-neutral-50 dark:bg-zinc-900/50">
              <span className="text-neutral-400 block text-[10px] font-semibold uppercase tracking-wider">Inferred Browser</span>
              <span className="font-medium text-neutral-900 dark:text-neutral-100 text-sm mt-0.5 block">
                {identityInfo.browser}
              </span>
            </div>

            <div className="p-3 rounded-lg border border-neutral-100 dark:border-zinc-800 bg-neutral-50 dark:bg-zinc-900/50">
              <span className="text-neutral-400 block text-[10px] font-semibold uppercase tracking-wider">Inferred Operating System</span>
              <span className="font-medium text-neutral-900 dark:text-neutral-100 text-sm mt-0.5 block">
                {identityInfo.os}
              </span>
            </div>

            <div className="p-3 rounded-lg border border-neutral-100 dark:border-zinc-800 bg-neutral-50 dark:bg-zinc-900/50">
              <span className="text-neutral-400 block text-[10px] font-semibold uppercase tracking-wider">Platform</span>
              <span className="font-mono text-neutral-900 dark:text-neutral-100 text-sm mt-0.5 block">
                {hardwareInfo.platform}
              </span>
            </div>
          </div>

          <div className="space-y-1.5 pt-1">
            <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
              Browser-provided User-Agent:
            </span>
            <div className="p-3 rounded-lg bg-neutral-100 dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 font-mono text-[11px] text-neutral-800 dark:text-neutral-200 break-all select-all leading-relaxed">
              {identityInfo.userAgent}
            </div>
            <p className="text-[10px] text-neutral-400">
              Browser and operating-system values are inferred from browser-provided information and are not physical-device verification.
            </p>
          </div>
        </section>

        {/* Section 06: Browser Capabilities */}
        <section className="p-5 sm:p-6 rounded-xl border border-neutral-200 dark:border-zinc-800 bg-cn-surface space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-neutral-100 dark:border-zinc-800">
            <Sliders size={16} className="text-brand-600 dark:text-brand-400" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-black dark:text-white">
              06. Browser Capabilities
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
            {capabilitiesList.map(({ label, available }) => (
              <div
                key={label}
                className="flex items-center justify-between p-2.5 rounded-lg border border-neutral-100 dark:border-zinc-800/80 bg-neutral-50/50 dark:bg-zinc-900/30"
              >
                <span className="text-neutral-600 dark:text-neutral-300 truncate pr-2">{label}</span>
                <span className={`font-mono text-[11px] shrink-0 ${available ? "text-neutral-800 dark:text-neutral-200 font-medium" : "text-neutral-400"}`}>
                  {available ? "Available" : "Not available"}
                </span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-neutral-400">
            Capabilities reflect actual environment interface and runtime creation tests without prompting.
          </p>
        </section>

        {/* Section 07: Permissions */}
        <section className="p-5 sm:p-6 rounded-xl border border-neutral-200 dark:border-zinc-800 bg-cn-surface space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-neutral-100 dark:border-zinc-800">
            <Lock size={16} className="text-brand-600 dark:text-brand-400" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-black dark:text-white">
              07. Permissions
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            {Object.entries(permissions).map(([name, status]) => {
              const label = {
                camera: "Camera",
                microphone: "Microphone",
                geolocation: "Geolocation",
                notifications: "Notifications",
                clipboardRead: "Clipboard Read",
              }[name] || name;

              const statusColor = {
                Granted: "text-emerald-700 dark:text-emerald-400",
                Denied: "text-rose-700 dark:text-rose-400",
                Prompt: "text-neutral-700 dark:text-neutral-300",
              }[status] || "text-neutral-400";

              return (
                <div
                  key={name}
                  className="flex items-center justify-between p-3 rounded-lg border border-neutral-100 dark:border-zinc-800 bg-neutral-50/50 dark:bg-zinc-900/30"
                >
                  <span className="text-neutral-600 dark:text-neutral-400">{label}</span>
                  <span className={`font-medium ${statusColor}`}>
                    {status}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-neutral-50 dark:bg-zinc-900/50 border border-neutral-200 dark:border-zinc-800 text-[11px] text-neutral-500">
            <Info size={14} className="shrink-0 mt-0.5 text-neutral-400" />
            <span>
              Important: This diagnostic page only inspects permission status via the browser Permissions API and listens for status changes. It does not trigger permission dialogs or request access to your camera, microphone, or location.
            </span>
          </div>
        </section>

        {/* Section 08: Storage */}
        <section className="p-5 sm:p-6 rounded-xl border border-neutral-200 dark:border-zinc-800 bg-cn-surface space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-neutral-100 dark:border-zinc-800">
            <HardDrive size={16} className="text-brand-600 dark:text-brand-400" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-black dark:text-white">
              08. Storage
            </h2>
          </div>

          <div className="divide-y divide-neutral-100 dark:divide-zinc-800/80 text-xs">
            <div className="flex items-center justify-between py-2">
              <span className="text-neutral-500 dark:text-neutral-400">Local Storage</span>
              <span className="font-medium text-neutral-900 dark:text-neutral-100">
                {storageInfo.localStorage ? "Available" : "Not available"}
              </span>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-neutral-500 dark:text-neutral-400">Session Storage</span>
              <span className="font-medium text-neutral-900 dark:text-neutral-100">
                {storageInfo.sessionStorage ? "Available" : "Not available"}
              </span>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-neutral-500 dark:text-neutral-400">IndexedDB</span>
              <span className="font-medium text-neutral-900 dark:text-neutral-100">
                {storageInfo.indexedDB ? "Available" : "Not available"}
              </span>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-neutral-500 dark:text-neutral-400">Cache Storage API</span>
              <span className="font-medium text-neutral-900 dark:text-neutral-100">
                {storageInfo.cacheStorage ? "Available" : "Not available"}
              </span>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-neutral-500 dark:text-neutral-400">Service Worker Support</span>
              <span className="font-medium text-neutral-900 dark:text-neutral-100">
                {storageInfo.serviceWorker ? "Available" : "Not available"}
              </span>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-neutral-500 dark:text-neutral-400">Estimated Storage Quota</span>
              <span className="font-mono text-neutral-900 dark:text-neutral-100">
                {storageInfo.quota || "Unavailable"}
              </span>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-neutral-500 dark:text-neutral-400">Estimated Storage Usage</span>
              <span className="font-mono text-neutral-900 dark:text-neutral-100">
                {storageInfo.usage || "Unavailable"}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-neutral-400 pt-1">
            Browser-allocated storage quota estimate via StorageManager; does not represent physical disk capacity.
          </p>
        </section>

        {/* Section 09: Battery & Sensors */}
        <section className="p-5 sm:p-6 rounded-xl border border-neutral-200 dark:border-zinc-800 bg-cn-surface space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-neutral-100 dark:border-zinc-800">
            <Battery size={16} className="text-brand-600 dark:text-brand-400" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-black dark:text-white">
              09. Battery & Sensors
            </h2>
          </div>

          <div className="divide-y divide-neutral-100 dark:divide-zinc-800/80 text-xs">
            <div className="flex items-center justify-between py-2">
              <span className="text-neutral-500 dark:text-neutral-400">Battery Level</span>
              <span className="font-mono font-medium text-neutral-900 dark:text-neutral-100">
                {batteryInfo.supported && batteryInfo.level !== null ? `${batteryInfo.level}%` : "Not exposed by browser"}
              </span>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-neutral-500 dark:text-neutral-400">Charging State</span>
              <span className="font-medium text-neutral-900 dark:text-neutral-100">
                {batteryInfo.supported && batteryInfo.charging !== null
                  ? batteryInfo.charging ? "Charging" : "Discharging"
                  : "Unavailable"}
              </span>
            </div>

            {batteryInfo.supported && (
              <>
                <div className="flex items-center justify-between py-2">
                  <span className="text-neutral-500 dark:text-neutral-400">Time Until Fully Charged</span>
                  <span className="font-mono text-neutral-900 dark:text-neutral-100">
                    {batteryInfo.chargingTime ? `${Math.round(batteryInfo.chargingTime / 60)} minutes` : "N/A"}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2">
                  <span className="text-neutral-500 dark:text-neutral-400">Time Remaining on Battery</span>
                  <span className="font-mono text-neutral-900 dark:text-neutral-100">
                    {batteryInfo.dischargingTime ? `${Math.round(batteryInfo.dischargingTime / 60)} minutes` : "N/A"}
                  </span>
                </div>
              </>
            )}

            <div className="flex items-center justify-between py-2">
              <span className="text-neutral-500 dark:text-neutral-400">Audio Context Sample Rate</span>
              <span className="font-mono font-medium text-neutral-900 dark:text-neutral-100">
                {audioInfo.sampleRate}
              </span>
            </div>
          </div>

          {!batteryInfo.supported && (
            <p className="text-[11px] text-neutral-400 pt-1">
              Battery information is unavailable because this browser does not expose the Battery Status API.
            </p>
          )}
          <p className="text-[10px] text-neutral-400">
            Audio Context Sample Rate reflects the browser's audio processing context rate, not verified physical audio hardware.
          </p>
        </section>

        {/* Section 10: Browser Fingerprinting Surface */}
        <section className="p-5 sm:p-6 rounded-xl border border-neutral-200 dark:border-zinc-800 bg-cn-surface space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-neutral-100 dark:border-zinc-800">
            <Eye size={16} className="text-brand-600 dark:text-brand-400" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-black dark:text-white">
              10. Browser Fingerprinting Surface
            </h2>
          </div>

          <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
            Browser fingerprinting combines technical configuration signals to distinguish or recognize browser environments. These signals may contribute to fingerprinting when combined with other information:
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 text-xs">
            {[
              "Screen resolution",
              "Browser Viewport",
              "Device Pixel Ratio (DPR)",
              "Color depth",
              "Logical CPU cores",
              "Approx. device memory",
              "Timezone setting",
              "Browser language list",
              "Platform string",
              "Touch capabilities",
              "WebGL GPU renderer",
              "Audio sample rate",
            ].map((signal) => (
              <div
                key={signal}
                className="p-2.5 rounded-lg border border-neutral-100 dark:border-zinc-800 bg-neutral-50 dark:bg-zinc-900/40 text-neutral-700 dark:text-neutral-300 font-medium text-[11px]"
              >
                • {signal}
              </div>
            ))}
          </div>

          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed pt-1">
            Browser fingerprinting refers to scripts collecting technical configuration signals to distinguish devices without storing cookies. Campusnode does not generate, log, or persist browser fingerprints.
          </p>
        </section>

        {/* Section 11: What Websites Cannot Directly Access */}
        <section className="p-5 sm:p-6 rounded-xl border border-neutral-200 dark:border-zinc-800 bg-cn-surface space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-neutral-100 dark:border-zinc-800">
            <ShieldCheck size={16} className="text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-black dark:text-white">
              11. What Websites Cannot Directly Access
            </h2>
          </div>

          <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
            Browser security sandboxing and permissions create strict boundaries. Standard web pages cannot directly read these resources through ordinary browser APIs:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            {[
              "Local files and folder contents",
              "Passwords stored by your browser or password manager",
              "Browsing history across unrelated sites and tabs",
              "Exact physical location without an appropriate permission grant",
              "Camera video stream without explicit permission",
              "Microphone audio stream without explicit permission",
              "Screen capture without explicit permission",
              "Exact physical RAM modules or CPU serial numbers",
            ].map((item) => (
              <div
                key={item}
                className="flex items-start gap-2 p-2.5 rounded-lg border border-neutral-100 dark:border-zinc-800 bg-neutral-50/50 dark:bg-zinc-900/20 text-neutral-700 dark:text-neutral-300"
              >
                <span className="text-neutral-400 text-xs mt-0.5">•</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Section 12 & 13: Campusnode Data Handling */}
        <section className="p-5 sm:p-6 rounded-xl border border-neutral-200 dark:border-zinc-800 bg-cn-surface space-y-5">
          <div className="flex items-center gap-2 pb-2 border-b border-neutral-100 dark:border-zinc-800">
            <Terminal size={16} className="text-brand-600 dark:text-brand-400" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-black dark:text-white">
              12. Campusnode Data Handling
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl border border-neutral-100 dark:border-zinc-800 bg-neutral-50/60 dark:bg-zinc-900/40 space-y-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 block">
                Campusnode Receives
              </span>
              <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed">
                IP address associated with the network connection, User-Agent &amp; request metadata, requested endpoints, and authentication session cookies when signed in.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-neutral-100 dark:border-zinc-800 bg-neutral-50/60 dark:bg-zinc-900/40 space-y-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 block">
                Campusnode Processes
              </span>
              <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed">
                Authentication &amp; RBAC token verification, rate limiting, brute-force &amp; DDoS protection, event registration eligibility checks, and automated security login alerts.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-neutral-100 dark:border-zinc-800 bg-neutral-50/60 dark:bg-zinc-900/40 space-y-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 block">
                Campusnode Stores
              </span>
              <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed">
                Explicit account and profile records (name, roll number, department, college email), registered events, attendance logs, verified payment transaction IDs, and administrative export audit logs.
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-neutral-100 dark:border-zinc-800">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 block mb-2">
              Not Collected by Campusnode
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-neutral-600 dark:text-neutral-300">
              <div className="p-2 rounded bg-neutral-50 dark:bg-zinc-900/30 border border-neutral-100 dark:border-zinc-800">• Battery status or percentage</div>
              <div className="p-2 rounded bg-neutral-50 dark:bg-zinc-900/30 border border-neutral-100 dark:border-zinc-800">• GPU renderer or 3D capabilities</div>
              <div className="p-2 rounded bg-neutral-50 dark:bg-zinc-900/30 border border-neutral-100 dark:border-zinc-800">• Precise GPS coordinates</div>
              <div className="p-2 rounded bg-neutral-50 dark:bg-zinc-900/30 border border-neutral-100 dark:border-zinc-800">• Audio hardware parameters</div>
              <div className="p-2 rounded bg-neutral-50 dark:bg-zinc-900/30 border border-neutral-100 dark:border-zinc-800">• Local device files</div>
              <div className="p-2 rounded bg-neutral-50 dark:bg-zinc-900/30 border border-neutral-100 dark:border-zinc-800">• Camera or microphone feeds</div>
            </div>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-500">
            <span>For complete legal and compliance disclosures, consult our policy documents.</span>
            <div className="flex items-center gap-4">
              <Link to="/data-privacy" className="text-brand-600 dark:text-brand-400 font-medium hover:underline">
                Data Privacy Rules →
              </Link>
              <Link to="/privacy" className="text-brand-600 dark:text-brand-400 font-medium hover:underline">
                Privacy Policy →
              </Link>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
};

export default DeviceTelemetry;

