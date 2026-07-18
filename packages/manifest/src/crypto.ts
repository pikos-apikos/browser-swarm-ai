export async function sha256(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes as BufferSource);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function verifySha256(bytes: Uint8Array, expected: string): Promise<void> {
  const actual = await sha256(bytes);
  if (actual !== expected) throw new Error(`SHA-256 mismatch: expected ${expected}, received ${actual}`);
}
