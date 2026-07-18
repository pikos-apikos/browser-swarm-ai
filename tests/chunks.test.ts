import { describe, expect, it } from "vitest";
import { MANIFEST_VERSION, type ArtifactManifest } from "../packages/protocol/src/artifact.ts";
import { sha256 } from "../packages/manifest/src/crypto.ts";
import { VerifiedChunkStore } from "../packages/manifest/src/chunks.ts";

describe("VerifiedChunkStore", () => {
  it("verifies chunks and reconstructs the original artifact", async () => {
    const bytes = new TextEncoder().encode("browser swarm ai");
    const parts = [bytes.subarray(0, 7), bytes.subarray(7)];
    const manifest: ArtifactManifest = {
      version: MANIFEST_VERSION, artifactId: "test", mediaType: "application/vnd.google.litert-model",
      byteLength: bytes.length, chunkSize: 7, sha256: await sha256(bytes),
      chunks: await Promise.all(parts.map(async (part, index) => ({ index, offset: index ? 7 : 0, length: part.length, sha256: await sha256(part), url: `/chunks/${index}` }))),
    };
    const store = new VerifiedChunkStore(manifest);
    await store.put(0, parts[0]); await store.put(1, parts[1]);
    expect(new TextDecoder().decode(await store.reconstruct())).toBe("browser swarm ai");
  });

  it("rejects a corrupted chunk", async () => {
    const bytes = new Uint8Array([1, 2, 3]);
    const manifest: ArtifactManifest = { version: MANIFEST_VERSION, artifactId: "test", mediaType: "application/vnd.google.litert-model", byteLength: 3, chunkSize: 3, sha256: await sha256(bytes), chunks: [{ index: 0, offset: 0, length: 3, sha256: await sha256(bytes), url: "/chunks/0" }] };
    await expect(new VerifiedChunkStore(manifest).put(0, new Uint8Array([1, 2, 4]))).rejects.toThrow("SHA-256 mismatch");
  });
});
