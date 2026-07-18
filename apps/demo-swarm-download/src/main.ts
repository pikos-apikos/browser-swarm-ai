import "./style.css";
import { fetchChunk, fetchManifest, bootstrapArtifact } from "../../../packages/manifest/src/http-client.ts";
import { VerifiedChunkStore } from "../../../packages/manifest/src/chunks.ts";
import { PeerSwarm } from "../../../packages/transport-webrtc/src/peer-swarm.ts";
import { runSmokeInference, type LiteRtAccelerator } from "../../../packages/runtime-browser/src/litert-backend.ts";

const app = document.querySelector<HTMLElement>("#app")!;
app.innerHTML = `
  <section><p class="eyebrow">REFERENCE IMPLEMENTATION · v0.1</p><h1>Browser Swarm AI</h1><p>Bootstrap, verify, seed, reconstruct, and execute a LiteRT artifact in the browser.</p></section>
  <section class="panel">
    <label>Manifest URL <input id="manifest" value="http://localhost:8787/manifest.json"></label>
    <label>Signaling URL <input id="signal" value="ws://localhost:8787"></label>
    <label>Accelerator <select id="accelerator"><option>webgpu</option><option>wasm</option><option>webnn</option></select></label>
    <div class="actions"><button id="bootstrap">Bootstrap from HTTP</button><button id="peer">Load peer-first</button><button id="inference" disabled>Run LiteRT smoke inference</button></div>
  </section>
  <section class="metrics"><div><b id="chunks">0</b><span>verified chunks</span></div><div><b id="peers">0</b><span>connected peers</span></div><div><b id="source">—</b><span>last source</span></div></section>
  <pre id="log" aria-live="polite"></pre>`;

let store: VerifiedChunkStore | undefined;
let swarm: PeerSwarm | undefined;
let modelBytes: Uint8Array | undefined;
let runtimeProfile: Awaited<ReturnType<typeof fetchManifest>>["runtime"];
const logElement = element<HTMLPreElement>("log");

element<HTMLButtonElement>("bootstrap").onclick = () => void load(false);
element<HTMLButtonElement>("peer").onclick = () => void load(true);
element<HTMLButtonElement>("inference").onclick = () => void infer();

async function load(peerFirst: boolean): Promise<void> {
  try {
    swarm?.close();
    const manifest = await fetchManifest(value("manifest"));
    runtimeProfile = manifest.runtime;
    log(`Manifest ${manifest.artifactId}: ${manifest.chunks.length} chunks, ${manifest.byteLength} bytes`);
    store = peerFirst ? new VerifiedChunkStore(manifest) : await bootstrapArtifact(manifest);
    swarm = new PeerSwarm(value("signal"), manifest);
    if (!peerFirst) swarm.setStore(store);
    await swarm.connect();
    await wait(800);
    if (peerFirst) {
      for (const chunk of manifest.chunks) {
        let bytes: Uint8Array;
        try { bytes = await swarm.requestChunk(chunk.index); metric("source", "WebRTC"); }
        catch { bytes = await fetchChunk(chunk.url); metric("source", "HTTP fallback"); }
        await store.put(chunk.index, bytes);
        metric("chunks", String(store.size));
      }
      swarm.setStore(store);
    }
    modelBytes = await store.reconstruct();
    metric("chunks", String(store.size));
    metric("peers", String(swarm.connectedPeers));
    element<HTMLButtonElement>("inference").disabled = false;
    log(`Artifact verified end-to-end. Ready for LiteRT (${modelBytes.byteLength} bytes).`);
  } catch (error) { log(error instanceof Error ? error.message : String(error)); }
}

async function infer(): Promise<void> {
  if (!modelBytes) return;
  try {
    const result = await runSmokeInference(modelBytes, value("accelerator") as LiteRtAccelerator, runtimeProfile);
    const expectation = result.expectation ? `\nExpected output: ${result.expectation.passed ? "PASS" : "FAIL"} (max error ${result.expectation.maxAbsoluteError})` : "";
    log(`Inference completed in ${result.elapsedMs.toFixed(2)} ms${expectation}\n${JSON.stringify(result.outputs.map((output) => output.slice(0, 8)), null, 2)}`);
  } catch (error) { log(`LiteRT error: ${error instanceof Error ? error.message : String(error)}`); }
}

function element<T extends HTMLElement>(id: string): T { return document.getElementById(id) as T; }
function value(id: string): string { return (element<HTMLInputElement | HTMLSelectElement>(id)).value; }
function metric(id: string, text: string): void { element(id).textContent = text; }
function log(text: string): void { logElement.textContent = `${new Date().toLocaleTimeString()}  ${text}\n${logElement.textContent}`; }
function wait(ms: number): Promise<void> { return new Promise((resolve) => setTimeout(resolve, ms)); }
