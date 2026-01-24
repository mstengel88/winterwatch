import { useEffect, useMemo, useState } from "react";
import { Capacitor } from "@capacitor/core";

type LogLine = {
  ts: number;
  level: "log" | "warn" | "error";
  message: string;
};

function stringifyArg(arg: unknown) {
  try {
    if (typeof arg === "string") return arg;
    if (arg instanceof Error) return `${arg.name}: ${arg.message}\n${arg.stack ?? ""}`;
    return JSON.stringify(arg);
  } catch {
    return String(arg);
  }
}

export function NativeDebugOverlay() {
  const enabled = useMemo(() => Capacitor.isNativePlatform(), []);
  const [lines, setLines] = useState<LogLine[]>([]);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!enabled) return;

    const push = (level: LogLine["level"], args: unknown[]) => {
      const msg = args.map(stringifyArg).join(" ");
      setLines((prev) => {
        const next = [...prev, { ts: Date.now(), level, message: msg }];
        return next.slice(-80);
      });
    };

    const orig = {
      log: console.log,
      warn: console.warn,
      error: console.error,
    };

    console.log = (...args: unknown[]) => {
      orig.log(...args);
      push("log", args);
    };
    console.warn = (...args: unknown[]) => {
      orig.warn(...args);
      push("warn", args);
    };
    console.error = (...args: unknown[]) => {
      orig.error(...args);
      push("error", args);
    };

    const onError = (e: ErrorEvent) => {
      push("error", ["GLOBAL ERROR", e.message, e.error ?? ""]);
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      push("error", ["UNHANDLED REJECTION", e.reason]);
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);

    push("log", ["NativeDebugOverlay enabled", { platform: Capacitor.getPlatform?.() }]);

    return () => {
      console.log = orig.log;
      console.warn = orig.warn;
      console.error = orig.error;
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      className="fixed left-0 right-0 top-0 z-[9999]"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="mx-auto w-full max-w-[900px] px-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full rounded-md bg-background/90 px-3 py-2 text-left text-sm text-foreground shadow"
        >
          Native debug {open ? "(tap to collapse)" : "(tap to expand)"} — last logs: {lines.length}
        </button>
        {open ? (
          <div className="mt-2 max-h-[40vh] overflow-auto rounded-md bg-background/90 p-3 text-xs text-foreground shadow">
            {lines.length === 0 ? (
              <div>Waiting for logs…</div>
            ) : (
              <pre className="whitespace-pre-wrap break-words">
                {lines
                  .map((l) => {
                    const t = new Date(l.ts).toLocaleTimeString();
                    return `[${t}] ${l.level.toUpperCase()}: ${l.message}`;
                  })
                  .join("\n\n")}
              </pre>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
