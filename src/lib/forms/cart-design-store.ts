export type CartDesign = { eventName: string; experience: string; theme: string };

const KEY = "popsy:cart-design";
const EVENT = "popsy:cart-design-change";

export function saveCartDesign(design: CartDesign): void {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(design));
  } catch {
    /* storage unavailable: the design simply is not carried over */
  }
  window.dispatchEvent(new Event(EVENT));
}

export function clearCartDesign(): void {
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(EVENT));
}

export function subscribeCartDesign(callback: () => void): () => void {
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function getCartDesignSnapshot(): string {
  try {
    return window.sessionStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

export function getCartDesignServerSnapshot(): string {
  return "";
}

export function parseCartDesign(raw: string): CartDesign | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<CartDesign>;
    if (typeof value.experience === "string" && typeof value.theme === "string") {
      return { eventName: typeof value.eventName === "string" ? value.eventName : "", experience: value.experience, theme: value.theme };
    }
  } catch {
    /* fall through */
  }
  return null;
}
