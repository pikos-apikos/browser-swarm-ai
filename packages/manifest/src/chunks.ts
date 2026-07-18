import type { ArtifactManifest } from "../../protocol/src/artifact.ts";
import { verifySha256 } from "./crypto.ts";

export class VerifiedChunkStore {
  readonly #chunks = new Map<number, Uint8Array>();

  constructor(readonly manifest: ArtifactManifest) {}

  async put(index: number, bytes: Uint8Array): Promise<void> {
    const descriptor = this.manifest.chunks[index];
    if (!descriptor || bytes.byteLength !== descriptor.length) throw new Error(`Invalid chunk ${index} length`);
    await verifySha256(bytes, descriptor.sha256);
    this.#chunks.set(index, bytes.slice());
  }

  get(index: number): Uint8Array | undefined {
    return this.#chunks.get(index)?.slice();
  }

  get size(): number { return this.#chunks.size; }
  get complete(): boolean { return this.size === this.manifest.chunks.length; }

  async reconstruct(): Promise<Uint8Array> {
    if (!this.complete) throw new Error(`Artifact incomplete: ${this.size}/${this.manifest.chunks.length} chunks`);
    const artifact = new Uint8Array(this.manifest.byteLength);
    for (const descriptor of this.manifest.chunks) {
      const chunk = this.#chunks.get(descriptor.index);
      if (!chunk) throw new Error(`Missing chunk ${descriptor.index}`);
      artifact.set(chunk, descriptor.offset);
    }
    await verifySha256(artifact, this.manifest.sha256);
    return artifact;
  }
}
