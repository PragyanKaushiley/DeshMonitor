// PBKDF2-SHA256 via the native Web Crypto API (crypto.subtle) — no npm
// dependency, works unmodified in the Workers runtime. 100,000 iterations is
// the hard ceiling workerd enforces for PBKDF2 (below OWASP's 600,000
// recommendation, but the platform's actual maximum). The iteration count is
// embedded in every stored hash so it — or the algorithm entirely — can be
// raised later without a schema change; verify() just reads whatever
// parameters are in the hash it's checking against.

const ALGO_NAME = "pbkdf2-sha256";
const ITERATIONS = 100_000;
const SALT_BYTES = 16;
const KEY_LENGTH_BITS = 256;

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function deriveKey(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const derivedBits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" },
    keyMaterial,
    KEY_LENGTH_BITS,
  );
  return new Uint8Array(derivedBits);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = new Uint8Array(SALT_BYTES);
  crypto.getRandomValues(salt);
  const hash = await deriveKey(password, salt, ITERATIONS);
  return `${ALGO_NAME}$${ITERATIONS}$${toBase64Url(salt)}$${toBase64Url(hash)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 4) return false;

  const [algo, iterationsStr, saltB64, hashB64] = parts;
  if (algo !== ALGO_NAME) return false;

  const iterations = Number(iterationsStr);
  if (!Number.isFinite(iterations) || iterations <= 0) return false;

  const salt = fromBase64Url(saltB64 as string);
  const expectedHash = fromBase64Url(hashB64 as string);
  const actualHash = await deriveKey(password, salt, iterations);

  if (actualHash.length !== expectedHash.length) return false;

  // Constant-time comparison to avoid leaking hash-match info via timing.
  let diff = 0;
  for (let i = 0; i < actualHash.length; i++) {
    diff |= (actualHash[i] as number) ^ (expectedHash[i] as number);
  }
  return diff === 0;
}
