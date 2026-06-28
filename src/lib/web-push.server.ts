// Web Push (RFC 8030 + VAPID + aes128gcm) implemented with WebCrypto so it
// runs inside the Cloudflare Worker / TanStack Start server runtime.
// Sends one notification per subscription; returns the count delivered.

interface PushSub {
  endpoint: string;
  p256dh: string;
  auth: string;
}

interface NotificationPayload {
  title: string;
  body?: string;
  url?: string;
  tag?: string;
  id?: string;
  severity?: "minor" | "moderate" | "severe" | "extreme";
  icon?: string;
}

function b64urlDecode(s: string): Uint8Array {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const b = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function b64urlEncode(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function concatBytes(...arrs: Uint8Array[]): Uint8Array {
  let len = 0;
  for (const a of arrs) len += a.length;
  const out = new Uint8Array(len);
  let off = 0;
  for (const a of arrs) {
    out.set(a, off);
    off += a.length;
  }
  return out;
}

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info },
    key,
    length * 8,
  );
  return new Uint8Array(bits);
}

// Import the VAPID EC private key (raw 32-byte scalar) for ES256 signing.
async function importVapidKey(privateD: string): Promise<CryptoKey> {
  const pub = b64urlDecode(
    // Re-derive X/Y from the env public key
    (globalThis as unknown as { __VAPID_PUB__?: string }).__VAPID_PUB__ ||
      process.env.VAPID_PUBLIC_KEY!,
  );
  // public key bytes: 0x04 || X(32) || Y(32)
  const x = b64urlEncode(pub.slice(1, 33));
  const y = b64urlEncode(pub.slice(33, 65));
  const jwk: JsonWebKey = {
    kty: "EC",
    crv: "P-256",
    d: privateD,
    x,
    y,
    ext: true,
  };
  return crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
}

async function signVapidJWT(audience: string): Promise<string> {
  const header = b64urlEncode(
    new TextEncoder().encode(JSON.stringify({ typ: "JWT", alg: "ES256" })),
  );
  const payload = b64urlEncode(
    new TextEncoder().encode(
      JSON.stringify({
        aud: audience,
        exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
        sub: process.env.VAPID_SUBJECT || "mailto:admin@example.com",
      }),
    ),
  );
  const data = new TextEncoder().encode(`${header}.${payload}`);
  const key = await importVapidKey(process.env.VAPID_PRIVATE_KEY!);
  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    data,
  );
  return `${header}.${payload}.${b64urlEncode(sig)}`;
}

// Encrypt payload using aes128gcm content-encoding (RFC 8188 + RFC 8291).
async function encryptPayload(
  payload: string,
  recipientP256dh: string,
  authSecret: string,
): Promise<{ body: Uint8Array; cryptoKeyHeader: string }> {
  const plaintext = new TextEncoder().encode(payload);
  const uaPublic = b64urlDecode(recipientP256dh); // 65 bytes uncompressed
  const auth = b64urlDecode(authSecret);

  // Ephemeral server keypair
  const serverKp = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"],
  );
  const serverPubRaw = new Uint8Array(
    await crypto.subtle.exportKey("raw", serverKp.publicKey),
  ); // 65 bytes

  // Import UA public key
  const uaKey = await crypto.subtle.importKey(
    "raw",
    uaPublic,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );

  // ECDH shared secret
  const ecdhBits = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "ECDH", public: uaKey },
      serverKp.privateKey,
      256,
    ),
  );

  // PRK_key = HKDF(auth, ecdhBits, "WebPush: info\0" || uaPublic || serverPub, 32)
  const keyInfo = concatBytes(
    new TextEncoder().encode("WebPush: info\0"),
    uaPublic,
    serverPubRaw,
  );
  const ikm = await hkdf(auth, ecdhBits, keyInfo, 32);

  // Salt + content encryption keys (RFC 8188 aes128gcm)
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(
    salt,
    ikm,
    new TextEncoder().encode("Content-Encoding: aes128gcm\0"),
    16,
  );
  const nonce = await hkdf(
    salt,
    ikm,
    new TextEncoder().encode("Content-Encoding: nonce\0"),
    12,
  );

  // Pad: plaintext || 0x02 (last record delimiter)
  const padded = concatBytes(plaintext, new Uint8Array([0x02]));

  const aesKey = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aesKey, padded),
  );

  // Build aes128gcm header: salt(16) || rs(4, big-endian, e.g. 4096) || idlen(1) || keyid(idlen)
  const rs = 4096;
  const rsBytes = new Uint8Array(4);
  new DataView(rsBytes.buffer).setUint32(0, rs, false);
  const header = concatBytes(
    salt,
    rsBytes,
    new Uint8Array([serverPubRaw.length]),
    serverPubRaw,
  );

  return {
    body: concatBytes(header, ciphertext),
    cryptoKeyHeader: "", // not needed for aes128gcm; we keep field for API symmetry
  };
}

export async function sendPushNotifications(
  subs: PushSub[],
  payload: NotificationPayload,
): Promise<{ sent: number; failed: number; gone: string[] }> {
  const body = JSON.stringify(payload);
  let sent = 0;
  let failed = 0;
  const gone: string[] = [];

  await Promise.all(
    subs.map(async (s) => {
      try {
        const url = new URL(s.endpoint);
        const audience = `${url.protocol}//${url.host}`;
        const jwt = await signVapidJWT(audience);
        const enc = await encryptPayload(body, s.p256dh, s.auth);

        const res = await fetch(s.endpoint, {
          method: "POST",
          headers: {
            "Content-Encoding": "aes128gcm",
            "Content-Type": "application/octet-stream",
            TTL: "86400",
            Urgency: payload.severity === "extreme" || payload.severity === "severe" ? "high" : "normal",
            Authorization: `vapid t=${jwt}, k=${process.env.VAPID_PUBLIC_KEY}`,
          },
          body: enc.body,
        });

        if (res.status === 404 || res.status === 410) {
          gone.push(s.endpoint);
          failed++;
        } else if (res.status >= 200 && res.status < 300) {
          sent++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }),
  );

  return { sent, failed, gone };
}
