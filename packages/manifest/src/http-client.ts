import { assertManifest, type ArtifactManifest } from "../../protocol/src/artifact.ts";
import { VerifiedChunkStore } from "./chunks.ts";

export async function fetchManifest(url: string): Promise<ArtifactManifest> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Manifest request failed: HTTP ${response.status}`);
  const value: unknown = await response.json();
  assertManifest(value);
  return value;
}

export async function fetchChunk(url: string): Promise<Uint8Array> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Chunk request failed: HTTP ${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
}

export async function bootstrapArtifact(manifest: ArtifactManifest): Promise<VerifiedChunkStore> {
  const store = new VerifiedChunkStore(manifest);
  for (const chunk of manifest.chunks) await store.put(chunk.index, await fetchChunk(chunk.url));
  return store;
}
