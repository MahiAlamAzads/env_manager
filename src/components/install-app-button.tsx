"use client";

import { useEffect, useState } from "react";
import { InstallIcon } from "@/components/icons";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallAppButton() {
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    const iosStandalone = Boolean(
      (window.navigator as Navigator & { standalone?: boolean }).standalone,
    );
    setIsInstalled(standalone || iosStandalone);

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    const onInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (isInstalled) return null;

  async function handleInstall() {
    if (installPrompt) {
      await installPrompt.prompt();
      await installPrompt.userChoice;
      setInstallPrompt(null);
      return;
    }

    const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    window.alert(
      isIos
        ? "On iPhone/iPad: tap Share, then Add to Home Screen."
        : "Open your browser menu and choose Install app or Add to Home screen.",
    );
  }

  return (
    <button className="btn btn-outline-secondary" onClick={handleInstall} type="button">
      <InstallIcon className="me-2" />
      Install app
    </button>
  );
}
