// Generates a VAPID key pair with Node's built-in crypto (no packages needed).
//   node scripts/generate-vapid-keys.mjs
// Prints values to the terminal ONLY; nothing is written to disk. Keep the private key secret.
import { generateKeyPairSync } from "node:crypto";

const { publicKey, privateKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
const pub = publicKey.export({ format: "jwk" });
const priv = privateKey.export({ format: "jwk" });
const raw = Buffer.concat([Buffer.from([4]), Buffer.from(pub.x, "base64url"), Buffer.from(pub.y, "base64url")]);

console.log("Add these to .env.local (and to Vercel). Never commit them.\n");
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${raw.toString("base64url")}`);
console.log(`VAPID_PRIVATE_KEY=${priv.d}`);
console.log("VAPID_SUBJECT=mailto:you@example.com");
