// Dedicated push notification service worker for MWA alerts.
// Separate from any app-shell SW — only handles `push` and `notificationclick`.

const SUPABASE_URL = "https://sxrghzsuhmnbjhuwbqnl.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4cmdoenN1aG1uYmpodXdicW5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2NDE1OTYsImV4cCI6MjA5NzIxNzU5Nn0.QOvZGdI5mUaOZfniVSepIp2Utgm2UsT15RrHqdDZxgs";

self.addEventListener("install", (e) => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  event.waitUntil(handlePush(event));
});

async function handlePush(event) {
  let payload = null;
  if (event.data) {
    try { payload = event.data.json(); } catch { payload = { title: event.data.text() }; }
  }

  // If the server already sent a full notification payload, use it directly.
  if (payload && payload.title) {
    return self.registration.showNotification(payload.title, {
      body: payload.body || "",
      icon: payload.icon || "/icons/icon-192.png",
      badge: payload.badge || "/icons/icon-96.png",
      tag: payload.tag || "mwa-alert",
      data: { url: payload.url || "/", id: payload.id },
      requireInteraction: payload.severity === "extreme" || payload.severity === "severe",
      vibrate: payload.severity === "extreme" ? [400, 100, 400, 100, 400] : [200, 100, 200],
    });
  }

  // Tickle fallback: fetch latest active alert.
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/alerts?select=*&order=issued_at.desc&limit=1&expires_at=gt.${new Date().toISOString()}`,
      { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` } },
    );
    const rows = await r.json();
    const a = rows && rows[0];
    if (!a) return;
    const title = (a.custom_name || a.headline || "Weather Alert").toString();
    return self.registration.showNotification(title, {
      body: `${(a.areas || []).join(", ")} — ${a.headline}`,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-96.png",
      tag: `mwa-${a.id}`,
      data: { url: "/", id: a.id },
      requireInteraction: a.severity === "extreme" || a.severity === "severe",
      vibrate: a.severity === "extreme" ? [400, 100, 400, 100, 400] : [200, 100, 200],
    });
  } catch (err) {
    return self.registration.showNotification("Michigan Weather Service", {
      body: "New alert available — open the app to view.",
      icon: "/icons/icon-192.png",
    });
  }
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const c of clients) {
        if ("focus" in c) { c.navigate(url); return c.focus(); }
      }
      return self.clients.openWindow(url);
    }),
  );
});
