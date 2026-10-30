import { createHash } from "node:crypto";

export const CLOUDINARY_FOLDER = "popsy-bar";

export function getCloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME ?? "";
  const apiKey = process.env.CLOUDINARY_API_KEY ?? "";
  const apiSecret = process.env.CLOUDINARY_API_SECRET ?? "";
  return { cloudName, apiKey, apiSecret, configured: Boolean(cloudName && apiKey && apiSecret) };
}

/** Cloudinary signature: sha1 of the sorted "k=v&k=v" string followed by the API secret. */
export function signParams(params: Record<string, string | number>, apiSecret: string): string {
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return createHash("sha1").update(toSign + apiSecret).digest("hex");
}

/** True for URLs that point at this project's Cloudinary account. */
export function isCloudinaryUrl(url: string): boolean {
  const { cloudName } = getCloudinaryConfig();
  if (!/^https:\/\/res\.cloudinary\.com\//.test(url)) return false;
  return cloudName ? url.startsWith(`https://res.cloudinary.com/${cloudName}/`) : true;
}

/** Deletes an uploaded asset. Resolves false (never throws) so callers can treat cleanup as best-effort. */
export async function destroyAsset(publicId: string): Promise<boolean> {
  const { cloudName, apiKey, apiSecret, configured } = getCloudinaryConfig();
  if (!configured || !publicId.startsWith(`${CLOUDINARY_FOLDER}/`)) return false;
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = signParams({ public_id: publicId, timestamp }, apiSecret);
  const body = new URLSearchParams({
    public_id: publicId,
    timestamp: String(timestamp),
    api_key: apiKey,
    signature,
  });
  try {
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
      method: "POST",
      body,
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { result?: string };
    return data.result === "ok";
  } catch {
    return false;
  }
}
