import { useEffect, useState } from "react";
import { Download, Share, Plus, X, Smartphone } from "lucide-react";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isIos() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua);
  const iPadOS = navigator.platform === "MacIntel" && (navigator as any).maxTouchPoints > 1;
  return iOS || iPadOS;
}
function isAndroid() {
  return typeof navigator !== "undefined" && /Android/.test(navigator.userAgent);
}
function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

export function InstallAppButton() {
  const [mounted, setMounted] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [showIos, setShowIos] = useState(false);

  useEffect(() => {
    setMounted(true);
    setInstalled(isStandalone());
    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onBIP);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!mounted) {
    return <span className="inline-block w-[80px] h-7" aria-hidden />;
  }
  if (installed) return null;

  const onClick = async () => {
    if (deferred) {
      try {
        await deferred.prompt();
        await deferred.userChoice;
      } catch {}
      setDeferred(null);
      return;
    }
    // iOS Safari (or any browser w/o beforeinstallprompt) → instructions modal
    setShowIos(true);
  };

  return (
    <>
      <button
        onClick={onClick}
        title="Install MWA as an app"
        className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-[11px] font-mono uppercase tracking-wider text-accent hover:bg-accent/20 transition-colors"
      >
        <Download className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Install app</span>
        <span className="sm:hidden">Install</span>
      </button>

      {showIos && (
        <div
          className="fixed inset-0 z-[60] grid place-items-center bg-black/60 p-4"
          onClick={() => setShowIos(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-accent/40 bg-card p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-xl bg-accent/15 grid place-items-center">
                  <Smartphone className="h-5 w-5 text-accent" />
                </div>
                <h3 className="font-display font-bold uppercase tracking-wider text-sm">
                  Install MWA
                </h3>
              </div>
              <button
                onClick={() => setShowIos(false)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {isIos() ? (
              <ol className="space-y-3 text-sm">
                <li className="flex gap-3">
                  <span className="font-mono text-accent">1.</span>
                  <span>
                    In <span className="font-semibold">Safari</span>, tap the{" "}
                    <Share className="inline h-4 w-4 align-text-bottom text-accent" /> Share button
                    at the bottom of the screen.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="font-mono text-accent">2.</span>
                  <span>
                    Scroll and tap{" "}
                    <span className="font-semibold">
                      Add to Home Screen <Plus className="inline h-4 w-4 align-text-bottom" />
                    </span>
                    .
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="font-mono text-accent">3.</span>
                  <span>
                    Tap <span className="font-semibold">Add</span>, then open MWA from your home
                    screen and enable notifications inside the app.
                  </span>
                </li>
                <li className="text-xs text-muted-foreground border-t border-border pt-3">
                  Notifications on iPhone only work after installing to the home screen (iOS 16.4+).
                </li>
              </ol>
            ) : isAndroid() ? (
              <ol className="space-y-3 text-sm">
                <li className="flex gap-3">
                  <span className="font-mono text-accent">1.</span>
                  <span>
                    Open the browser <span className="font-semibold">⋮ menu</span> (top right).
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="font-mono text-accent">2.</span>
                  <span>
                    Tap <span className="font-semibold">Install app</span> or{" "}
                    <span className="font-semibold">Add to Home screen</span>.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="font-mono text-accent">3.</span>
                  <span>Open MWA from your home screen and enable notifications.</span>
                </li>
              </ol>
            ) : (
              <ol className="space-y-3 text-sm">
                <li className="flex gap-3">
                  <span className="font-mono text-accent">1.</span>
                  <span>
                    Look for the <span className="font-semibold">install icon</span> in your
                    browser's address bar (Chrome, Edge, Brave).
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="font-mono text-accent">2.</span>
                  <span>
                    Click it, then choose <span className="font-semibold">Install</span>.
                  </span>
                </li>
              </ol>
            )}
          </div>
        </div>
      )}
    </>
  );
}
