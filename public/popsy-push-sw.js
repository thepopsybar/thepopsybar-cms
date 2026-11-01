/* The Popsy Bar admin push service worker.
 * Registered ONLY from the admin dashboard with scope "/admin/", so it never touches the public site.
 * It has no fetch handler (no caching, no request interception). */

const DEFAULT_URL = "/admin/dashboard";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

/** Only same-origin paths inside /admin/ are ever opened from a notification. */
function safeUrl(value) {
  if (typeof value !== "string" || !value.startsWith("/admin/") || value.startsWith("//")) return DEFAULT_URL;
  return value;
}

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = {};
  }
  if (!data || typeof data !== "object") data = {};

  const title = typeof data.title === "string" && data.title.trim() ? data.title.slice(0, 120) : "The Popsy Bar";
  const body = typeof data.body === "string" && data.body.trim() ? data.body.slice(0, 200) : "You have a new notification. Open the CRM to review it.";
  const tag = typeof data.tag === "string" && data.tag ? data.tag.slice(0, 100) : "popsy-crm";

  // A push must always show a notification (browsers require it). The same `tag` makes a repeated
  // delivery of the same inquiry replace the earlier notification instead of stacking.
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag,
      icon: "/crm-icon-192.png",
      badge: "/crm-icon-192.png",
      data: { url: safeUrl(data.url) },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(safeUrl(event.notification.data && event.notification.data.url), self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (windows) => {
      for (const client of windows) {
        if (new URL(client.url).pathname.startsWith("/admin/") && "focus" in client) {
          try {
            await client.focus();
            if (client.url !== target && "navigate" in client) await client.navigate(target);
            return;
          } catch (e) {
            /* fall through to opening a new window */
          }
        }
      }
      if (self.clients.openWindow) await self.clients.openWindow(target);
    }),
  );
});
