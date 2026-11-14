import { useMemo } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { SearchResult } from "@/lib/mock-data";

// Red = strong need for a website, orange = medium, green = already in good shape.
export const needColor = (priority: number) =>
  priority >= 60 ? "hsl(0 84% 60%)" : priority >= 30 ? "hsl(25 95% 53%)" : "hsl(142 71% 45%)";

const FitBounds = ({ points }: { points: [number, number][] }) => {
  const map = useMap();
  useMemo(() => {
    if (points.length === 1) map.setView(points[0], 13);
    else if (points.length > 1) map.fitBounds(points, { padding: [30, 30] });
  }, [map, points]);
  return null;
};

const ResultsMap = ({ results }: { results: SearchResult[] }) => {
  const pts = useMemo(
    () => results.filter((r) => typeof r.latitude === "number" && typeof r.longitude === "number"),
    [results],
  );
  const coords = useMemo(() => pts.map((r) => [r.latitude!, r.longitude!] as [number, number]), [pts]);
  if (!pts.length) return null;

  return (
    <div className="relative rounded-lg overflow-hidden border border-border/50 h-[380px] z-0">
      <MapContainer center={coords[0]} zoom={12} className="h-full w-full" scrollWheelZoom>
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        <FitBounds points={coords} />
        {pts.map((r, i) => {
          const p = (r as any).priority_score ?? 0;
          const c = needColor(p);
          return (
            <CircleMarker key={i} center={[r.latitude!, r.longitude!]} radius={9}
              pathOptions={{ color: "hsl(0 0% 100%)", weight: 2, fillColor: c, fillOpacity: 0.95 }}>
              <Tooltip direction="top" offset={[0, -6]}>
                <div className="font-semibold">{r.business_name}</div>
                <div>Opportunity score: {p}/100</div>
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
      <div className="absolute bottom-3 left-3 z-[1000] rounded-md bg-card/95 border border-border px-3 py-2 text-xs space-y-1 text-foreground">
        <div className="font-semibold mb-1">Legend</div>
        <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ background: needColor(100) }} />Needs a website (60+)</div>
        <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ background: needColor(40) }} />Could improve (30–59)</div>
        <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ background: needColor(0) }} />Up to date (&lt;30)</div>
      </div>
    </div>
  );
};

export default ResultsMap;
