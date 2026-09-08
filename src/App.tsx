import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import SatMap, { type BBoxCoords, type SatMapHandle } from "./SatMap";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

/* ── Types ───────────────────────────────────────────────────── */
type Task = "single" | "compare" | "highlight";
type InputTab = "upload" | "draw";
type Screen = "input" | "loading" | "results";

/* ── Design tokens — Command Center dark theme ───────────────── */
const BG          = "#090D16";                       // obsidian backdrop
const PANEL       = "rgba(17,24,39,0.82)";           // navy frosted glass
const BORDER      = "rgba(6,182,212,0.22)";          // cyan-500/22
const BORDER_SOFT = "rgba(6,182,212,0.15)";          // cyan-500/15 subtle
const SHADOW      = "0 0 0 1px rgba(6,182,212,0.10), 0 4px 16px rgba(0,0,0,0.45), 0 12px 32px rgba(0,0,0,0.35)";
const SHADOW_HOVER = "0 0 0 1px rgba(6,182,212,0.35), 0 0 20px rgba(6,182,212,0.25), 0 8px 32px rgba(0,0,0,0.55)";
const SHADOW_SM   = "0 0 0 1px rgba(6,182,212,0.12), 0 2px 8px rgba(0,0,0,0.40)";
const TEXT        = "#ffffff";                       // crisp white
const MUTED       = "rgba(207,250,254,0.65)";        // ice-blue secondary
const SUBTLE      = "rgba(207,250,254,0.38)";        // ice-blue tertiary
const CYAN        = "#06b6d4";                       // electric cyan
const GRAD        = "linear-gradient(135deg, #06b6d4 0%, #2563eb 55%, #4f46e5 100%)"; // cyan→blue→violet
const COP_BLUE    = CYAN;                            // alias for gradient accents
const COP_LIGHT   = "rgba(6,182,212,0.12)";          // cyan tint
const GREEN       = "#34d399";                       // neon emerald-400
const GREEN_BG    = "rgba(52,211,153,0.12)";         // emerald tint
const AMBER       = "#fbbf24";                       // glowing amber-400
const AMBER_BG    = "rgba(251,191,36,0.12)";
const MAGENTA     = "#f472b6";                       // electric pink-400
const MAGENTA_BG  = "rgba(244,114,182,0.12)";

/* ── Locked result map ───────────────────────────────────────── */
const ESRI_SAT = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const ESRI_SAT_ATTR = "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community";

function BoundsFitter({ bounds }: { bounds: BBoxCoords | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds([[bounds.south, bounds.west], [bounds.north, bounds.east]], { animate: false, padding: [0, 0] });
    } else {
      map.setView([20, 0], 2, { animate: false });
    }
  }, [map, bounds]);
  return null;
}

function ResultMap({
  bounds, mapId, style,
}: {
  bounds: BBoxCoords | null;
  mapId: string;
  style?: React.CSSProperties;
}) {
  return (
    <MapContainer
      key={mapId}
      center={[20, 0]}
      zoom={2}
      zoomControl={false}
      dragging={false}
      scrollWheelZoom={false}
      doubleClickZoom={false}
      touchZoom={false}
      keyboard={false}
      attributionControl={false}
      style={{ width: "100%", height: "100%", ...style }}
    >
      <TileLayer url={ESRI_SAT} attribution={ESRI_SAT_ATTR} maxZoom={19} />
      <BoundsFitter bounds={bounds} />
    </MapContainer>
  );
}

/* ── Logo ────────────────────────────────────────────────────── */
function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center"
        style={{ background: GRAD, boxShadow: `0 0 12px rgba(6,182,212,0.5)` }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="2.5" fill="white" />
          <rect x="2" y="7.25" width="3" height="1.5" rx="0.75" fill="white" opacity="0.75" />
          <rect x="11" y="7.25" width="3" height="1.5" rx="0.75" fill="white" opacity="0.75" />
          <rect x="7.25" y="2" width="1.5" height="3" rx="0.75" fill="white" opacity="0.75" />
          <rect x="7.25" y="11" width="1.5" height="3" rx="0.75" fill="white" opacity="0.75" />
        </svg>
      </div>
      <div>
        <span className="font-semibold text-sm tracking-tight" style={{ color: TEXT }}>
          SatQuery
        </span>
        <span className="font-semibold text-sm tracking-tight" style={{ color: CYAN }}> AI</span>
      </div>
    </div>
  );
}

/* ── Card wrapper ────────────────────────────────────────────── */
const card: React.CSSProperties = {
  background: PANEL,
  border: `1px solid ${BORDER}`,
  boxShadow: SHADOW,
  borderRadius: "12px",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
};

/* ── Toggle ──────────────────────────────────────────────────── */
function Toggle({
  value, onChange, options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { id: string; label: string }[];
}) {
  return (
    <div
      className="inline-flex p-1 w-full"
      style={{ background: "rgba(9,13,22,0.70)", border: `1px solid ${BORDER}`, borderRadius: "10px" }}
    >
      {options.map((o) => {
        const active = value === o.id;
        return (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            className="flex-1 px-4 py-1.5 text-sm font-medium"
            style={{
              borderRadius: "7px",
              background: active ? GRAD : "transparent",
              color: active ? "#fff" : MUTED,
              boxShadow: active
                ? "0 0 14px rgba(6,182,212,0.45), 0 2px 8px rgba(79,70,229,0.30)"
                : "none",
              fontWeight: active ? 600 : 400,
              border: "none",
              cursor: "pointer",
              transition: "all 0.22s cubic-bezier(0.22,1,0.36,1)",
              transform: active ? "scale(1)" : "scale(0.98)",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}


/* ── Coordinate badge (results view image overlay) ───────────── */
function CoordBadge({ bounds }: { bounds: BBoxCoords | null }) {
  const text = bounds
    ? `${Math.abs(bounds.north).toFixed(3)}°${bounds.north >= 0 ? "N" : "S"} / ${Math.abs(bounds.east).toFixed(3)}°${bounds.east >= 0 ? "E" : "W"}`
    : "Source: Uploaded File";

  return (
    <div
      style={{
        position: "absolute", bottom: 12, right: 12, zIndex: 801,
        display: "flex", alignItems: "center", gap: 6,
        padding: "5px 10px", fontSize: 11, fontWeight: 500,
        background: "rgba(15,23,42,0.72)",
        backdropFilter: "blur(6px)",
        color: bounds ? "#bae6fd" : "#94a3b8",
        border: "1px solid rgba(255,255,255,0.14)",
        borderRadius: "6px",
        whiteSpace: "nowrap",
        letterSpacing: "0.01em",
      }}
    >
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0 }}>
        <circle cx="5" cy="5" r="4" stroke="#7dd3fc" strokeWidth="1.2" />
        <circle cx="5" cy="5" r="1.5" fill="#7dd3fc" />
      </svg>
      {text}
    </div>
  );
}

/* ── AI copy ─────────────────────────────────────────────────── */
const AI_ANSWERS: Record<Task, string> = {
  single:
    "The captured scene shows a densely vegetated lowland basin at approximately 450 m elevation. The dominant land cover is broadleaf tropical forest, accounting for roughly 68% of the frame. A narrow river corridor is visible along the eastern margin, with evidence of alluvial deposition. No significant built infrastructure is detectable within the selected extent. Atmospheric haze is minimal; image quality is rated high for downstream classification tasks.",
  compare:
    "Comparing the two acquisitions separated by 14 months, the analysis identifies three primary change zones. The north-western quadrant shows a net forest loss of approximately 340 hectares, consistent with agricultural expansion. A new linear feature — likely a road or canal — has appeared in the central sector. The eastern riparian buffer has contracted, indicating a ~12% reduction in permanent water surface. Urban edge pixels have increased by 8.4% in the southern margin, suggesting peri-urban growth.",
  highlight:
    "The model has identified and delineated three distinct land-cover classes within the queried region. Dense forest canopy covers the upper-left sector at high confidence, consistent with mature broadleaf woodland. Active cropland dominates the lower two-thirds of the frame, showing regular field geometry typical of arable agriculture. A narrow water body runs along the right margin, likely an irrigation channel or small river course.",
};

const CONFIDENCE: Record<Task, { score: number; label: string }> = {
  single:    { score: 91, label: "High" },
  compare:   { score: 87, label: "High" },
  highlight: { score: 83, label: "Medium" },
};

/* ── Bi-Temporal chart ───────────────────────────────────────── */
const CHANGE_DATA = [
  { category: "Urban Area",   Past: 12, Present: 34 },
  { category: "Forest Cover", Past: 68, Present: 45 },
  { category: "Water Bodies", Past: 20, Present: 18 },
];

function ChangeChart() {
  return (
    <div className="mt-5">
      <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: MUTED }}>
        Land Cover Change (km²)
      </p>
      <div style={{ ...card, padding: "16px 12px 8px" }}>
        <ResponsiveContainer width="100%" height={190}>
          <BarChart data={CHANGE_DATA} barCategoryGap="32%" barGap={4}>
            <CartesianGrid vertical={false} stroke="rgba(6,182,212,0.10)" strokeDasharray="3 3" />
            <XAxis
              dataKey="category"
              tick={{ fontSize: 11, fill: MUTED as string, fontFamily: "Inter, sans-serif" }}
              axisLine={false} tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: MUTED as string, fontFamily: "Inter, sans-serif" }}
              axisLine={false} tickLine={false}
              unit=" km²" width={50}
            />
            <Tooltip
              contentStyle={{
                background: "rgba(9,13,22,0.92)",
                border: `1px solid ${BORDER}`,
                borderRadius: "10px",
                fontSize: 12,
                fontFamily: "Inter, sans-serif",
                color: TEXT,
                boxShadow: SHADOW,
              }}
              formatter={(value: unknown, name: unknown) => [`${value} km²`, String(name)]}
              cursor={{ fill: "rgba(6,182,212,0.06)" }}
            />
            <Legend
              content={() => (
                <div className="flex items-center justify-center gap-5 pt-2" style={{ fontSize: 12 }}>
                  {[
                    { color: MAGENTA, label: "Past (2021)"    },
                    { color: CYAN,    label: "Present (2026)" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-1.5">
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: item.color, flexShrink: 0 }} />
                      <span style={{ color: MUTED }}>{item.label}</span>
                    </div>
                  ))}
                </div>
              )}
            />
            <Bar dataKey="Past"    fill={MAGENTA} radius={[3, 3, 0, 0]} />
            <Bar dataKey="Present" fill={CYAN}    radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ── Hover-aware card ────────────────────────────────────────── */
function HoverCard({
  children, className = "", base, hovered,
}: {
  children: React.ReactNode;
  className?: string;
  base: React.CSSProperties;
  hovered: React.CSSProperties;
}) {
  const [over, setOver] = useState(false);
  return (
    <div
      className={className}
      style={{
        ...base,
        ...(over ? hovered : {}),
        transform: over ? "translateY(-2px)" : "translateY(0)",
        transition: "all 0.28s cubic-bezier(0.22,1,0.36,1)",
        cursor: "default",
      }}
      onMouseEnter={() => setOver(true)}
      onMouseLeave={() => setOver(false)}
    >
      {children}
    </div>
  );
}

/* ── Export button with mock PDF generation state ────────────── */
type ExportState = "idle" | "generating" | "done";

function ExportButton() {
  const [state, setState] = useState<ExportState>("idle");

  const handleClick = () => {
    if (state !== "idle") return;
    setState("generating");
    setTimeout(() => {
      setState("done");
      setTimeout(() => setState("idle"), 3000);
    }, 2000);
  };

  return (
    <button
      onClick={handleClick}
      disabled={state !== "idle"}
      className="mt-4 w-full py-3 text-sm font-semibold flex items-center justify-center gap-2"
      style={{
        ...card,
        cursor: state === "idle" ? "pointer" : "default",
        color: state === "done" ? GREEN : MUTED,
        border: `1px solid ${state === "done" ? "rgba(52,211,153,0.45)" : BORDER}`,
        background: state === "done" ? GREEN_BG : PANEL,
        transition: "all 0.28s cubic-bezier(0.22,1,0.36,1)",
        transform: "translateY(0)",
      }}
      onMouseEnter={(e) => {
        if (state !== "idle") return;
        (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)";
        (e.currentTarget as HTMLButtonElement).style.boxShadow = SHADOW_HOVER;
        (e.currentTarget as HTMLButtonElement).style.borderColor = CYAN;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
        (e.currentTarget as HTMLButtonElement).style.boxShadow = SHADOW;
        (e.currentTarget as HTMLButtonElement).style.borderColor = BORDER;
      }}
      onMouseDown={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)"; }}
    >
      {state === "idle" && (
        <>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 2v7M5 6.5L7 8.5 9 6.5" stroke={MUTED} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M2 11h10" stroke={MUTED} strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Export Report (.PDF)
        </>
      )}
      {state === "generating" && (
        <>
          <div
            className="spin"
            style={{ width: 14, height: 14, borderRadius: "50%", border: `2px solid rgba(6,182,212,0.20)`, borderTopColor: CYAN, flexShrink: 0 }}
          />
          Generating PDF...
        </>
      )}
      {state === "done" && (
        <>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2.5 7l3 3 6-6" stroke={GREEN} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Report Downloaded
        </>
      )}
    </button>
  );
}

/* ── Right column: query + answer ───────────────────────────── */
function AnswerPanel({ task, question }: { task: Task; question: string }) {
  const conf = CONFIDENCE[task];
  const displayQuestion = question.trim()
    ? question.trim()
    : "Describe the land cover in this satellite image.";

  return (
    <div
      className="flex flex-col overflow-y-auto flex-shrink-0"
      style={{ width: "440px", borderLeft: `1px solid ${BORDER}`, background: "rgba(9,13,22,0.85)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", boxShadow: "-4px 0 32px rgba(0,0,0,0.45)" }}
    >
      <div style={{ padding: "32px 32px 28px" }}>
        {/* User query */}
        <div className="mb-6 enter">
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-2"
            style={{ color: SUBTLE }}
          >
            Query
          </p>
          <HoverCard
            className="px-4 py-3 text-sm leading-relaxed"
            base={{ background: COP_LIGHT, border: `1px solid rgba(6,182,212,0.35)`, borderRadius: "10px", color: CYAN, fontWeight: 500 }}
            hovered={{ border: `1px solid ${CYAN}`, boxShadow: SHADOW_HOVER }}
          >
            {displayQuestion}
          </HoverCard>
        </div>

        {/* AI answer */}
        <div className="mb-6 enter enter-d2">
          <div className="flex items-center gap-2 mb-3">
            <div
              className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
              style={{ background: GRAD, boxShadow: `0 0 10px rgba(6,182,212,0.50)` }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 1.5L7.5 5H11L8 7 9.5 10.5 6 8 2.5 10.5 4 7 1 5H4.5Z" fill="white" />
              </svg>
            </div>
            <span className="text-sm font-semibold" style={{ color: TEXT }}>AI Analysis</span>
            <span
              className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ background: GREEN_BG, color: GREEN, boxShadow: `0 0 8px rgba(52,211,153,0.30)`, border: `1px solid rgba(52,211,153,0.35)` }}
            >
              {conf.label} Confidence · {conf.score}%
            </span>
          </div>

          <HoverCard
            className="px-5 py-4 text-sm leading-relaxed"
            base={{ ...card, color: MUTED, lineHeight: "1.85", minHeight: "220px" }}
            hovered={{ border: `1px solid ${CYAN}`, boxShadow: SHADOW_HOVER }}
          >
            {AI_ANSWERS[task]}
          </HoverCard>
        </div>

        {/* Bi-Temporal chart */}
        {task === "compare" && <div className="enter enter-d3"><ChangeChart /></div>}

        {/* Confidence bar */}
        <HoverCard
          className="flex items-center justify-between px-4 py-3 mt-5 enter enter-d4"
          base={{ ...card }}
          hovered={{ border: `1px solid ${CYAN}`, boxShadow: SHADOW_HOVER }}
        >
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: MUTED }}>
            Model Confidence
          </span>
          <div className="flex items-center gap-2.5">
            <div
              className="w-24 h-2 rounded-full overflow-hidden"
              style={{ background: "rgba(6,182,212,0.12)" }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${conf.score}%`,
                  background: GRAD,
                  boxShadow: `0 0 8px rgba(6,182,212,0.55)`,
                }}
              />
            </div>
            <span className="text-sm font-semibold tabular-nums" style={{ color: CYAN }}>
              {conf.score}%
            </span>
          </div>
        </HoverCard>

        <ExportButton />
      </div>
    </div>
  );
}

/* ── Loading screen ──────────────────────────────────────────── */
const ANALYSIS_STEPS = [
  "Ingesting satellite imagery...",
  "Georeferencing AOI bounds...",
  "Running spectral analysis...",
  "Generating model predictions...",
  "Composing report...",
];

function ScreenLoading() {
  const [stepIdx, setStepIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setStepIdx((i) => Math.min(i + 1, ANALYSIS_STEPS.length - 1));
    }, 500);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="flex flex-col h-full items-center justify-center gap-8"
      style={{ background: BG }}
    >
      {/* Spinner ring */}
      <div style={{ position: "relative", width: 72, height: 72 }}>
        <div
          className="spin"
          style={{
            position: "absolute", inset: 0,
            borderRadius: "50%",
            border: `3px solid rgba(6,182,212,0.18)`,
            borderTopColor: CYAN,
          }}
        />
        <div
          style={{
            position: "absolute", inset: "50%",
            transform: "translate(-50%,-50%)",
            width: 28, height: 28,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <circle cx="11" cy="11" r="4" fill={CYAN} />
            <rect x="4" y="10.25" width="3" height="1.5" rx="0.75" fill={CYAN} opacity="0.5" />
            <rect x="15" y="10.25" width="3" height="1.5" rx="0.75" fill={CYAN} opacity="0.5" />
            <rect x="10.25" y="4" width="1.5" height="3" rx="0.75" fill={CYAN} opacity="0.5" />
            <rect x="10.25" y="15" width="1.5" height="3" rx="0.75" fill={CYAN} opacity="0.5" />
          </svg>
        </div>
      </div>

      {/* Label */}
      <div className="text-center" style={{ maxWidth: 340 }}>
        <p className="text-base font-semibold mb-2 tracking-wide" style={{ color: TEXT }}>
          Analysing satellite data and generating predictions...
        </p>
        <p className="text-sm" style={{ color: MUTED as string, minHeight: "1.4em", transition: "opacity 0.2s" }}>
          {ANALYSIS_STEPS[stepIdx]}
        </p>
      </div>

      {/* Progress bar */}
      <div style={{ width: 280, height: 3, background: "rgba(6,182,212,0.15)", borderRadius: 99, overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            background: GRAD,
            boxShadow: `0 0 8px rgba(6,182,212,0.60)`,
            borderRadius: 99,
            width: `${((stepIdx + 1) / ANALYSIS_STEPS.length) * 100}%`,
            transition: "width 0.45s ease",
          }}
        />
      </div>
    </div>
  );
}

/* ── Primary CTA button with icon-slide micro-interaction ────── */
function RunButton({ onClick }: { onClick: () => void }) {
  const [over, setOver] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setOver(true)}
      onMouseLeave={() => setOver(false)}
      className="w-full py-3 text-sm font-semibold flex items-center justify-center gap-2 overflow-hidden"
      style={{
        background: GRAD,
        color: "#fff",
        borderRadius: "10px",
        border: "none",
        cursor: "pointer",
        letterSpacing: "-0.01em",
        boxShadow: over
          ? "0 0 24px rgba(6,182,212,0.60), 0 0 48px rgba(79,70,229,0.30), 0 4px 16px rgba(0,0,0,0.40)"
          : "0 0 12px rgba(6,182,212,0.35), 0 2px 8px rgba(0,0,0,0.30)",
        transform: over ? "translateY(-2px)" : "translateY(0)",
        transition: "all 0.28s cubic-bezier(0.22,1,0.36,1)",
      }}
    >
      Run AI Analysis
      <svg
        width="15" height="15" viewBox="0 0 15 15" fill="none"
        style={{
          transform: over ? "translateX(3px)" : "translateX(0)",
          transition: "transform 0.28s cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        <path d="M7.5 2.5L12.5 7.5 7.5 12.5" stroke="white" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M2.5 7.5h10" stroke="white" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    </button>
  );
}

/* ── Screen 1: Input & Map ───────────────────────────────────── */
function ScreenInput({
  task, setTask, question, setQuestion,
  mapSelectionBounds, setMapSelectionBounds, onRun,
}: {
  task: Task; setTask: (t: Task) => void;
  question: string; setQuestion: (q: string) => void;
  mapSelectionBounds: BBoxCoords | null;
  setMapSelectionBounds: (b: BBoxCoords | null) => void;
  onRun: () => void;
}) {
  const [inputTab, setInputTab] = useState<InputTab>("upload");
  const [dragging, setDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const mapRef = useRef<SatMapHandle>(null);

  const TASKS = [
    { value: "single",    label: "Single-Image Visual Question Answering (VQA)" },
    { value: "compare",   label: "Bi-Temporal Change Detection" },
    { value: "highlight", label: "Text-Guided Region Grounding" },
  ];

  return (
    <div className="flex flex-col h-full" style={{ background: BG }}>
      {/* Nav */}
      <header
        className="flex items-center justify-between px-8 flex-shrink-0"
        style={{ height: "60px", background: "rgba(9,13,22,0.90)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderBottom: `1px solid ${BORDER}`, boxShadow: `0 1px 0 ${BORDER}, 0 4px 24px rgba(0,0,0,0.50)` }}
      >
        <Logo />
        <div className="flex items-center gap-6 text-xs font-medium" style={{ color: MUTED }}>
          <span>Earth Observation Platform</span>
          <div style={{ width: 1, height: 14, background: BORDER }} />
          <span>v2.4.1</span>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left column */}
        <div
          className="flex flex-col overflow-y-auto flex-shrink-0"
          style={{ width: "400px", borderRight: `1px solid ${BORDER}`, padding: "28px 24px", background: "rgba(9,13,22,0.85)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", boxShadow: `4px 0 32px rgba(0,0,0,0.50), inset -1px 0 0 ${BORDER}` }}
        >
          <h1 className="text-lg font-bold mb-0.5" style={{ color: TEXT, letterSpacing: "-0.02em" }}>
            Configure Analysis
          </h1>
          <p className="text-xs mb-7" style={{ color: MUTED }}>
            Select a task, provide imagery, and submit a query.
          </p>

          {/* Task selector */}
          <div className="mb-5">
            <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: MUTED }}>
              Analysis Task
            </label>
            <select
              value={task}
              onChange={(e) => setTask(e.target.value as Task)}
              className="w-full px-3 py-2.5 text-sm font-medium outline-none transition-all"
              style={{
                ...card,
                color: TEXT,
                cursor: "pointer",
                paddingRight: "36px",
                appearance: "none",
                WebkitAppearance: "none",
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16' fill='none'%3E%3Cpath d='M4 6l4 4 4-4' stroke='%2306b6d4' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 10px center",
              }}
            >
              {TASKS.map((t) => (
                <option key={t.value} value={t.value} style={{ background: "#0f1629", color: TEXT }}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Input method */}
          <div className="mb-5">
            <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: MUTED }}>
              Input Method
            </label>
            <Toggle
              value={inputTab}
              onChange={(v) => setInputTab(v as InputTab)}
              options={[
                { id: "upload", label: "Upload File" },
                { id: "draw",   label: "Draw on Map" },
              ]}
            />
          </div>

          {/* Upload / draw */}
          {inputTab === "upload" ? (
            <div className="mb-5">
              {uploadedFile ? (
                <HoverCard
                  className="flex items-center gap-3 px-4 py-3"
                  base={{ ...card, border: `1px solid rgba(52,211,153,0.35)` }}
                  hovered={{ border: `1px solid ${GREEN}`, boxShadow: `0 0 20px rgba(52,211,153,0.25), ${SHADOW_HOVER}` }}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: GREEN_BG, boxShadow: `0 0 10px rgba(52,211,153,0.20)` }}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M3 8.5l3 3 7-7" stroke={GREEN} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: TEXT }}>sat_image_01.tif</p>
                    <p className="text-xs mt-0.5" style={{ color: MUTED }}>GeoTIFF · 10980 × 10980 · 42 MB</p>
                  </div>
                  <button
                    onClick={() => setUploadedFile(null)}
                    className="flex-shrink-0 p-1.5 rounded-md transition-colors hover:bg-slate-100"
                    style={{ background: "transparent", border: "none", cursor: "pointer" }}
                    title="Remove"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M2 3.5h10M5.5 3.5V2.5a1 1 0 011-1h1a1 1 0 011 1v1M6 6v4M8 6v4" stroke={SUBTLE} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                      <rect x="3" y="3.5" width="8" height="8.5" rx="1" stroke={SUBTLE} strokeWidth="1.3" />
                    </svg>
                  </button>
                </HoverCard>
              ) : (
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={() => { setDragging(false); setUploadedFile("sat_image_01.tif"); }}
                  onClick={() => setUploadedFile("sat_image_01.tif")}
                  className="flex flex-col items-center justify-center gap-2 text-center cursor-pointer transition-all duration-150"
                  style={{
                    height: "120px",
                    border: `2px dashed ${dragging ? CYAN : BORDER}`,
                    borderRadius: "10px",
                    background: dragging ? COP_LIGHT : "rgba(9,13,22,0.50)",
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M12 4v12M9 10l3-3 3 3" stroke={dragging ? COP_BLUE : SUBTLE} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M5 18v1a2 2 0 002 2h10a2 2 0 002-2v-1" stroke={dragging ? COP_BLUE : SUBTLE} strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                  <p className="text-sm font-medium" style={{ color: dragging ? CYAN : TEXT }}>
                    Drop image or click to upload
                  </p>
                  <p className="text-xs" style={{ color: SUBTLE }}>GeoTIFF, TIFF, COG — up to 2 GB</p>
                </div>
              )}
            </div>
          ) : (
            <div className="mb-5">
              {mapSelectionBounds ? (
                <HoverCard
                  className="p-4"
                  base={{ ...card, border: `1px solid rgba(52,211,153,0.35)` }}
                  hovered={{ border: `1px solid ${GREEN}`, boxShadow: `0 0 20px rgba(52,211,153,0.25), ${SHADOW_HOVER}` }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: GREEN_BG, boxShadow: `0 0 8px rgba(52,211,153,0.35)` }}
                      >
                        <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                          <path d="M2 5.5l2 2.5L9 2.5" stroke={GREEN} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: GREEN }}>
                        Region Captured
                      </span>
                    </div>
                    <button
                      onClick={() => { mapRef.current?.clearSelection(); setMapSelectionBounds(null); }}
                      className="text-xs font-medium px-2.5 py-1 rounded-md transition-colors hover:bg-slate-100"
                      style={{ color: MUTED, background: "transparent", border: `1px solid ${BORDER}`, cursor: "pointer", transition: "all 0.20s ease" }}
                    >
                      Clear
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "North", value: mapSelectionBounds.north },
                      { label: "South", value: mapSelectionBounds.south },
                      { label: "East",  value: mapSelectionBounds.east  },
                      { label: "West",  value: mapSelectionBounds.west  },
                    ].map(({ label, value }) => (
                      <div
                        key={label}
                        className="flex flex-col px-3 py-2 rounded-lg"
                        style={{ background: "rgba(9,13,22,0.60)", border: `1px solid ${BORDER}` }}
                      >
                        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: SUBTLE }}>
                          {label}
                        </span>
                        <span className="text-sm font-semibold tabular-nums mt-0.5" style={{ color: TEXT }}>
                          {Math.abs(value).toFixed(4)}°{" "}
                          {label === "North" || label === "South" ? (value >= 0 ? "N" : "S") : (value >= 0 ? "E" : "W")}
                        </span>
                      </div>
                    ))}
                  </div>
                </HoverCard>
              ) : (
                <div
                  className="flex flex-col items-center justify-center gap-2 text-center"
                  style={{
                    height: "120px",
                    border: `2px dashed ${BORDER}`,
                    borderRadius: "10px",
                    background: "rgba(9,13,22,0.50)",
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="3" width="18" height="18" rx="2" stroke={SUBTLE} strokeWidth="1.6" strokeDasharray="4 3" />
                    <path d="M12 8v8M8 12h8" stroke={SUBTLE} strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  <p className="text-sm font-medium" style={{ color: TEXT }}>
                    Use the rectangle tool on the map
                  </p>
                  <p className="text-xs" style={{ color: SUBTLE }}>Click the toolbar icon (top-right) to start drawing</p>
                </div>
              )}
            </div>
          )}

          {/* Question */}
          <div className="mb-6">
            <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: MUTED }}>
              Analysis Query
            </label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g., What changes occurred between 2021 and 2026?"
              rows={3}
              className="w-full px-3 py-2.5 text-sm resize-none outline-none transition-all"
              style={{
                ...card,
                color: TEXT,
                fontFamily: "Inter, sans-serif",
                lineHeight: "1.6",
              }}
            />
          </div>

          {/* CTA */}
          <RunButton onClick={onRun} />
        </div>

        {/* Right column: map */}
        <div className="flex-1 flex flex-col overflow-hidden" style={{ background: BG }}>
          <div
            className="flex items-center justify-between px-4 py-2.5 flex-shrink-0"
            style={{ background: "rgba(9,13,22,0.90)", backdropFilter: "blur(12px)", borderBottom: `1px solid ${BORDER}` }}
          >
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest" style={{ color: MUTED }}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <circle cx="6.5" cy="6.5" r="5" stroke={MUTED} strokeWidth="1.3" />
                <path d="M6.5 1.5v10M1.5 6.5h10" stroke={MUTED} strokeWidth="1" strokeLinecap="round" opacity="0.5" />
              </svg>
              Satellite Basemap
            </div>
            {mapSelectionBounds && (
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ background: GREEN_BG, color: GREEN, border: `1px solid rgba(52,211,153,0.40)`, boxShadow: `0 0 8px rgba(52,211,153,0.20)` }}
              >
                AOI selected
              </span>
            )}
          </div>
          <div className="flex-1 overflow-hidden">
            <SatMap ref={mapRef} onBBoxChange={setMapSelectionBounds} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Screen 2: Results ───────────────────────────────────────── */
function ScreenResults({ task, question, mapSelectionBounds, onBack }: {
  task: Task; question: string; mapSelectionBounds: BBoxCoords | null; onBack: () => void;
}) {
  const TASK_LABELS: Record<Task, string> = {
    single:    "Single-Image VQA",
    compare:   "Bi-Temporal Change Detection",
    highlight: "Text-Guided Region Grounding",
  };

  return (
    <div className="flex flex-col h-full enter" style={{ background: BG }}>
      {/* Nav */}
      <header
        className="flex items-center justify-between px-8 flex-shrink-0"
        style={{ height: "60px", background: "rgba(9,13,22,0.90)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderBottom: `1px solid ${BORDER}`, boxShadow: `0 1px 0 ${BORDER}, 0 4px 24px rgba(0,0,0,0.50)` }}
      >
        <div className="flex items-center gap-5">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-semibold transition-all duration-300 hover:opacity-70 hover:scale-[1.03]"
            style={{ color: MUTED, background: "none", border: "none", cursor: "pointer" }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back
          </button>
          <div style={{ width: 1, height: 16, background: BORDER, boxShadow: `0 0 4px ${CYAN}` }} />
          <Logo />
          <div style={{ width: 1, height: 16, background: BORDER, boxShadow: `0 0 4px ${CYAN}` }} />
          <span className="text-xs font-medium" style={{ color: MUTED }}>{TASK_LABELS[task]}</span>
        </div>
        <div
          className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold"
          style={{ background: GREEN_BG, color: GREEN, border: `1px solid rgba(52,211,153,0.45)`, boxShadow: `0 0 10px rgba(52,211,153,0.20)` }}
        >
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: GREEN }} />
          Analysis Complete
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT: imagery ── */}
        {task === "single" && (
          <div style={{ flex: 1, position: "relative", overflow: "hidden", borderRight: `1px solid ${BORDER}` }}>
            <ResultMap bounds={mapSelectionBounds} mapId="result-single" />
            <div
              style={{ position: "absolute", top: 12, left: 12, zIndex: 800, display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 6, background: "rgba(15,23,42,0.72)", backdropFilter: "blur(6px)", color: "#e2e8f0", border: "1px solid rgba(255,255,255,0.12)", fontSize: 11, fontWeight: 600 }}
            >
              Captured Scene
            </div>
            <CoordBadge bounds={mapSelectionBounds} />
          </div>
        )}

        {task === "compare" && (
          <div style={{ flex: 1, display: "flex", overflow: "hidden", borderRight: `1px solid ${BORDER}` }}>
            {/* Past — grayscale sepia filter to simulate older imagery */}
            <div style={{ flex: 1, position: "relative", overflow: "hidden", borderRight: `1px solid ${BORDER}`, filter: "grayscale(1) contrast(1.25) sepia(0.5)" }}>
              <ResultMap bounds={mapSelectionBounds} mapId="result-past" />
              <div
                style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", zIndex: 800, padding: "4px 12px", borderRadius: 5, background: "rgba(15,23,42,0.75)", backdropFilter: "blur(6px)", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.12)", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}
              >
                Past (2021)
              </div>
              <CoordBadge bounds={mapSelectionBounds} />
            </div>
            {/* Present — full colour */}
            <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
              <ResultMap bounds={mapSelectionBounds} mapId="result-present" />
              <div
                style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", zIndex: 800, padding: "4px 12px", borderRadius: 5, background: GRAD, color: "#fff", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap", boxShadow: `0 0 14px rgba(6,182,212,0.55)` }}
              >
                Present (2026)
              </div>
              <CoordBadge bounds={mapSelectionBounds} />
              <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 800 }} preserveAspectRatio="none">
                <defs><filter id="blur-c"><feGaussianBlur stdDeviation="9" /></filter></defs>
                <ellipse cx="30%" cy="35%" rx="18%" ry="14%" fill="rgba(244,114,182,0.32)" style={{ filter: "url(#blur-c)" }} />
                <ellipse cx="62%" cy="70%" rx="12%" ry="9%"  fill="rgba(244,114,182,0.24)" style={{ filter: "url(#blur-c)" }} />
              </svg>
              <div style={{ position: "absolute", bottom: 14, left: 14, zIndex: 800, padding: "8px 12px", borderRadius: 8, background: "rgba(15,23,42,0.80)", backdropFilter: "blur(6px)", border: "1px solid rgba(255,255,255,0.10)", fontSize: 11 }}>
                <p style={{ fontWeight: 600, marginBottom: 4, color: TEXT }}>Change Detected</p>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: MAGENTA, boxShadow: `0 0 6px ${MAGENTA}` }} />
                  <span style={{ color: MUTED }}>Land-cover loss</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {task === "highlight" && (
          <div
            style={{ flex: 1, position: "relative", overflow: "hidden", borderRight: `1px solid ${BORDER}` }}
          >
            <ResultMap bounds={mapSelectionBounds} mapId="result-highlight" />
            <CoordBadge bounds={mapSelectionBounds} />
            <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 800 }} preserveAspectRatio="none">
              <rect className="bbox-pulse" x="2%" y="3%" width="38%" height="36%" fill="rgba(16,185,129,0.20)" stroke="#10B981" strokeWidth="2" strokeDasharray="6 3" rx="3" />
              <rect className="bbox-pulse bbox-pulse-d1" x="5%" y="52%" width="72%" height="40%" fill="rgba(234,179,8,0.18)" stroke="#EAB308" strokeWidth="2" strokeDasharray="6 3" rx="3" />
              <rect className="bbox-pulse bbox-pulse-d2" x="78%" y="28%" width="18%" height="44%" fill="rgba(37,99,235,0.24)" stroke="#60A5FA" strokeWidth="2" strokeDasharray="6 3" rx="3" />
            </svg>
            {[
              { text: "Dense Forest", top: "5%",  left: "3%",  bg: "rgba(5,46,37,0.90)",   color: "#6ee7b7", dot: "#10B981" },
              { text: "Cropland",     top: "54%", left: "6%",  bg: "rgba(66,32,6,0.90)",   color: "#fde68a", dot: "#EAB308" },
              { text: "Water Body",   top: "30%", left: "79%", bg: "rgba(23,37,84,0.90)",  color: "#bfdbfe", dot: "#60A5FA" },
            ].map((l) => (
              <div
                key={l.text}
                style={{
                  position: "absolute", top: l.top, left: l.left, zIndex: 801,
                  display: "flex", alignItems: "center", gap: "6px",
                  padding: "3px 10px", borderRadius: "5px",
                  background: l.bg, color: l.color, fontSize: 11, fontWeight: 600, whiteSpace: "nowrap",
                }}
              >
                <div style={{ width: 8, height: 8, borderRadius: 2, background: l.dot, flexShrink: 0 }} />
                {l.text}
              </div>
            ))}
            <div
              style={{ position: "absolute", bottom: 16, left: 16, zIndex: 801, padding: "10px 12px", borderRadius: 8, background: "rgba(15,23,42,0.80)", backdropFilter: "blur(6px)", border: "1px solid rgba(255,255,255,0.10)", fontSize: 12 }}
            >
              <p style={{ fontWeight: 600, marginBottom: 6, color: "#e2e8f0" }}>Detection Legend</p>
              {[
                { color: "#10B981", label: "Dense Forest" },
                { color: "#EAB308", label: "Cropland"     },
                { color: "#3B82F6", label: "Water Body"   },
              ].map((l) => (
                <div key={l.label} className="flex items-center gap-2 mb-1">
                  <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: l.color, opacity: 0.85 }} />
                  <span style={{ color: "#94a3b8" }}>{l.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── RIGHT: answer panel ── */}
        <AnswerPanel task={task} question={question} />
      </div>
    </div>
  );
}

/* ── Root ────────────────────────────────────────────────────── */
export default function App() {
  const [screen, setScreen] = useState<Screen>("input");
  const [task, setTask] = useState<Task>("compare");
  const [question, setQuestion] = useState("");
  const [mapSelectionBounds, setMapSelectionBounds] = useState<BBoxCoords | null>(null);

  const handleRun = () => {
    setScreen("loading");
    setTimeout(() => setScreen("results"), 2500);
  };

  if (screen === "loading") return <ScreenLoading />;

  return screen === "input" ? (
    <ScreenInput
      task={task} setTask={setTask}
      question={question} setQuestion={setQuestion}
      mapSelectionBounds={mapSelectionBounds}
      setMapSelectionBounds={setMapSelectionBounds}
      onRun={handleRun}
    />
  ) : (
    <ScreenResults
      task={task} question={question}
      mapSelectionBounds={mapSelectionBounds}
      onBack={() => setScreen("input")}
    />
  );
}
