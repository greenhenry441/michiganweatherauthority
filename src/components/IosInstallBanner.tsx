import { useEffect, useState } from "react";
import { Share, X } from "lucide-react";

const LS_DISMISSED = "mwa.ios-install.dismissed";

function isIos() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua);
  // iPadOS 13+ identifies as Mac; detect touch
  const iPadOS = navigator.platform === "MacIntel" && (navigator as any).maxTouchPoints > 1;
  return iOS || iPadOS;
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

export function IosInstallBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isIos() || isStandalone()) return;
    if (localStorage.getItem(LS_DISMISSED) === "1") return;
    setShow(true);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed bottom-3 left-3 right-3 z-50 mx-auto max-w-md rounded-2xl border border-accent/40 bg-card/95 backdrop-blur-md p-3 shadow-lg">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 shrink-0 rounded-xl bg-accent/15 grid place-items-center">
          <Share className="h-5 w-5 text-accent" />
        </div>
        <div className="flex-1 text-sm">
          <div className="font-display font-bold uppercase tracking-wider text-xs mb-0.5">
            Install for iPhone notifications
          </div>
          <p className="text-muted-foreground leading-snug">
            Tap <Share className="inline h-3.5 w-3.5 align-text-bottom" /> Share, then
            <span className="font-semibold text-foreground"> Add to Home Screen</span>. Then enable
            alerts inside the app.
          </p>
        </div>
        <button
          onClick={() => {
            localStorage.setItem(LS_DISMISSED, "1");
            setShow(false);
          }}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
