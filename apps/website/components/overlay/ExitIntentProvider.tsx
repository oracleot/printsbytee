"use client";

import { useState, useCallback } from "react";
import { ExitIntentPopup } from "@/components/overlay/ExitIntentPopup";
import { useExitIntent } from "@/components/overlay/useExitIntent";

const SESSION_KEY = "exitIntentShown";

export function ExitIntentProvider() {
  const [shown, setShown] = useState(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem(SESSION_KEY) === "1";
  });

  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => {
    if (shown) return;
    setIsOpen(true);
  }, [shown]);

  const close = useCallback(() => {
    setIsOpen(false);
    sessionStorage.setItem(SESSION_KEY, "1");
    setShown(true);
  }, []);

  const handleEmailSubmit = useCallback(
    (_email: string) => {
      // Email captured — for v1 just mark shown and reveal code via state
      sessionStorage.setItem(SESSION_KEY, "1");
      setShown(true);
    },
    []
  );

  useExitIntent(open);

  return (
    <ExitIntentPopup
      isOpen={isOpen}
      onClose={close}
      onEmailSubmit={handleEmailSubmit}
    />
  );
}
