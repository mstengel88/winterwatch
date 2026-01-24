import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";

/**
 * iOS 18+ WKWebView workaround:
 * In some cases WebKit's deferring gesture recognizers block synthetic taps,
 * preventing inputs from receiving focus.
 *
 * This attaches a lightweight global handler to aggressively re-focus tapped
 * inputs on touch events (native iOS only).
 */
export function IosInputFocusFix() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "ios") return;

    const focusIfInput = (target: EventTarget | null) => {
      if (!(target instanceof Element)) return;

      // Direct input tap
      const el = target.closest("input, textarea, select") as
        | HTMLInputElement
        | HTMLTextAreaElement
        | HTMLSelectElement
        | null;

      if (el && !el.disabled) {
        // Defer to allow WebKit to finish its gesture pipeline
        requestAnimationFrame(() => el.focus());
        return;
      }

      // Label tap -> focus referenced control
      const label = target.closest("label") as HTMLLabelElement | null;
      const htmlFor = label?.getAttribute("for");
      if (htmlFor) {
        const linked = document.getElementById(htmlFor) as
          | HTMLInputElement
          | HTMLTextAreaElement
          | HTMLSelectElement
          | null;
        if (linked && !linked.disabled) requestAnimationFrame(() => linked.focus());
      }
    };

    const onTouchEnd = (e: TouchEvent) => focusIfInput(e.target);
    const onPointerUp = (e: PointerEvent) => focusIfInput(e.target);

    document.addEventListener("touchend", onTouchEnd, { passive: true, capture: true });
    document.addEventListener("pointerup", onPointerUp, { passive: true, capture: true });

    return () => {
      document.removeEventListener("touchend", onTouchEnd, { capture: true } as any);
      document.removeEventListener("pointerup", onPointerUp, { capture: true } as any);
    };
  }, []);

  return null;
}
