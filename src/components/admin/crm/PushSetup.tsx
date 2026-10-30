"use client";

import { useEffect, useState } from "react";

const APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID?.trim() ?? "";
const SDK_URL = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";

type OneSignalApi = {
  init: (options: Record<string, unknown>) => Promise<void>;
  login: (externalId: string) => Promise<void>;
  Notifications: { requestPermission: () => Promise<void>; permission: boolean };
  User: {
    PushSubscription: {
      optedIn: boolean | undefined;
      optIn: () => Promise<void>;
      optOut: () => Promise<void>;
      addEventListener: (event: "change", handler: (e: { current: { optedIn: boolean } }) => void) => void;
    };
  };
};
type Deferred = Array<(os: OneSignalApi) => void | Promise<void>>;
declare global {
  interface Window {
    OneSignalDeferred?: Deferred;
    __popsyOneSignalInit?: boolean;
  }
}

/**
 * "Phone alerts" control. The OneSignal SDK is loaded ONLY here (the admin dashboard), so public
 * visitors are never asked for notification permission. Open this page on your phone while signed in.
 */
export default function PushSetup({ adminId }: { adminId: string }) {
  const [state, setState] = useState<"loading" | "off" | "on" | "blocked">("loading");
  const [api, setApi] = useState<OneSignalApi | null>(null);

  useEffect(() => {
    if (!APP_ID) return;
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal) => {
      if (!window.__popsyOneSignalInit) {
        window.__popsyOneSignalInit = true;
        await OneSignal.init({
          appId: APP_ID,
          serviceWorkerPath: "OneSignalSDKWorker.js",
          notifyButton: { enable: false },
          allowLocalhostAsSecureOrigin: true,
        });
      }
      await OneSignal.login(adminId);
      const sub = OneSignal.User.PushSubscription;
      const read = () => (typeof Notification !== "undefined" && Notification.permission === "denied" ? "blocked" : sub.optedIn ? "on" : "off");
      setState(read());
      sub.addEventListener("change", () => setState(read()));
      // The SDK object is a class (a function). Passing it directly would make React call it as a
      // state updater, throwing "Class constructor ... cannot be invoked without 'new'". Wrap it.
      setApi(() => OneSignal);
    });
    if (!document.querySelector(`script[src="${SDK_URL}"]`)) {
      const script = document.createElement("script");
      script.src = SDK_URL;
      script.defer = true;
      document.head.appendChild(script);
    }
  }, [adminId]);

  if (!APP_ID) return null;

  async function enable() {
    if (!api) return;
    await api.Notifications.requestPermission();
    await api.User.PushSubscription.optIn();
  }

  return (
    <div className="crm-push">
      {state === "on" ? (
        <span className="crm-push__ok">Phone alerts are on for this device</span>
      ) : state === "blocked" ? (
        <span className="crm-push__warn">Notifications are blocked in this browser’s settings</span>
      ) : (
        <button type="button" className="crm-linkbtn" onClick={enable} disabled={!api}>
          {api ? "Turn on alerts on this device" : "Loading alerts…"}
        </button>
      )}
    </div>
  );
}
