"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      const register = () => {
        navigator.serviceWorker
          .register("/sw.js", { scope: "/", updateViaCache: "none" })
          .catch(() => {});
      };
      if (document.readyState === "complete") {
        register();
      } else {
        window.addEventListener("load", register, { once: true });
      }
    }
  }, []);

  return null;
}
