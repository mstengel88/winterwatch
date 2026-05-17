import { useMemo, useState } from "react";
import { ExternalLink, LocateFixed, MapPin, RefreshCcw, ShieldCheck, Truck } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEmployee } from "@/hooks/useEmployee";
import { useDispatchRouteTracking } from "@/hooks/useDispatchRouteTracking";
import { DISPATCH_DRIVER_ROUTE_URL } from "@/lib/dispatchRouteConfig";
import { cn } from "@/lib/utils";

const TRACKING_ENABLED_KEY = "winterwatchDispatchTrackingEnabled";

function getSearchValue(search: URLSearchParams, key: string) {
  return search.get(key)?.trim() || "";
}

export default function DispatchRoutePage() {
  const initialSearch = useMemo(() => new URLSearchParams(window.location.search), []);
  const { employee } = useEmployee();
  const [routeId, setRouteId] = useState(getSearchValue(initialSearch, "route"));
  const [orderId, setOrderId] = useState(getSearchValue(initialSearch, "order"));
  const [truck, setTruck] = useState(getSearchValue(initialSearch, "truck"));
  const [trackingEnabled, setTrackingEnabled] = useState(
    getSearchValue(initialSearch, "track") === "1" ||
      window.localStorage.getItem(TRACKING_ENABLED_KEY) !== "false",
  );

  const driverName = employee
    ? `${employee.first_name || ""} ${employee.last_name || ""}`.trim()
    : "";
  const driverId = employee?.id || getSearchValue(initialSearch, "driverId");

  const driverRouteUrl = useMemo(() => {
    const url = new URL(DISPATCH_DRIVER_ROUTE_URL);
    if (routeId) url.searchParams.set("route", routeId);
    if (orderId) url.searchParams.set("order", orderId);
    url.searchParams.set("winterwatch", "1");
    return url.toString();
  }, [orderId, routeId]);

  const tracking = useDispatchRouteTracking({
    enabled: trackingEnabled,
    routeId,
    orderId,
    driverId,
    driverName,
    truck,
  });

  function toggleTracking(nextEnabled: boolean) {
    setTrackingEnabled(nextEnabled);
    window.localStorage.setItem(TRACKING_ENABLED_KEY, String(nextEnabled));
  }

  return (
    <AppLayout variant="wide">
      <div className="mx-auto flex min-h-[calc(100dvh-7rem)] w-full max-w-7xl flex-col gap-4">
        <Card className="border-border/60 bg-card/95 shadow-sm">
          <CardHeader className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
                    Dispatch Route
                  </Badge>
                  {tracking.isNative && (
                    <Badge variant="outline" className="border-green-500/30 bg-green-500/10 text-green-700">
                      iOS ready
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-2xl">Driver route bridge</CardTitle>
                <CardDescription>
                  Complete dispatch stops from WinterWatch without changing the main WinterWatch workflow.
                </CardDescription>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={trackingEnabled ? "secondary" : "default"}
                  onClick={() => toggleTracking(!trackingEnabled)}
                  className="gap-2 rounded-2xl"
                >
                  <LocateFixed className="h-4 w-4" />
                  {trackingEnabled ? "Pause GPS" : "Resume GPS"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => window.open(driverRouteUrl, "_blank", "noopener,noreferrer")}
                  className="gap-2 rounded-2xl"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open Full Page
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
            <section className="space-y-4">
              <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                <div className="mb-3 flex items-start gap-3">
                  <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-semibold">Live tracking</h2>
                    <p className="text-sm text-muted-foreground">
                      Tracking only runs on this route page. It posts to the dispatch map every few seconds while active.
                    </p>
                  </div>
                </div>

                <div
                  className={cn(
                    "rounded-2xl border p-3 text-sm",
                    tracking.status === "active" && "border-green-500/30 bg-green-500/10 text-green-700",
                    tracking.status === "requesting" && "border-amber-500/30 bg-amber-500/10 text-amber-700",
                    tracking.status === "error" && "border-destructive/30 bg-destructive/10 text-destructive",
                    tracking.status === "idle" && "border-border bg-muted/40 text-muted-foreground",
                  )}
                >
                  <div className="flex items-center gap-2 font-medium">
                    {tracking.status === "active" ? (
                      <ShieldCheck className="h-4 w-4" />
                    ) : (
                      <RefreshCcw className="h-4 w-4" />
                    )}
                    {tracking.message}
                  </div>
                  {tracking.lastPingAt && (
                    <p className="mt-1 text-xs opacity-80">Last map update: {tracking.lastPingAt}</p>
                  )}
                </div>
              </div>

              <div className="grid gap-3 rounded-2xl border border-border/60 bg-background/70 p-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="routeId">Dispatch Route ID</Label>
                  <Input
                    id="routeId"
                    value={routeId}
                    onChange={(event) => setRouteId(event.target.value)}
                    placeholder="Optional route id"
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="truck">Truck</Label>
                  <Input
                    id="truck"
                    value={truck}
                    onChange={(event) => setTruck(event.target.value)}
                    placeholder="Example: 310"
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="orderId">Current Order ID</Label>
                  <Input
                    id="orderId"
                    value={orderId}
                    onChange={(event) => setOrderId(event.target.value)}
                    placeholder="Optional active stop id"
                    className="rounded-xl"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                <div className="mb-2 flex items-center gap-2 font-semibold">
                  <Truck className="h-4 w-4 text-primary" />
                  Driver
                </div>
                <p className="text-sm text-muted-foreground">
                  {driverName || "No WinterWatch employee record found for this login."}
                </p>
              </div>
            </section>

            <section className="min-h-[640px] overflow-hidden rounded-3xl border border-border bg-background shadow-inner">
              <iframe
                title="Green Hills Dispatch Driver Route"
                src={driverRouteUrl}
                className="h-[72dvh] min-h-[640px] w-full border-0"
                allow="camera; geolocation; clipboard-write"
              />
            </section>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
