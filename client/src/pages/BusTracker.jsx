import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Bus, 
  Clock, 
  MapPin, 
  Gauge, 
  Calendar, 
  Maximize2, 
  Minimize2, 
  RotateCcw, 
  SlidersHorizontal, 
  Phone, 
  Mail, 
  ArrowLeft,
  Navigation,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Info
} from 'lucide-react';

const STOPS = {
  campus:     { lat: 31.39587, lng: 75.53584, name: "NITJ Campus", short: "NIT Campus" },
  bidhipur:   { lat: 31.401078, lng: 75.527261, name: "Bidhipur Entrance", short: "Bidhipur" },
  maqsudan:   { lat: 31.35080, lng: 75.56280, name: "Maqsudan (Vijay Resort)", short: "Maqsudan" },
  patelchowk: { lat: 31.32600, lng: 75.57620, name: "Patel Chowk", short: "Patel Chowk" }
};

function toM(h, m) { return h * 60 + m; }
function nowM(d) { return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60 + d.getMilliseconds() / 60000; }
function isWE(d) { const dw = d.getDay(); return dw === 0 || dw === 6; }

const LEGS = [
  { id: "R1a", days: "weekend", label: "Batch 1", color: "var(--color-warning-500, #f59e0b)", from: "campus", to: "bidhipur", dep: toM(14, 0), arr: toM(14, 5) },
  { id: "R1a", days: "weekend", label: "Batch 1", color: "var(--color-warning-500, #f59e0b)", from: "bidhipur", to: "campus", dep: toM(14, 15), arr: toM(14, 20) },
  { id: "R1a", days: "weekend", label: "Batch 1", color: "var(--color-warning-500, #f59e0b)", from: "campus", to: "patelchowk", dep: toM(14, 30), arr: toM(15, 15) },
  { id: "R1a", days: "weekend", label: "Batch 1", color: "var(--color-warning-500, #f59e0b)", from: "patelchowk", to: "campus", dep: toM(15, 35), arr: toM(16, 20) },
  
  { id: "R1b", days: "weekend", label: "Batch 2", color: "var(--color-success-500, #10b981)", from: "campus", to: "bidhipur", dep: toM(16, 45), arr: toM(16, 50) },
  { id: "R1b", days: "weekend", label: "Batch 2", color: "var(--color-success-500, #10b981)", from: "bidhipur", to: "campus", dep: toM(17, 0), arr: toM(17, 5) },
  { id: "R1b", days: "weekend", label: "Batch 2", color: "var(--color-success-500, #10b981)", from: "campus", to: "maqsudan", dep: toM(17, 15), arr: toM(17, 35) },
  { id: "R1b", days: "weekend", label: "Batch 2", color: "var(--color-success-500, #10b981)", from: "maqsudan", to: "campus", dep: toM(17, 45), arr: toM(18, 10) },
  
  { id: "R2",  days: "all",     label: "Evening", color: "var(--color-danger-500, #ef4444)", from: "campus", to: "bidhipur", dep: toM(18, 30), arr: toM(18, 35) },
  { id: "R2",  days: "all",     label: "Evening", color: "var(--color-danger-500, #ef4444)", from: "bidhipur", to: "campus", dep: toM(18, 45), arr: toM(18, 50) },
  { id: "R2",  days: "all",     label: "Evening", color: "var(--color-danger-500, #ef4444)", from: "campus", to: "patelchowk", dep: toM(19, 0), arr: toM(19, 45) },
  { id: "R2",  days: "all",     label: "Evening", color: "var(--color-danger-500, #ef4444)", from: "patelchowk", to: "campus", dep: toM(20, 0), arr: toM(20, 45) }
];

function legActive(leg, now) {
  if (leg.days === "weekend" && !isWE(now)) return false;
  const m = nowM(now);
  return m >= leg.dep && m <= leg.arr;
}

function legApplies(leg, now) {
  if (leg.days === "weekend" && !isWE(now)) return false;
  return true;
}

function haversineKm(a, b) {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

function bearing(a, b) {
  const la1 = a.lat * Math.PI / 180, la2 = b.lat * Math.PI / 180, dL = (b.lng - a.lng) * Math.PI / 180;
  return (Math.atan2(Math.sin(dL) * Math.cos(la2), Math.cos(la1) * Math.sin(la2) - Math.sin(la1) * Math.cos(la2) * Math.cos(dL)) * 180 / Math.PI + 360) % 360;
}

function lerp(a, b, t) { return { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t }; }

function toTimeFmt(m) {
  const h = Math.floor(m / 60), mn = Math.floor(m % 60), ap = h >= 12 ? "pm" : "am";
  return `${h > 12 ? h - 12 : h || 12}:${String(mn).padStart(2, "0")} ${ap}`;
}

function getBusSpeed(leg) {
  const km = haversineKm(STOPS[leg.from], STOPS[leg.to]);
  const totalMin = leg.arr - leg.dep;
  // Subtract stoppage / dwell time at station (~5 min for main legs, 1.5 min for short shuttle legs)
  const stoppageMin = totalMin > 10 ? 5 : 1.5;
  const netDriveMin = Math.max(1, totalMin - stoppageMin);
  const netDriveHours = netDriveMin / 60;
  let spd = km / netDriveHours;

  // Cruising transit speed guarantee above 30 & 35 km/h (ranging between 34-38 km/h)
  if (spd < 34) {
    spd = 34 + (Math.round(km * 10) % 4);
  } else if (spd > 45) {
    spd = 38;
  }
  return Math.round(spd);
}

function busSVG(color, deg) {
  return `<div style="position:relative;width:42px;height:42px;display:flex;align-items:center;justify-content:center">
    <div style="position:absolute;width:42px;height:42px;border-radius:50%;background:${color}44;animation:pulse 1.8s infinite"></div>
    <div class="bus-inner-icon" style="position:relative;width:34px;height:34px;border-radius:50%;background:var(--cn-surface, #ffffff);border:2.5px solid ${color};box-shadow:0 4px 12px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;transform:rotate(${deg}deg);transition:transform 0.3s cubic-bezier(0.25, 0.1, 0.25, 1.0)">
      <div style="position:absolute;top:-5px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:4.5px solid transparent;border-right:4.5px solid transparent;border-bottom:7px solid ${color}"></div>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="${color}">
        <path d="M18 4H6C4.34 4 3 5.34 3 7v10c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1V7c0-1.66-1.34-3-3-3zm-11 3h10v3H7V7zm1.5 9c-.83 0-1.5-.67-1.5-1.5S7.67 13 8.5 13s1.5.67 1.5 1.5S9.33 16 8.5 16zm7 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
      </svg>
    </div>
  </div>`;
}

const routePairs = [
  ["campus", "bidhipur"], ["bidhipur", "campus"],
  ["campus", "patelchowk"], ["patelchowk", "campus"],
  ["campus", "maqsudan"], ["maqsudan", "campus"],
  ["patelchowk", "maqsudan"], ["maqsudan", "bidhipur"]
];

const BusTracker = () => {
  const navigate = useNavigate();
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const busMarkersRef = useRef({});
  const routeCacheRef = useRef({});

  const [simMode, setSimMode] = useState(false);
  const [simDay, setSimDay] = useState("weekday");
  const [simTime, setSimTime] = useState("14:02");
  const [isExpandedMap, setIsExpandedMap] = useState(false);
  const [activeTab, setActiveTab] = useState("live");
  
  const [clockStr, setClockStr] = useState("--:--:--");
  const [dayStr, setDayStr] = useState("--");
  const [effDate, setEffDate] = useState(new Date());

  const [activeBuses, setActiveBuses] = useState([]);
  const [nextDeparture, setNextDeparture] = useState(null);
  const [estSpeed, setEstSpeed] = useState("—");
  const [etaCampus, setEtaCampus] = useState(null);

  // Set page title
  useEffect(() => {
    document.title = "Bus Tracker | CampusNode NITJ";
    window.scrollTo(0, 0);
  }, []);

  const getEffNow = () => {
    if (!simMode) return new Date();
    const [h, m] = simTime.split(":").map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    if (simDay === "weekend") {
      const dw = d.getDay();
      if (dw !== 0 && dw !== 6) d.setDate(d.getDate() + ((6 - dw + 7) % 7));
    } else {
      const dw = d.getDay();
      if (dw === 0) d.setDate(d.getDate() + 1);
      if (dw === 6) d.setDate(d.getDate() + 2);
    }
    return d;
  };

  // Fetch OSRM polyline routes for road accuracy
  const fetchRoute = async (fromKey, toKey) => {
    const key = `${fromKey}-${toKey}`;
    if (routeCacheRef.current[key]) return routeCacheRef.current[key];
    const f = STOPS[fromKey], t = STOPS[toKey];
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${f.lng},${f.lat};${t.lng},${t.lat}?geometries=geojson&overview=full`;
      const r = await fetch(url);
      const d = await r.json();
      if (d.routes && d.routes[0]) {
        const coords = d.routes[0].geometry.coordinates.map(c => ([c[1], c[0]]));
        routeCacheRef.current[key] = coords;
        return coords;
      }
    } catch (e) {}
    return [[f.lat, f.lng], [t.lat, t.lng]];
  };

  const getBusPos = (leg, now) => {
    const m = nowM(now);
    const t = Math.max(0, Math.min(1, (m - leg.dep) / (leg.arr - leg.dep)));
    const key = `${leg.from}-${leg.to}`;
    const coords = routeCacheRef.current[key];
    if (coords && coords.length > 1) {
      const idx = Math.floor(t * (coords.length - 1));
      const next = Math.min(idx + 1, coords.length - 1);
      const sub = t * (coords.length - 1) - idx;
      const a = { lat: coords[idx][0], lng: coords[idx][1] };
      const b = { lat: coords[next][0], lng: coords[next][1] };
      return lerp(a, b, sub);
    }
    return lerp(STOPS[leg.from], STOPS[leg.to], t);
  };

  const getBusBearing = (leg, now) => {
    const m = nowM(now);
    const t = Math.max(0, Math.min(1, (m - leg.dep) / (leg.arr - leg.dep)));
    const key = `${leg.from}-${leg.to}`;
    const coords = routeCacheRef.current[key];
    if (coords && coords.length > 1) {
      const idx = Math.min(Math.floor(t * (coords.length - 1)), coords.length - 2);
      const a = { lat: coords[idx][0], lng: coords[idx][1] };
      const b = { lat: coords[idx + 1][0], lng: coords[idx + 1][1] };
      return bearing(a, b);
    }
    return bearing(STOPS[leg.from], STOPS[leg.to]);
  };

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const L = window.L;
    if (!L) return;

    const map = L.map(mapContainerRef.current, {
      center: [31.370, 75.548],
      zoom: 13,
      minZoom: 12,
      maxZoom: 17,
      zoomControl: false
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 17
    }).addTo(map);

    // Stop markers
    const stopIcon = L.divIcon({
      className: "",
      html: `<div style="width:14px;height:14px;background:var(--cn-brand, #ea580c);border:2.5px solid var(--cn-surface, #ffffff);border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.35)"></div>`,
      iconAnchor: [7, 7]
    });

    Object.entries(STOPS).forEach(([k, s]) => {
      L.marker([s.lat, s.lng], { icon: stopIcon }).addTo(map)
        .bindPopup(`<div style="font-family:sans-serif;padding:2px"><strong style="color:var(--cn-text, #111)">${s.name}</strong></div>`);
      
      L.tooltip({ permanent: true, direction: "top", offset: [0, -10] })
        .setContent(s.short)
        .setLatLng([s.lat, s.lng])
        .addTo(map);
    });

    // Draw route lines
    const routeColor = getComputedStyle(document.documentElement).getPropertyValue('--cn-brand').trim() || "#ea580c";
    routePairs.forEach(async ([a, b]) => {
      const key = `${a}-${b}`;
      const coords = await fetchRoute(a, b);
      L.polyline(coords, { color: routeColor, weight: 3, opacity: 0.45, dashArray: "6 6" }).addTo(map);
    });

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update bus markers and stats on interval
  useEffect(() => {
    const L = window.L;
    let animationFrameId;
    let lastStateUpdate = 0;

    const simStartPerf = performance.now();
    const [simH, simM] = simTime.split(":").map(Number);

    const animate = () => {
      const perfNow = performance.now();
      let now;

      if (simMode) {
        const elapsedMs = perfNow - simStartPerf;
        now = new Date();
        now.setHours(simH, simM, 0, 0);
        now.setTime(now.getTime() + elapsedMs);

        if (simDay === "weekend") {
          const dw = now.getDay();
          if (dw !== 0 && dw !== 6) now.setDate(now.getDate() + ((6 - dw + 7) % 7));
        } else {
          const dw = now.getDay();
          if (dw === 0) now.setDate(now.getDate() + 1);
          if (dw === 6) now.setDate(now.getDate() + 2);
        }
      } else {
        now = new Date();
      }

      const m = nowM(now);
      const active = LEGS.filter(l => legActive(l, now));

      // 60 FPS continuous Leaflet marker position & rotation updates
      if (mapInstanceRef.current && L) {
        const seen = new Set();

        active.forEach(leg => {
          const pos = getBusPos(leg, now);
          const deg = getBusBearing(leg, now);
          const markerId = `${leg.id}-${leg.from}-${leg.to}`;

          if (!busMarkersRef.current[markerId]) {
            const icon = L.divIcon({ className: "", html: busSVG(leg.color, deg), iconAnchor: [21, 21] });
            busMarkersRef.current[markerId] = L.marker([pos.lat, pos.lng], { icon, zIndexOffset: 1000 }).addTo(mapInstanceRef.current);
            busMarkersRef.current[markerId]._lastDeg = deg;
          } else {
            // Fluid 60fps marker translation
            busMarkersRef.current[markerId].setLatLng([pos.lat, pos.lng]);

            // Smooth inner icon rotation update
            if (Math.abs((busMarkersRef.current[markerId]._lastDeg || 0) - deg) > 0.5) {
              busMarkersRef.current[markerId]._lastDeg = deg;
              const el = busMarkersRef.current[markerId].getElement();
              if (el) {
                const inner = el.querySelector('.bus-inner-icon');
                if (inner) {
                  inner.style.transform = `rotate(${deg}deg)`;
                }
              }
            }
          }
          seen.add(markerId);
        });

        // Remove inactive bus markers
        Object.keys(busMarkersRef.current).forEach(id => {
          if (!seen.has(id)) {
            mapInstanceRef.current.removeLayer(busMarkersRef.current[id]);
            delete busMarkersRef.current[id];
          }
        });
      }

      // Throttle React state updates to ~2Hz (500ms) for maximum performance
      if (perfNow - lastStateUpdate > 500) {
        lastStateUpdate = perfNow;
        setEffDate(now);

        const h = now.getHours(), mn = now.getMinutes(), s = now.getSeconds();
        setClockStr(`${String(h).padStart(2, "0")}:${String(mn).padStart(2, "0")}:${String(s).padStart(2, "0")}`);

        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        setDayStr(days[now.getDay()]);

        setActiveBuses(active);

        const speeds = active.map(leg => getBusSpeed(leg));

        const next = LEGS.filter(l => legApplies(l, now) && l.from === "campus" && l.dep > m).sort((a, b) => a.dep - b.dep)[0];
        setNextDeparture(next);

        setEstSpeed(speeds.length ? `${Math.round(Math.max(...speeds))}` : "—");

        const camReturn = active.find(l => l.to === "campus");
        setEtaCampus(camReturn);
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [simMode, simDay, simTime]);

  // Recenter Map on Campus
  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([31.370, 75.548], 13);
    }
  };

  return (
    <div className="min-h-screen myfont bg-cn-bg text-neutral-900 dark:text-neutral-100 transition-colors duration-300 pb-20">
      
      <div className="bg-white/80 dark:bg-neutral-900/80 border-b border-neutral-200 dark:border-neutral-800 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate(-1)}
              className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
              aria-label="Go Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-brand-600/10 text-brand-600 flex items-center justify-center">
                <Bus className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-neutral-900 dark:text-white leading-tight">
                  NITJ Bus Tracker
                </h1>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 hidden sm:block">
                  Live road-accurate transit coordinates
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-neutral-100 dark:bg-neutral-800 px-3 py-1.5 rounded-full border border-neutral-200 dark:border-neutral-700">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-mono text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                {clockStr}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-brand-500/10 text-brand-600 dark:text-brand-400 px-2 py-0.5 rounded-full">
                {dayStr}
              </span>
            </div>

            <button
              onClick={() => setSimMode(!simMode)}
              className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                simMode 
                  ? "bg-brand-600 text-white border-brand-600 shadow-sm" 
                  : "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:border-brand-500"
              }`}
              title="Toggle simulator mode"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden md:inline">{simMode ? "Simulating" : "Simulate"}</span>
            </button>
          </div>

        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {simMode && (
          <div className="bg-brand-500/5 border border-brand-500/20 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-2 text-xs font-bold text-brand-600 dark:text-brand-400">
              <Clock className="w-4 h-4" />
              <span>TEST TIME SIMULATOR</span>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div className="flex items-center gap-2">
                <label className="text-neutral-600 dark:text-neutral-400 font-medium">Day:</label>
                <select
                  value={simDay}
                  onChange={(e) => setSimDay(e.target.value)}
                  className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-neutral-900 dark:text-neutral-100 font-medium"
                >
                  <option value="weekday">Weekday (Mon–Fri)</option>
                  <option value="weekend">Sat / Sun</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-neutral-600 dark:text-neutral-400 font-medium">Time:</label>
                <input
                  type="time"
                  value={simTime}
                  onChange={(e) => setSimTime(e.target.value)}
                  className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-neutral-900 dark:text-neutral-100 font-medium"
                />
              </div>

              <button
                onClick={() => {
                  setSimMode(false);
                }}
                className="inline-flex items-center gap-1 bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Real Time
              </button>
            </div>
          </div>
        )}

        <div className={`relative bg-neutral-100 dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden transition-all duration-300 shadow-sm ${
          isExpandedMap ? "h-[620px]" : "h-[340px] sm:h-[400px]"
        }`}>
          
          <div ref={mapContainerRef} className="w-full h-full z-10" />

          <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
            <button
              onClick={handleRecenter}
              className="bg-white/90 dark:bg-neutral-900/90 text-neutral-700 dark:text-neutral-200 hover:text-brand-600 dark:hover:text-brand-400 p-2 rounded-xl shadow-md border border-neutral-200 dark:border-neutral-800 backdrop-blur-md transition-all cursor-pointer"
              title="Recenter Map"
            >
              <Navigation className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsExpandedMap(!isExpandedMap)}
              className="bg-white/90 dark:bg-neutral-900/90 text-neutral-700 dark:text-neutral-200 hover:text-brand-600 dark:hover:text-brand-400 px-3 py-2 rounded-xl shadow-md border border-neutral-200 dark:border-neutral-800 backdrop-blur-md transition-all cursor-pointer text-xs font-semibold flex items-center gap-1.5"
            >
              {isExpandedMap ? (
                <>
                  <Minimize2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Compact View</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Expand Map</span>
                </>
              )}
            </button>
          </div>

          <div className="absolute bottom-3 left-3 z-20 bg-white/90 dark:bg-neutral-900/90 border border-neutral-200 dark:border-neutral-800 px-3 py-2 rounded-xl backdrop-blur-md text-[11px] font-medium text-neutral-600 dark:text-neutral-400 shadow-md flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-brand-600" />
            <span>Campus ↔ Bidhipur ↔ Maqsudan ↔ Patel Chowk</span>
          </div>

        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              Active Buses
            </p>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white">
                {activeBuses.length}
              </span>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                {activeBuses.length > 0 ? "Running" : "Idle"}
              </span>
            </div>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">on route now</p>
          </div>

          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              Next Departure
            </p>
            <div className="mt-2">
              <span className="text-xl sm:text-2xl font-black text-brand-600 dark:text-brand-500">
                {nextDeparture ? (
                  (() => {
                    const diff = Math.round(nextDeparture.dep - nowM(effDate));
                    return diff < 60 ? `${diff}m` : `${Math.floor(diff / 60)}h ${diff % 60}m`;
                  })()
                ) : "—"}
              </span>
            </div>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 truncate">
              {nextDeparture ? `${toTimeFmt(nextDeparture.dep)} from campus` : (isWE(effDate) ? "no more today" : "eve batch 6:30 pm")}
            </p>
          </div>

          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              Est. Speed
            </p>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white">
                {estSpeed}
              </span>
              <span className="text-xs font-semibold text-neutral-500">km/h</span>
            </div>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">average leg speed</p>
          </div>

          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              ETA to Campus
            </p>
            <div className="mt-2">
              <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {etaCampus ? (
                  (() => {
                    const left = Math.round(etaCampus.arr - nowM(effDate));
                    return left > 0 ? `${left}m` : "arriving";
                  })()
                ) : "—"}
              </span>
            </div>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 truncate">
              {etaCampus ? `arrives ${toTimeFmt(etaCampus.arr)}` : "no bus returning now"}
            </p>
          </div>

        </div>

        <div className="flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-3">
          <button
            onClick={() => setActiveTab("live")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "live"
                ? "bg-brand-600 text-white shadow-sm"
                : "bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
            }`}
          >
            <Bus className="w-4 h-4" />
            <span>Live View</span>
          </button>
          
          <button
            onClick={() => setActiveTab("schedule")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "schedule"
                ? "bg-brand-600 text-white shadow-sm"
                : "bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Full Schedule</span>
          </button>
        </div>

        {activeTab === "live" ? (
          <div className="space-y-4">
            {activeBuses.length === 0 ? (
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-10 text-center shadow-sm">
                <div className="w-12 h-12 rounded-full bg-brand-500/10 text-brand-600 flex items-center justify-center mx-auto mb-3">
                  <Bus className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-base text-neutral-900 dark:text-white mb-1">
                  No buses currently on route
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto leading-relaxed">
                  {nextDeparture 
                    ? `Next bus leaves from NIT Campus in ${Math.round(nextDeparture.dep - nowM(effDate))} min (${toTimeFmt(nextDeparture.dep)})` 
                    : isWE(effDate) 
                      ? "No more bus trips scheduled for today" 
                      : "Evening batch leaves at 6:30 pm (all week)"}
                </p>
              </div>
            ) : (
              activeBuses.map((leg, idx) => {
                const m = nowM(effDate);
                const km = haversineKm(STOPS[leg.from], STOPS[leg.to]);
                const spd = getBusSpeed(leg);
                const left = Math.round(leg.arr - m);
                const pct = Math.round(Math.max(0, Math.min(1, (m - leg.dep) / (leg.arr - leg.dep))) * 100);

                return (
                  <div 
                    key={idx} 
                    className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm space-y-3 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div 
                          className="w-3.5 h-3.5 rounded-full shrink-0" 
                          style={{ backgroundColor: leg.color }}
                        />
                        <h4 className="font-bold text-sm text-neutral-900 dark:text-white">
                          {STOPS[leg.from].short} → {STOPS[leg.to].short}
                        </h4>
                      </div>

                      <span 
                        className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                        style={{ backgroundColor: `${leg.color}18`, color: leg.color }}
                      >
                        {leg.label}
                      </span>
                    </div>

                    <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-full h-2 overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-1000 ease-linear"
                        style={{ width: `${pct}%`, backgroundColor: leg.color }}
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">
                      <span className="flex items-center gap-1">
                        <Gauge className="w-3.5 h-3.5 text-neutral-400" />
                        <strong>{spd}</strong> km/h
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-neutral-400" />
                        <strong>{left > 0 ? `${left} min left` : "arriving"}</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                        <strong>{km.toFixed(1)}</strong> km
                      </span>
                      <span className="font-semibold text-neutral-800 dark:text-neutral-200 ml-auto">
                        {pct}% completed
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm space-y-6">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-4">
              <div>
                <h3 className="font-bold text-base text-neutral-900 dark:text-white">
                  Official Transport Schedule
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Effective from 27 July 2026 • NIT Jalandhar
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold bg-brand-500/10 text-brand-600 dark:text-brand-400 px-3 py-1 rounded-full">
                  Campus Service
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-500 flex items-center gap-1.5">
                <ChevronRight className="w-3.5 h-3.5" />
                Saturday & Sunday — Afternoon Batch 1
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-400">
                      <th className="py-2 px-3 font-semibold">Departs</th>
                      <th className="py-2 px-3 font-semibold">Stops & Route</th>
                      <th className="py-2 px-3 font-semibold">Returns</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 text-neutral-800 dark:text-neutral-200">
                    <tr>
                      <td className="py-3 px-3 font-bold text-brand-600 dark:text-brand-400">2:00 PM – Campus</td>
                      <td className="py-3 px-3">→ Bidhipur → Campus → Patel Chowk</td>
                      <td className="py-3 px-3 font-medium">4:20 PM via Maqsudan, Bidhipur</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <ChevronRight className="w-3.5 h-3.5" />
                Saturday & Sunday — Afternoon Batch 2
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-400">
                      <th className="py-2 px-3 font-semibold">Departs</th>
                      <th className="py-2 px-3 font-semibold">Stops & Route</th>
                      <th className="py-2 px-3 font-semibold">Returns</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 text-neutral-800 dark:text-neutral-200">
                    <tr>
                      <td className="py-3 px-3 font-bold text-emerald-600 dark:text-emerald-400">4:45 PM – Campus</td>
                      <td className="py-3 px-3">→ Bidhipur → Campus → Maqsudan</td>
                      <td className="py-3 px-3 font-medium">6:10 PM via Bidhipur</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                <ChevronRight className="w-3.5 h-3.5" />
                All Week — Evening Batch
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-400">
                      <th className="py-2 px-3 font-semibold">Departs</th>
                      <th className="py-2 px-3 font-semibold">Stops & Route</th>
                      <th className="py-2 px-3 font-semibold">Returns</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 text-neutral-800 dark:text-neutral-200">
                    <tr>
                      <td className="py-3 px-3 font-bold text-rose-600 dark:text-rose-400">6:30 PM – Campus</td>
                      <td className="py-3 px-3">→ Bidhipur → Campus → Patel Chowk</td>
                      <td className="py-3 px-3 font-medium">8:45 PM via Maqsudan, Bidhipur</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-neutral-500 dark:text-neutral-400">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-brand-600 shrink-0" />
                <span>Transport Incharge Helpline:</span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <a 
                  href="tel:+919876204794"
                  className="inline-flex items-center gap-1.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 px-3 py-1.5 rounded-lg font-semibold transition-colors"
                >
                  <Phone className="w-3.5 h-3.5 text-emerald-500" />
                  +91 98762 04794
                </a>
                <a 
                  href="mailto:transportincharge@nitj.ac.in"
                  className="inline-flex items-center gap-1.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 px-3 py-1.5 rounded-lg font-semibold transition-colors"
                >
                  <Mail className="w-3.5 h-3.5 text-brand-500" />
                  transportincharge@nitj.ac.in
                </a>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};

export default BusTracker;
