import { createInquiryHandler } from "@/lib/inquiry/handler";
import { FORM_SUBMIT_ENDPOINT } from "@/lib/site-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Allows the upstream call (max ~18s) plus overhead on Vercel.
export const maxDuration = 30;

/**
 * Optional server-side override. FormSubmit can issue a random alias for your address
 * (https://formsubmit.co/ajax/<alias>) so the address itself never appears anywhere public.
 */
const endpoint = process.env.FORMSUBMIT_ENDPOINT?.trim() || FORM_SUBMIT_ENDPOINT;

export const POST = createInquiryHandler({
  endpoint,
  allowBrowserFallback: process.env.INQUIRY_BROWSER_FALLBACK !== "off",
});
