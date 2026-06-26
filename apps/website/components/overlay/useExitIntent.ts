"use client";

import { useEffect } from "react";

/**
 * Detects exit intent on desktop (mouseleave toward top of browser)
 * and mobile (visibilitychange — user switches tab).
 */
export function useExitIntent(callback: () => void): void {
  useEffect(() => {
    function onMouseLeave(e: MouseEvent) {
      // Mouse leaving toward the top of the browser viewport
      if (e.clientY <= 0) {
        callback();
      }
    }

    function onVisibilityChange() {
      if (document.visibilityState === "hidden") {
        callback();
      }
    }

    document.addEventListener("mouseleave", onMouseLeave);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      document.removeEventListener("mouseleave", onMouseLeave);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [callback]);
}
