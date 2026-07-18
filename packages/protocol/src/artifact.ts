export const MANIFEST_VERSION = "browser-swarm-artifact/v1" as const;

export interface ArtifactChunk {
  index: number;
  offset: number;
  length: number;
  sha256: string;
  url: string;
}

export interface ArtifactManifest {
  version: typeof MANIFEST_VERSION;
  artifactId: string;
  mediaType: "application/vnd.google.litert-model";
  byteLength: number;
  chunkSize: number;
  sha256: string;
  chunks: ArtifactChunk[];
  runtime?: LiteRtRuntimeProfile;
}

export interface LiteRtRuntimeProfile {
  backend: "litert";
  input?: {
    dtype: "float32" | "int32" | "uint8";
    shape: number[];
    values?: number[];
    fill?: number;
  };
  expectedOutput?: {
    values: number[];
    tolerance: number;
  };
}

export function assertManifest(value: unknown): asserts value is ArtifactManifest {
  const manifest = value as Partial<ArtifactManifest>;
  if (manifest.version !== MANIFEST_VERSION || !manifest.artifactId || !manifest.sha256) {
    throw new Error("Unsupported or incomplete artifact manifest");
  }
  if (!Array.isArray(manifest.chunks) || manifest.chunks.length === 0) {
    throw new Error("Artifact manifest has no chunks");
  }
  manifest.chunks.forEach((chunk, index) => {
    if (chunk.index !== index || chunk.length <= 0 || !chunk.sha256 || !chunk.url) {
      throw new Error(`Invalid chunk descriptor at index ${index}`);
    }
  });
}
