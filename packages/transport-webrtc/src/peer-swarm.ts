import type { ArtifactManifest } from "../../protocol/src/artifact.ts";
import { VerifiedChunkStore } from "../../manifest/src/chunks.ts";

type Signal = RTCSessionDescriptionInit | RTCIceCandidateInit;
type WireMessage =
  | { type: "chunk-request"; requestId: string; index: number }
  | { type: "chunk-response"; requestId: string; index: number; base64?: string; error?: string };

interface PendingRequest { resolve: (value: Uint8Array) => void; reject: (reason: Error) => void; timer: number }

export class PeerSwarm {
  readonly peerId = crypto.randomUUID();
  readonly #connections = new Map<string, RTCPeerConnection>();
  readonly #channels = new Map<string, RTCDataChannel>();
  readonly #pending = new Map<string, PendingRequest>();
  #socket?: WebSocket;
  #store?: VerifiedChunkStore;

  constructor(readonly signalingUrl: string, readonly manifest: ArtifactManifest) {}

  setStore(store: VerifiedChunkStore): void { this.#store = store; }
  get connectedPeers(): number { return [...this.#channels.values()].filter((channel) => channel.readyState === "open").length; }

  async connect(): Promise<void> {
    const socket = this.#socket = new WebSocket(this.signalingUrl);
    await new Promise<void>((resolve, reject) => {
      socket.addEventListener("open", () => resolve(), { once: true });
      socket.addEventListener("error", () => reject(new Error("Signaling connection failed")), { once: true });
    });
    socket.addEventListener("message", (event) => void this.#onSignalMessage(JSON.parse(String(event.data))));
    socket.send(JSON.stringify({ type: "join", room: this.manifest.artifactId, peerId: this.peerId }));
  }

  async requestChunk(index: number, timeoutMs = 4000): Promise<Uint8Array> {
    const channel = [...this.#channels.values()].find((candidate) => candidate.readyState === "open");
    if (!channel) throw new Error("No connected peer can serve chunks");
    const requestId = crypto.randomUUID();
    return new Promise<Uint8Array>((resolve, reject) => {
      const timer = window.setTimeout(() => {
        this.#pending.delete(requestId);
        reject(new Error(`Peer chunk ${index} timed out`));
      }, timeoutMs);
      this.#pending.set(requestId, { resolve, reject, timer });
      channel.send(JSON.stringify({ type: "chunk-request", requestId, index } satisfies WireMessage));
    });
  }

  close(): void {
    this.#channels.forEach((channel) => channel.close());
    this.#connections.forEach((connection) => connection.close());
    this.#socket?.close();
  }

  async #onSignalMessage(message: any): Promise<void> {
    if (message.type === "peers") {
      for (const peerId of message.peers as string[]) await this.#createOffer(peerId);
      return;
    }
    if (message.type !== "signal" || message.to !== this.peerId) return;
    const connection = this.#connection(message.from);
    const signal = message.data as Signal;
    if ("type" in signal) {
      await connection.setRemoteDescription(signal as RTCSessionDescriptionInit);
      if (signal.type === "offer") {
        const answer = await connection.createAnswer();
        await connection.setLocalDescription(answer);
        this.#sendSignal(message.from, answer);
      }
    } else await connection.addIceCandidate(signal as RTCIceCandidateInit);
  }

  async #createOffer(peerId: string): Promise<void> {
    const connection = this.#connection(peerId);
    this.#attachChannel(peerId, connection.createDataChannel("artifact-chunks"));
    const offer = await connection.createOffer();
    await connection.setLocalDescription(offer);
    this.#sendSignal(peerId, offer);
  }

  #connection(peerId: string): RTCPeerConnection {
    const existing = this.#connections.get(peerId);
    if (existing) return existing;
    const connection = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
    connection.addEventListener("icecandidate", (event) => { if (event.candidate) this.#sendSignal(peerId, event.candidate.toJSON()); });
    connection.addEventListener("datachannel", (event) => this.#attachChannel(peerId, event.channel));
    this.#connections.set(peerId, connection);
    return connection;
  }

  #attachChannel(peerId: string, channel: RTCDataChannel): void {
    channel.addEventListener("message", (event) => void this.#onChunkMessage(channel, JSON.parse(String(event.data))));
    this.#channels.set(peerId, channel);
  }

  async #onChunkMessage(channel: RTCDataChannel, message: WireMessage): Promise<void> {
    if (message.type === "chunk-request") {
      const bytes = this.#store?.get(message.index);
      const response: WireMessage = bytes
        ? { type: "chunk-response", requestId: message.requestId, index: message.index, base64: toBase64(bytes) }
        : { type: "chunk-response", requestId: message.requestId, index: message.index, error: "chunk unavailable" };
      channel.send(JSON.stringify(response));
      return;
    }
    const pending = this.#pending.get(message.requestId);
    if (!pending) return;
    window.clearTimeout(pending.timer);
    this.#pending.delete(message.requestId);
    if (message.error || !message.base64) pending.reject(new Error(message.error ?? "Invalid peer response"));
    else pending.resolve(fromBase64(message.base64));
  }

  #sendSignal(to: string, data: Signal): void {
    this.#socket?.send(JSON.stringify({ type: "signal", room: this.manifest.artifactId, from: this.peerId, to, data }));
  }
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}
