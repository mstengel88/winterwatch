import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, RefreshCw, Loader2, Users } from "lucide-react";
import { format } from "date-fns";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icons for leaflet + bundlers
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface EmployeeLocation {
  employee_id: string;
  first_name: string;
  last_name: string;
  category: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  recorded_at: string;
  clock_in_time: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  plow: "#3b82f6",
  shovel: "#f59e0b",
  both: "#8b5cf6",
  trucker: "#ef4444",
  manager: "#10b981",
};

function createColoredIcon(color: string) {
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="
      background: ${color};
      width: 28px;
      height: 28px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 3px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.35);
    "></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });
}

export default function LiveMapPage() {
  const [locations, setLocations] = useState<EmployeeLocation[]>([]);
  const [noLocationEmployees, setNoLocationEmployees] = useState<{ employee_id: string; first_name: string; last_name: string; category: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalOnShift, setTotalOnShift] = useState(0);
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);

  const fetchLocations = useCallback(async () => {
    setIsLoading(true);
    try {
      // Get all active shifts
      const { data: activeShifts, error: shiftErr } = await supabase
        .from("time_clock")
        .select("id, employee_id, clock_in_time")
        .is("clock_out_time", null);

      if (shiftErr) throw shiftErr;
      if (!activeShifts || activeShifts.length === 0) {
        setLocations([]);
        setIsLoading(false);
        return;
      }

      const employeeIds = activeShifts.map((s) => s.employee_id);

      // Get employee info
      const { data: employees, error: empErr } = await supabase
        .from("employees")
        .select("id, first_name, last_name, category")
        .in("id", employeeIds);

      if (empErr) throw empErr;

      const empMap = new Map(
        (employees || []).map((e) => [e.id, e])
      );

      // Get latest location for each employee on shift
      const results: EmployeeLocation[] = [];
      const noLoc: typeof noLocationEmployees = [];

      for (const shift of activeShifts) {
        const emp = empMap.get(shift.employee_id);
        if (!emp) continue;

        const { data: locData } = await supabase
          .from("employee_locations")
          .select("latitude, longitude, accuracy, recorded_at")
          .eq("time_clock_id", shift.id)
          .order("recorded_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (locData) {
          results.push({
            employee_id: shift.employee_id,
            first_name: emp.first_name,
            last_name: emp.last_name,
            category: emp.category,
            latitude: Number(locData.latitude),
            longitude: Number(locData.longitude),
            accuracy: locData.accuracy ? Number(locData.accuracy) : null,
            recorded_at: locData.recorded_at,
            clock_in_time: shift.clock_in_time,
          });
        } else {
          noLoc.push({
            employee_id: shift.employee_id,
            first_name: emp.first_name,
            last_name: emp.last_name,
            category: emp.category,
          });
        }
      }

      setLocations(results);
      setNoLocationEmployees(noLoc);
      setTotalOnShift(activeShifts.length);
    } catch (err) {
      console.error("[LiveMap] Error fetching locations:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current).setView([42.5, -83.5], 10); // Default: Michigan area

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    markersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update markers when locations change
  useEffect(() => {
    if (!mapRef.current || !markersRef.current) return;

    markersRef.current.clearLayers();

    if (locations.length === 0) return;

    const bounds = L.latLngBounds([]);

    locations.forEach((loc) => {
      const color = CATEGORY_COLORS[loc.category] || "#6b7280";
      const icon = createColoredIcon(color);

      const marker = L.marker([loc.latitude, loc.longitude], { icon });

      const timeSince = format(new Date(loc.recorded_at), "h:mm:ss a");
      const clockedIn = format(new Date(loc.clock_in_time), "h:mm a");

      marker.bindPopup(`
        <div style="min-width: 160px;">
          <strong>${loc.first_name} ${loc.last_name}</strong><br/>
          <span style="text-transform: capitalize; color: ${color}; font-weight: 600;">${loc.category}</span><br/>
          <hr style="margin: 4px 0;"/>
          <small>📍 Last ping: ${timeSince}</small><br/>
          <small>🕐 Clocked in: ${clockedIn}</small>
          ${loc.accuracy ? `<br/><small>🎯 Accuracy: ${Math.round(loc.accuracy)}m</small>` : ""}
        </div>
      `);

      markersRef.current!.addLayer(marker);
      bounds.extend([loc.latitude, loc.longitude]);
    });

    mapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
  }, [locations]);

  // Fetch on mount + auto-refresh every 2 min
  useEffect(() => {
    fetchLocations();
    const interval = setInterval(fetchLocations, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchLocations]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MapPin className="h-6 w-6 text-primary" />
            Live Employee Map
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time locations of employees on shift
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchLocations} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
          <Badge key={cat} variant="outline" className="capitalize gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: color }}
            />
            {cat}
          </Badge>
        ))}
        <Badge variant="secondary" className="ml-auto gap-1.5">
          <Users className="h-3 w-3" />
          {totalOnShift} on shift
        </Badge>
      </div>

      {/* Map */}
      <Card>
        <CardContent className="p-0 overflow-hidden rounded-lg relative">
          {isLoading && locations.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center z-10 bg-background">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}
          <div ref={mapContainerRef} className="h-[500px] md:h-[600px] w-full" />
        </CardContent>
      </Card>

      {!isLoading && locations.length === 0 && (
        <p className="text-center text-muted-foreground py-4">
          No employees are currently on shift with location data.
        </p>
      )}

      {!isLoading && noLocationEmployees.length > 0 && (
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              On shift without location data ({noLocationEmployees.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 pt-0">
            <div className="flex flex-wrap gap-2">
              {noLocationEmployees.map((emp) => (
                <Badge key={emp.employee_id} variant="outline" className="capitalize gap-1.5">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ background: CATEGORY_COLORS[emp.category] || "#6b7280" }}
                  />
                  {emp.first_name} {emp.last_name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
