import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { WebSocketServer, type WebSocket } from "ws";
import { MANIFEST_VERSION, type ArtifactManifest } from "../../../packages/protocol/src/artifact.ts";
import { sha256 } from "../../../packages/manifest/src/crypto.ts";

const port = Number(process.env.PORT ?? 8787);
// Base64 is deliberately used by the inspectable v0.1 wire format. Keep the
// encoded data plus JSON envelope safely below a 64 KiB SCTP message.
const chunkSize = Number(process.env.CHUNK_SIZE ?? 32 * 1024);
const modelPath = process.env.MODEL_PATH ? resolve(process.env.MODEL_PATH) : undefined;
const profilePath = process.env.MODEL_PROFILE_PATH ? resolve(process.env.MODEL_PROFILE_PATH) : undefined;
const rooms = new Map<string, Map<string, WebSocket>>();
let artifact: { bytes: Uint8Array; manifest: ArtifactManifest } | undefined;

if (modelPath) artifact = await prepareArtifact(modelPath);

const server = createServer(async (request, response) => {
  response.setHeader("Access-Control-Allow-Origin", "*");
  if (request.url === "/health") return json(response, 200, { ok: true, artifact: artifact?.manifest.artifactId ?? null });
  if (!artifact) return json(response, 503, { error: "Start gateway with MODEL_PATH=/path/to/model.tflite" });
  if (request.url === "/manifest.json") return json(response, 200, artifact.manifest);
  const match = request.url?.match(/^\/chunks\/(\d+)$/);
  if (match) {
    const descriptor = artifact.manifest.chunks[Number(match[1])];
    if (!descriptor) return json(response, 404, { error: "Unknown chunk" });
    response.writeHead(200, { "Content-Type": "application/octet-stream", "Content-Length": descriptor.length });
    return response.end(artifact.bytes.subarray(descriptor.offset, descriptor.offset + descriptor.length));
  }
  return json(response, 404, { error: "Not found" });
});

const sockets = new WebSocketServer({ server });
sockets.on("connection", (socket) => {
  socket.on("message", (raw) => {
    const message = JSON.parse(String(raw));
    if (message.type === "join") {
      const room = rooms.get(message.room) ?? new Map<string, WebSocket>();
      const peers = [...room.keys()];
      room.set(message.peerId, socket);
      rooms.set(message.room, room);
      socket.send(JSON.stringify({ type: "peers", peers }));
      socket.once("close", () => { room.delete(message.peerId); if (!room.size) rooms.delete(message.room); });
      return;
    }
    if (message.type === "signal") rooms.get(message.room)?.get(message.to)?.send(JSON.stringify(message));
  });
});

server.listen(port, () => console.log(`Browser Swarm gateway: http://localhost:${port} (${artifact ? artifact.manifest.artifactId : "no MODEL_PATH"})`));

async function prepareArtifact(path: string): Promise<{ bytes: Uint8Array; manifest: ArtifactManifest }> {
  const bytes = new Uint8Array(await readFile(path));
  const artifactHash = await sha256(bytes);
  const chunks = [];
  for (let offset = 0, index = 0; offset < bytes.length; offset += chunkSize, index++) {
    const slice = bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length));
    chunks.push({ index, offset, length: slice.length, sha256: await sha256(slice), url: `http://localhost:${port}/chunks/${index}` });
  }
  const runtime = profilePath ? JSON.parse(await readFile(profilePath, "utf8")) : undefined;
  return { bytes, manifest: { version: MANIFEST_VERSION, artifactId: `${basename(path)}-${artifactHash.slice(0, 12)}`, mediaType: "application/vnd.google.litert-model", byteLength: bytes.length, chunkSize, sha256: artifactHash, chunks, runtime } };
}

function json(response: any, status: number, value: unknown): void {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(value));
}
