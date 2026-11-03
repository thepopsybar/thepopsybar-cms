import { createInquiryHandler } from "@/lib/inquiry/handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Allows the database save, the Brevo request (10s limit) and the push delivery, plus overhead on Vercel.
export const maxDuration = 30;

/**
 * Every website form posts here. Order of work: validate -> save to Supabase -> notify.
 * The owner notification goes out through Brevo from the server, to the address in the
 * INQUIRY_NOTIFICATION_EMAIL environment variable (never from anything the browser sent).
 */
export const POST = createInquiryHandler();
