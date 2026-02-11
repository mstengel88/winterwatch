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

    const resolveControl = (target: EventTarget | null) => {
      if (!(target instanceof Element)) return;

      // Direct input tap
      const el = target.closest("input, textarea, select") as
        | HTMLInputElement
        | HTMLTextAreaElement
        | HTMLSelectElement
        | null;

      if (el && !el.disabled) return el;

      // Label tap -> focus referenced control
      const label = target.closest("label") as HTMLLabelElement | null;
      const htmlFor = label?.getAttribute("for");
      if (htmlFor) {
        const linked = document.getElementById(htmlFor) as
          | HTMLInputElement
          | HTMLTextAreaElement
          | HTMLSelectElement
          | null;
        if (linked && !linked.disabled) return linked;
      }
    };

    const focusControl = (
      control:
        | HTMLInputElement
        | HTMLTextAreaElement
        | HTMLSelectElement
        | undefined,
    ) => {
      if (!control) return;
      if (control === document.activeElement) return;

      // Synchronous focus is important: iOS can reject focus if it doesn't happen
      // within a user-gesture event (causing `activationDenied`).
      try {
        // preventScroll avoids a scroll-jump during focus.
        // TS DOM lib doesn't always include the option, so we cast.
        (control as any).focus?.({ preventScroll: true });
      } catch {
        control.focus();
      }

      // Some WKWebView states only start a text input session after a click.
      // Click is safe here since it's still inside a user gesture handler.
      try {
        control.click?.();
      } catch {
        // ignore
      }
    };

    const onTouchStart = (e: TouchEvent) => {
      const control = resolveControl(e.target);
      if (!control) return;

      // IMPORTANT: do not block scrolling globally; only prevent default when
      // the target is actually a form control.
      // This helps WebKit treat the focus as a legitimate user interaction.
      e.preventDefault();
      focusControl(control);
    };

    const onPointerDown = (e: PointerEvent) => {
      const control = resolveControl(e.target);
      if (!control) return;
      // Pointer events can be passive by default; we attach as non-passive.
      e.preventDefault();
      focusControl(control);
    };

    // Fallback: sometimes touchstart is swallowed but touchend fires.
    const onTouchEnd = (e: TouchEvent) => {
      const control = resolveControl(e.target);
      if (!control) return;
      requestAnimationFrame(() => focusControl(control));
    };

    const onPointerUp = (e: PointerEvent) => {
      const control = resolveControl(e.target);
      if (!control) return;
      requestAnimationFrame(() => focusControl(control));
    };

    // Capture phase so we run before WebKit's deferrers.
    document.addEventListener("touchstart", onTouchStart, { passive: false, capture: true });
    document.addEventListener("pointerdown", onPointerDown, { passive: false, capture: true });
    document.addEventListener("touchend", onTouchEnd, { passive: true, capture: true });
    document.addEventListener("pointerup", onPointerUp, { passive: true, capture: true });

    return () => {
      document.removeEventListener("touchstart", onTouchStart, { capture: true } as any);
      document.removeEventListener("pointerdown", onPointerDown, { capture: true } as any);
      document.removeEventListener("touchend", onTouchEnd, { capture: true } as any);
      document.removeEventListener("pointerup", onPointerUp, { capture: true } as any);
    };
  }, []);

  return null;
}
