import { NextResponse } from "next/server";
import { getAdminContext } from "@/lib/admin";
import { CLOUDINARY_FOLDER, getCloudinaryConfig, signParams } from "@/lib/cloudinary";

export const dynamic = "force-dynamic";

/** Returns a short-lived signature so an authenticated admin's browser can upload straight to Cloudinary. */
export async function POST() {
  const ctx = await getAdminContext();
  if (ctx.state !== "ok") {
    return NextResponse.json({ error: "You are not authorized to upload images." }, { status: ctx.state === "signed-out" ? 401 : 403 });
  }
  const { cloudName, apiKey, apiSecret, configured } = getCloudinaryConfig();
  if (!configured) {
    return NextResponse.json(
      { error: "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET on the server." },
      { status: 503 },
    );
  }
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = signParams({ folder: CLOUDINARY_FOLDER, timestamp }, apiSecret);
  return NextResponse.json({ cloudName, apiKey, timestamp, folder: CLOUDINARY_FOLDER, signature });
}
