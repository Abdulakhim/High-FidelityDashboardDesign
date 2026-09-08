import React, { useEffect, useImperativeHandle, useRef, useState, forwardRef } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/* ── Fix Leaflet's broken default icon paths under Vite ──────── */
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

/* ── Types ──────────────────────────────────────────────────── */
export interface BBoxCoords {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface SatMapHandle {
  clearSelection: () => void;
}

/* ── DrawControl ────────────────────────────────────────────────
   Mounts the Leaflet.draw toolbar from the CDN-loaded script.
   Exposes clearAll via ref so the parent can reset from outside.
───────────────────────────────────────────────────────────── */
interface DrawControlProps {
  onCreated: (bounds: BBoxCoords) => void;
  onDeleted: () => void;
  clearRef: React.MutableRefObject<(() => void) | null>;
}

function DrawControl({ onCreated, onDeleted, clearRef }: DrawControlProps) {
  const map = useMap();

  useEffect(() => {
    const attach = () => {
      const LD = (L as any).Control?.Draw;
      if (!LD) { setTimeout(attach, 100); return; }

      const drawnItems = new L.FeatureGroup();
      map.addLayer(drawnItems);

      const drawControl = new LD({
        position: "topright",
        edit: { featureGroup: drawnItems, remove: true },
        draw: {
          rectangle: {
            shapeOptions: {
              color: "#2563EB",
              weight: 2,
              fillColor: "#2563EB",
              fillOpacity: 0.12,
            },
          },
          polyline: false,
          polygon: false,
          circle: false,
          circlemarker: false,
          marker: false,
        },
      });

      map.addControl(drawControl);

      map.on((L as any).Draw.Event.CREATED, (e: any) => {
        drawnItems.clearLayers();
        drawnItems.addLayer(e.layer);
        const bounds: L.LatLngBounds = e.layer.getBounds();
        const ne = bounds.getNorthEast();
        const sw = bounds.getSouthWest();
        onCreated({ north: ne.lat, south: sw.lat, east: ne.lng, west: sw.lng });
      });

      map.on((L as any).Draw.Event.DELETED, () => onDeleted());

      // Expose a clear function to the parent via ref
      clearRef.current = () => {
        drawnItems.clearLayers();
        onDeleted();
      };

      return () => {
        clearRef.current = null;
        map.removeControl(drawControl);
        map.removeLayer(drawnItems);
        map.off((L as any).Draw.Event.CREATED);
        map.off((L as any).Draw.Event.DELETED);
      };
    };

    const cleanup = attach();
    return () => { if (typeof cleanup === "function") cleanup(); };
  }, [map]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

/* ── Coordinate bar ─────────────────────────────────────────── */
function CoordBar({ bbox }: { bbox: BBoxCoords | null }) {
  const BLUE = "#2563EB";
  const TEXT = "#111827";
  const MUTED = "#6B7280";
  const BORDER = "#E5E7EB";

  const base: React.CSSProperties = {
    borderTop: `1px solid ${BORDER}`,
    background: "#F9FAFB",
    minHeight: "38px",
    flexShrink: 0,
  };

  if (!bbox) {
    return (
      <div className="flex items-center justify-center gap-2 px-4 py-2.5 text-xs" style={base}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <rect x="1" y="1" width="10" height="10" rx="1.5" stroke={MUTED} strokeWidth="1.2" strokeDasharray="3 2" />
          <path d="M6 4v4M4 6h4" stroke={MUTED} strokeWidth="1.2" strokeLinecap="round" />
        </svg>
        <span style={{ color: MUTED }}>
          Pan and zoom freely — click the{" "}
          <strong style={{ color: TEXT }}>rectangle icon</strong> in the top-right toolbar to select a region
        </span>
      </div>
    );
  }

  const fmt = (n: number, d: [string, string]) =>
    `${Math.abs(n).toFixed(4)}° ${n >= 0 ? d[0] : d[1]}`;

  const fields = [
    { label: "N", value: fmt(bbox.north, ["N", "S"]) },
    { label: "S", value: fmt(bbox.south, ["N", "S"]) },
    { label: "E", value: fmt(bbox.east,  ["E", "W"]) },
    { label: "W", value: fmt(bbox.west,  ["E", "W"]) },
  ];
  const wKm = (Math.abs(bbox.east - bbox.west) * 111).toFixed(1);
  const hKm = (Math.abs(bbox.north - bbox.south) * 111).toFixed(1);

  return (
    <div className="flex items-center flex-wrap gap-x-4 gap-y-1 px-4 py-2.5 text-xs" style={base}>
      {fields.map((f) => (
        <div key={f.label} className="flex items-center gap-1.5">
          <span
            className="font-bold px-1.5 py-0.5 rounded tabular-nums"
            style={{ background: "#EFF6FF", color: BLUE, minWidth: 18, textAlign: "center" }}
          >
            {f.label}
          </span>
          <span className="font-medium tabular-nums" style={{ color: TEXT }}>{f.value}</span>
        </div>
      ))}
      <div className="ml-auto flex items-center gap-1.5" style={{ color: MUTED }}>
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
          <rect x="0.5" y="0.5" width="10" height="10" rx="1" stroke="#9CA3AF" strokeWidth="1" />
        </svg>
        {wKm} × {hKm} km
      </div>
    </div>
  );
}

/* ── Main export ────────────────────────────────────────────── */
const SatMap = forwardRef<SatMapHandle, { onBBoxChange?: (b: BBoxCoords | null) => void }>(
  function SatMap({ onBBoxChange }, ref) {
    const onBBoxChangeRef = useRef(onBBoxChange);
    useEffect(() => { onBBoxChangeRef.current = onBBoxChange; });

    const [bbox, setBbox] = useState<BBoxCoords | null>(null);
    const drawClearRef = useRef<(() => void) | null>(null);

    useImperativeHandle(ref, () => ({
      clearSelection() {
        drawClearRef.current?.();
        setBbox(null);
      },
    }));

    const handleCreated = (coords: BBoxCoords) => {
      setBbox(coords);
      onBBoxChangeRef.current?.(coords);
    };

    const handleDeleted = () => {
      setBbox(null);
      onBBoxChangeRef.current?.(null);
    };

    return (
      <div className="flex flex-col h-full w-full overflow-hidden">
        <div className="flex-1 relative overflow-hidden">
          <MapContainer
            center={[20, 0]}
            zoom={2}
            dragging={true}
            scrollWheelZoom={true}
            touchZoom={true}
            doubleClickZoom={true}
            zoomControl={true}
            style={{ width: "100%", height: "100%" }}
          >
            <TileLayer
              attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              maxZoom={19}
            />
            <TileLayer
              attribution=""
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
              maxZoom={19}
            />
            <DrawControl
              onCreated={handleCreated}
              onDeleted={handleDeleted}
              clearRef={drawClearRef}
            />
          </MapContainer>
        </div>
        <CoordBar bbox={bbox} />
      </div>
    );
  }
);

export default SatMap;
