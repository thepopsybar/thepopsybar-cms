"use client";

import { useCallback, useEffect, useState } from "react";
import { registerPushDevice, sendTestNotification, unregisterPushDevice } from "@/app/admin/(panel)/dashboard/push-actions";

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() ?? "";
const SW_URL = "/popsy-push-sw.js";
const SW_SCOPE = "/admin/";

type Status = "checking" | "unconfigured" | "unsupported" | "needs-install" | "denied" | "off" | "on";

function keyToBytes(base64Url: string): Uint8Array<ArrayBuffer> {
  const padded = base64Url.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(base64Url.length / 4) * 4, "=");
  const raw = atob(padded);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isStandalone(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function sameKey(subscription: PushSubscription): boolean {
  const current = subscription.options?.applicationServerKey;
  if (!current) return false;
  const a = new Uint8Array(current);
  const b = keyToBytes(PUBLIC_KEY);
  return a.length === b.length && a.every((value, i) => value === b[i]);
}

async function detect(): Promise<{ status: Status; subscription: PushSubscription | null }> {
  if (!PUBLIC_KEY) return { status: "unconfigured", subscription: null };
  // iPhone/iPad only expose Web Push to a site that was added to the Home Screen and opened from there.
  if (isIos() && !isStandalone()) return { status: "needs-install", subscription: null };
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    return { status: "unsupported", subscription: null };
  }
  if (Notification.permission === "denied") return { status: "denied", subscription: null };
  const registration = await navigator.serviceWorker.getRegistration(SW_SCOPE);
  const subscription = (await registration?.pushManager.getSubscription()) ?? null;
  return { status: subscription && Notification.permission === "granted" ? "on" : "off", subscription };
}

/**
 * Admin-only device notification control (standard Web Push, no third-party service).
 * Nothing is requested on page load: the permission prompt only appears after clicking "Turn on".
 */
export default function PushSetup() {
  const [status, setStatus] = useState<Status>("checking");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    detect()
      .then(async ({ status: next, subscription }) => {
        if (cancelled) return;
        setStatus(next);
        // Quietly keep the server's copy of this device current (idempotent; no prompt, no message).
        if (next === "on" && subscription) await registerPushDevice(subscription.toJSON()).catch(() => undefined);
      })
      .catch(() => {
        if (!cancelled) setStatus("unsupported");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const enable = useCallback(async () => {
    if (busy) return;
    // IMPORTANT: ask for permission first, synchronously inside the click, or iOS Safari ignores it.
    const permissionRequest = Notification.requestPermission();
    setBusy(true);
    setMessage(null);
    let created: PushSubscription | null = null;
    try {
      const registrationPromise = navigator.serviceWorker.register(SW_URL, { scope: SW_SCOPE });
      const permission = await permissionRequest;
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "off");
        setMessage({ kind: "error", text: permission === "denied" ? "Notifications were blocked. Allow them in your browser or device settings, then try again." : "Notifications weren’t allowed, so nothing was turned on." });
        return;
      }
      await registrationPromise;
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (subscription && !sameKey(subscription)) {
        await subscription.unsubscribe(); // left over from different server keys
        subscription = null;
      }
      if (!subscription) {
        subscription = created = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(PUBLIC_KEY) });
      }
      const result = await registerPushDevice(subscription.toJSON());
      if (!result.ok) {
        if (created) await created.unsubscribe().catch(() => undefined);
        setStatus("off");
        setMessage({ kind: "error", text: result.message });
        return;
      }
      setStatus("on");
      setMessage({ kind: "ok", text: "Notifications are on for this device." });
    } catch {
      if (created) await created.unsubscribe().catch(() => undefined);
      setMessage({ kind: "error", text: "Couldn’t turn notifications on. Check your connection and browser settings, then try again." });
    } finally {
      setBusy(false);
    }
  }, [busy]);

  const disable = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const registration = await navigator.serviceWorker.getRegistration(SW_SCOPE);
      const subscription = await registration?.pushManager.getSubscription();
      let serverOk = true;
      if (subscription) {
        const result = await unregisterPushDevice(subscription.endpoint);
        serverOk = result.ok;
        await subscription.unsubscribe();
      }
      setStatus("off");
      setMessage(
        serverOk
          ? { kind: "ok", text: "Notifications are off for this device. You can turn them back on any time." }
          : { kind: "error", text: "This device was unsubscribed, but the server copy couldn’t be removed. It will be cleaned up automatically." },
      );
    } catch {
      setMessage({ kind: "error", text: "Couldn’t turn notifications off. Please try again." });
    } finally {
      setBusy(false);
    }
  }, [busy]);

  const sendTest = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const result = await sendTestNotification();
      setMessage({ kind: result.ok ? "ok" : "error", text: result.message ?? (result.ok ? "Test sent." : "Test failed.") });
    } catch {
      setMessage({ kind: "error", text: "Couldn’t send the test notification. Please try again." });
    } finally {
      setBusy(false);
    }
  }, [busy]);

  if (status === "checking") return null;

  return (
    <div className="crm-push">
      {status === "on" ? (
        <>
          <span className="crm-push__ok">Notifications are on for this device</span>
          <span className="crm-push__actions">
            <button type="button" className="crm-linkbtn" onClick={sendTest} disabled={busy}>Send test</button>
            <button type="button" className="crm-linkbtn" onClick={disable} disabled={busy}>Turn off</button>
          </span>
        </>
      ) : status === "off" ? (
        <button type="button" className="crm-linkbtn" onClick={enable} disabled={busy}>
          {busy ? "Turning on…" : "Turn on notifications on this device"}
        </button>
      ) : status === "denied" ? (
        <span className="crm-push__warn">Notifications are blocked for this site. Allow them in your browser or device settings, then reload this page.</span>
      ) : status === "needs-install" ? (
        <span className="crm-push__note">On iPhone/iPad, tap Share → Add to Home Screen, then open the CRM from the new icon to turn on notifications.</span>
      ) : status === "unsupported" ? (
        <span className="crm-push__note">This browser doesn’t support push notifications.</span>
      ) : (
        <span className="crm-push__note">Push notifications aren’t configured yet (missing NEXT_PUBLIC_VAPID_PUBLIC_KEY).</span>
      )}
      {message ? (
        <span className={message.kind === "ok" ? "crm-push__ok" : "crm-push__warn"} role={message.kind === "error" ? "alert" : "status"}>
          {message.text}
        </span>
      ) : null}
    </div>
  );
}
