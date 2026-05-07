# White Paper Assumption Validation

**Date:** 2026-05-07
**Status:** Research-based validation against current browser capabilities (as of Q1-Q2 2026)

---

## Summary Verdict

The white paper's architectural vision is **technically sound and largely validated** by current browser capabilities and emerging implementations. Several assumptions are optimistic but directionally correct; others have real constraints that the paper partially acknowledges but could address more precisely.

---

## 1. Transport Layer (WebRTC P2P)

**Claim:** Browsers can participate in peer-to-peer networks for chunk exchange.

**Verdict:** ✅ VALIDATED with important constraints.

**Evidence:**
- WebRTC data channels (`RTCDataChannel`) are Baseline since January 2020, available across all modern browsers.
- SCTP-based transport supports reliable, unreliable, and partial-reliable delivery modes.
- Max data channels per connection: 65,534 (theoretical).
- Recommended chunk size: 64 KiB per message.

**Real constraints the paper understates:**
- **SCTP window size is fixed at 128 KiB** in both Chrome and Firefox implementations, causing severe throughput degradation with any network latency beyond LAN. Academic research (Eskola) demonstrated this cuts throughput dramatically even at modest RTTs. This is a protocol-level limitation, not an application design choice.
- **Throughput ceiling:** ~30 MB/s appears to be the practical maximum for WebRTC data channels in current browsers, even on localhost. With optimized buffering (`bufferedAmountLowThreshold`), speeds of ~300 MB/s are achievable on fast hardware locally, but real-world WAN performance is much lower.
- **TURN relaying is expensive** and necessary for peers behind symmetric NATs (~8-10% of connections according to WebRTC stats).
- **Safari and Firefox impose file size and memory limits** that make large model transfers challenging. Perkoon's deep dive documented: Safari hard ~4 GB limit for File System Access, Firefox OPFS caps around ~10 GB.

**Prior art reference (nullroom.io):** An open-source, zero-trace P2P messaging app that demonstrates production-grade browser WebRTC with post-quantum encryption (ML-KEM-768 + AES-GCM 256-bit via Web Crypto API). Proves browser P2P data channels work reliably with advanced crypto at scale — directly validating the transport layer assumptions. Architecture: E2EE via URL fragment keys (never sent to server), 15-minute ephemeral rooms, no accounts, no logs.

**Recommendation for white paper:** Add explicit mention of SCTP window size limitation and the need for adaptive chunk scheduling, parallel data channels, and TURN fallback economics.

---

## 2. Browser Local AI Inference (Runtime Layer)

**Claim:** Browsers can execute increasingly capable local AI workloads.

**Verdict:** ✅ STRONGLY VALIDATED. This is the most validated claim in the paper.

**Evidence:**
- **BrowserAI** (2025): Production npm package (`@browserai/browserai`) providing a unified API over MLC and Transformers.js backends. Supports WebGPU, WebNN, and WASM acceleration; Web Workers for background processing; structured outputs; streaming; built-in IndexedDB/SQLite database. Demonstrates that browser AI is accessible at the `npm install` level of developer experience.
- **WebLLM** (MLC-AI, Dec 2024): Retains up to **80%** of native Metal performance on Apple Silicon. Llama-3.1-8B@q4 achieves 41 tok/s in Chrome vs 58 tok/s native on M3 Max. Phi-3.5-mini (3.8B): 71 tok/s browser vs 89 tok/s native.
- **WeInfer** (ACM paper, Apr 2025): Achieves 3.76x improvement over baseline WebLLM through buffer reuse and async pipelining.
- Real-world benchmarks on AMD RX 7800 XT with Vulkan backend: Qwen3-0.6B ~80-100 tok/s, Qwen3-4B ~60-70 tok/s, Qwen3-8B ~40-50 tok/s.
- **WebGPU** stable in Chrome/Edge since May 2023 (v113+), Safari since June 2025, Firefox on Windows since July 2025.
- **WebAssembly** with SIMD128 and threads (via SharedArrayBuffer + COOP/COEP headers) provides CPU fallback universally.
- **Chrome ships a built-in Gemini Nano model** via the Prompt API (experimental, behind flag).
- Multiple production-grade frameworks: WebLLM, Transformers.js (v4.x), llama.cpp WASM/WebGPU builds, FlareLLM (pure Rust/WASM), wllama.

**Model size reality:**
- Practical browser-friendly range: **0.5B to 8B parameters** (4-bit quantized).
- 4-bit model download sizes: ~0.5 GB (1B), ~2 GB (4B), ~4-5 GB (8B).
- Beyond 8B, browser memory constraints become problematic — the paper correctly identifies this.

**WebNN status:**
- W3C Candidate Recommendation as of April 2025, updated January 2026.
- Provides the **only** web API path to NPU hardware acceleration.
- Graph-based computation, uniquely suited for NPUs.
- Browser support still evolving; mainly Chromium with flags/origin trials.

**Browser compatibility gaps:**
- Safari WebGPU has limitations (no full compute shader support until mid-2025).
- Firefox WebGPU performance varies significantly by platform.
- ~78% of users have WebGPU-capable devices; 22% fall back to WASM (real-world production data).

---

## 3. Browser Storage Model Artifacts

**Claim:** Browsers can cache and store model artifacts locally.

**Verdict:** ✅ VALIDATED, but with real-world friction.

**Evidence:**
- **IndexedDB:** Cross-browser, supports large structured data including files/blobs. Storage governed by browser quotas.
- **OPFS (Origin Private File System):** Well-established since March 2023. Byte-level file access, synchronous API in workers, no permission prompts. Optimized for large files (300 MB+).
- **Cache API:** Stores HTTP request/response pairs, ideal for CDN-served model chunks.

**Storage quotas (critical reality):**
| Browser | Default Quota |
|---------|--------------|
| Chrome/Edge | Up to 60% of total disk (best-effort) |
| Firefox | Up to 50% of free disk, 2 GB per eTLD+1 group |
| Safari | ~1 GB initially, prompts for more in 200 MB increments |
| Chrome with "Clear on close" | ~300 MB |
| Incognito/Private | ~5% of disk (Chrome) |

**Key friction point:** A 4-5 GB 8B quantized model **exceeds Firefox's default per-origin limit** and **hits Safari's quota prompting**. Chrome is generous. The paper should note that Firefox users would need persistent storage permission (`navigator.storage.persist()`), and Safari users may face friction.

**Real-world issue:** WebLLM's IndexedDB cache backend has documented failures when browser quotas are hit (Issue #374), resulting in silent partial cache misses that corrupt model loading.

---

## 4. Split Inference Across Browser Peers

**Claim:** Execution can be split across peers at stable architectural boundaries.

**Verdict:** ✅ EMERGING VALIDATION. Real implementations exist but in early stages.

**Evidence:**
- **LARQL** (Chris Hay, 2025-2026, 881 GitHub stars): Production-grade system that decouples attention from FFN weights, enabling split execution of large models across heterogeneous machines. Key innovations directly validating the white paper:
  - **Attention/FFN decoupling:** Attention runs on GPU (~2 GB for 31B model); FFN runs on CPU-only machines with no GPU or VRAM. This is the core architectural insight the white paper proposes as "expert/block peer" and "attention/router peer" roles.
  - **MoE expert sharding:** Expert weights served from CPU-only remote machines (fly.io deployment demonstrated). Client runs attention + router locally; expert servers hold dormant majority as memory-mapped data.
  - **2D layer × expert grid:** Both layer sharding and expert sharding scale independently. Demonstrated on Gemma 4 26B A4B (1.6T total params, 4B active).
  - **3-tier topology:** Attention-only client (~310 MB) + Embed server + FFN server. Makes large models accessible on laptops with ~1 GB RAM budget.
  - **Performance:** 83.2 tok/s local Metal decode (Gemma 3 4B Q4K on M3 Max); 6.5 tok/s remote-FFN batch (Gemma 4 31B Q4K with remote Metal GPU server); 18.9 tok/s local MoE (Gemma 4 26B A4B).
  - **Vindex format:** Novel file format that makes model weights queryable as a graph database — directly enabling the "knowledge editing" and "bounded adaptation" concepts in the white paper.
  - Supports Gemma 2/3/4, Llama 2/3, Mistral, Mixtral, Qwen, Phi, DeepSeek V2/V3, GPT-OSS families.
- **Chris Hay — "I Decoupled Attention from Weights"** (YouTube, May 2026): Demonstrates running Gemma 4 26B by splitting attention (~2 GB on GPU) from FFN/expert weights on CPU-only consumer machines. Validates the central split-inference thesis: "Attention is the only thing that needs GPU."
- **LLMlet** (ktock, 2025): Demonstrated working P2P distributed LLM inference across browser tabs using WebRTC + llama.cpp RPC. Models split at layer granularity. Working demo on GitHub Pages using PeerJS public server. Presented at Wasm I/O 2026.
- **BIM (Browser-Native Tokenized Inference Mesh):** Academic paper proposing subnet abstraction, tolerance-aware consensus, reputation/staking. Includes working embeddings subnet prototype.
- **FlareLLM** (2026): Exposes `embed_token()` and `output_projection()` primitives specifically designed for WebRTC mesh coordination. P2P collaborative inference listed as active development (#389).
- **DistML.js:** Prior art for distributed training on browsers with data parallelism (not inference).

**Constraints the paper should address:**
- LARQL's approach proves that **FFN/expert serving can run CPU-only** with near-GPU throughput on the same machine, but remote serving adds network latency (6.5 tok/s remote vs 83.2 tok/s local). The white paper should acknowledge this bandwidth-quality tradeoff.
- LLMlet's layer-granularity split means **every peer must have enough memory for at least one full layer**. For large models with wide layers, this may still require significant resources per peer.
- **Parallelism not yet supported** in current implementations — peers evaluate sequentially, adding communication overhead to inference speed.
- No existing implementation supports multi-client simultaneous serving.
- The paper's "session pinning" concept is correct given current constraints — dynamic token-level routing across peers is not practical.

---

## 5. Browser Background Execution (Ephemeral Swarm)

**Claim:** Browsers are voluntary and ephemeral; the design should not assume long-lived browser presence.

**Verdict:** ✅ CORRECTLY PESSIMISTIC. Browser background execution is severely limited.

**Evidence:**
- **Service workers:** Terminated after 30 seconds of inactivity (Chrome), or when a single request exceeds 5 minutes processing, or when `fetch()` exceeds 30 seconds. This is **intentional** — browsers protect users from background resource drain.
- **Web workers (non-service):** Throttled or suspended when the tab is in the background, especially on mobile. After ~5 minutes in background on mobile, network requests halt entirely.
- **Push notifications** are the only reliable way to wake a service worker, and even then, Chrome requires every push to show a visible notification.
- **Background Fetch API:** Still experimental (not Baseline), not supported in Safari or Firefox. Only in Chromium-based browsers.
- **Background Sync API:** Limited retries, short execution windows, not suitable for compute workloads.

**What works:**
- A browser tab kept **active and foregrounded** can participate indefinitely.
- **Browser extensions** with `unlimitedStorage` permission and service worker persistence get longer lifetimes.
- **Native bridge peers** (where allowed) are the only reliable path to persistent participation — the paper correctly acknowledges this.

**Recommendation:** The paper is appropriately cautious here. It could strengthen this section by noting that browser swarm participation for **seeding/caching** is viable on desktop with active tabs, but **worker compute** contributions require either foreground presence or native bridge nodes.

---

## 6. Capability-Based Routing

**Claim:** A swarm should route by capability, not assume uniform peers.

**Verdict:** ✅ CONCEPTUALLY SOUND. Matches real heterogeneity.

**Evidence:**
- The capability taxonomy (client-only, chunk seeder, attention/router, expert/block, full worker, adaptation worker, coordinator) maps cleanly to real hardware diversity.
- WebLLM provides `getMaxStorageBufferBindingSize()` for GPU capability detection.
- WebGPU adapter limits, WebNN device type selection (`cpu`/`gpu`/`npu`), and WASM feature detection provide the foundation for capability advertisement.
- The BIM paper proposes diversity-aware routing with ASN/IP/OS/GPU family constraints to mitigate Sybil attacks — this is real research, not speculation.

**Open concern:** The paper correctly flags fingerprinting risk from capability advertisements. WebGPU adapter info already leaks significant hardware details; adding explicit capability ads amplifies this. Mitigations could include bucketing (round to nearest tier) and delaying advertisement until task matching.

---

## 7. Content-Addressed Delivery

**Claim:** Artifacts should be chunked, hashed, and verifiable.

**Verdict:** ✅ STANDARD PRACTICE. Well-supported in browser APIs.

**Evidence:**
- **Subresource Integrity (SRI)** is natively supported in browsers for hash-verifying fetched resources.
- Web Crypto API provides SHA-256 and other hash functions for chunk verification.
- Streams API allows progressive hash verification during download.
- CDN + Service Worker caching with SRI is the standard pattern used by WebLLM, Transformers.js, and similar frameworks.

**The paper's chunking/sharding distinction (delivery vs. footprint) is useful and under-appreciated** in existing implementations, which tend to conflate the two.

---

## 8. Adaptation / Training in Browser

**Claim:** Browsers may contribute bounded, verifiable adaptation work; large-scale training belongs to stable workers.

**Verdict:** ✅ CORRECTLY SCOPED. Browser training is real but limited.

**Evidence:**
- **LoRA adapter training** is within browser capability for small models.
- WebGPU supports the compute operations needed for gradient computation on small parameter sets.
- FlareLLM lists "LoRA adapter hot-swapping" as a roadmap item (#390).
- The distinction between "bounded adaptation" and "full fine-tuning" is critical and correct — the paper appropriately scopes browser training to the former.
- **DistML.js** demonstrated data-parallel training in browsers but required a coordinating server.
- **Nous Research Psyche** (2025): Successfully demonstrated the **largest distributed pre-training run ever** (Consilience 40B) over internet bandwidth, coordinated via smart contracts on Solana. Now moving into "full trainer abstraction" supporting pre-training, supervised fine-tuning, and reinforcement learning. Validates that distributed training coordination at scale is feasible — though Psyche uses native nodes, not browsers, the coordination layer concepts (task offers, work assignment, verification) map directly to the white paper's coordination layer design. Their move "from provability to performance" mirrors the white paper's Phase 4 roadmap.

---

## 9. Key Assumptions That Need Calibration

### Overly optimistic:
1. **"Peer-assisted delivery will be faster than CDN"** — Not stated explicitly, but implied by the swarm-download framing. In practice, CDN + Cache API provides fast, reliable delivery for most users. Swarm delivery helps in CDN-constrained or offline-first scenarios, not as a speed replacement.

2. **Implicit assumption that enough peers will seed** — The paper doesn't address the cold-start problem: how does the first peer get the model? It assumes CDN bootstrap, which is fine, but doesn't make this explicit.

3. **Latency of split inference** — The paper acknowledges this is an open question but doesn't quantify. Current LLMlet demos show sequential layer evaluation across peers, which adds latency proportional to (n_layers / n_peers) * per-hop RTT. For 32 layers across 4 peers on a typical home network, this could add 50-200ms per token. This is acceptable for async batch inference but problematic for interactive chat.

### Well-calibrated:
1. Browser ephemerality
2. Need for verification at every layer
3. Coarse execution boundaries over micro-routing
4. Incentive neutrality
5. Privacy disclosure to users about execution mode

---

## 10. Existing Comparable Implementations

| Project | Browser? | P2P? | Split Inference? | Status |
|---------|----------|------|------------------|--------|
| [WebLLM](https://github.com/mlc-ai/web-llm) | ✅ Yes | ❌ No | ❌ No | Production, 14K+ GitHub stars |
| [BrowserAI](https://github.com/sauravpanda/BrowserAI) | ✅ Yes | ❌ No | ❌ No | Production, npm package |
| [Transformers.js](https://github.com/huggingface/transformers.js) | ✅ Yes | ❌ No | ❌ No | Production, 13K+ stars |
| [llama.cpp](https://github.com/ggml-org/llama.cpp) (WASM build) | ✅ Yes | ❌ No | ❌ No | Production |
| **[LARQL](https://github.com/chrishayuk/larql)** | ❌ No (native) | ❌ No | ✅ **Yes** (attention/FFN decoupling, MoE sharding, 2D grids) | **Active production, 881 stars** |
| [LLMlet](https://github.com/ktock/llmlet) | ✅ Yes | ✅ Yes (WebRTC) | ✅ Yes (layer-split) | Experimental demo |
| [FlareLLM](https://github.com/sauravpanda/flarellm) | ✅ Yes | 🔜 Planned | 🔜 Primitives exposed | Active development |
| [BIM](https://tangerine-crumble-635998.netlify.app/) (Browser Inference Mesh) | ✅ Yes | ✅ Yes (WebRTC) | ✅ Yes (subnets) | Academic + prototype |
| [exo](https://github.com/exo-explore/exo) | ❌ No (native) | ✅ Yes | ✅ Yes | Active development |
| [DistML.js](https://github.com/andrewhead/DistML.js) | ✅ Yes | ❌ No (server-coordinated) | ❌ No (data parallel) | Research |

**Key gap:** No production-ready, open-source implementation combining **browser-native P2P model distribution** AND **split inference**. LARQL proves split inference at production quality (native, not browser), LLMlet proves browser P2P split inference (experimental). Bridging these two — LARQL-quality split inference inside browser P2P networks — is the precise gap this white paper targets.

---

## 11. Overall Assessment

The white paper's architectural vision is **feasible within current browser capabilities**, with specific constraints that the paper mostly acknowledges or leaves as open questions. The paper is neither unrealistically optimistic nor needlessly pessimistic — it correctly identifies the design space and its boundaries.

**Strongest validated claims:**
- Browser-local AI inference is production-viable (WebGPU + quantized models)
- Content-addressed chunk delivery is standard practice
- Peers are heterogeneous and should not be treated as uniform
- Browsers are ephemeral and swarm design must accommodate this

**Needs more precision:**
- SCTP window size limits WebRTC throughput at WAN latencies
- Browser storage quotas vary dramatically by vendor and user settings
- Split inference latency impact needs quantification (LARQL provides benchmarks: 6.5 tok/s remote-FFN batch on 31B model vs 83.2 tok/s local on 4B, illustrating the network penalty)
- Cold-start model distribution path should be explicit

**Unique contribution:** The paper's "federation of partial capabilities" framing — where the unit of participation is not "a machine that can run the whole model" but "a peer that can contribute one or more useful capabilities" — is the most valuable architectural insight, and it remains underexplored by existing implementations.

---

## References

- WebLLM: Ruan et al., "WebLLM: A High-Performance In-Browser LLM Inference Engine" (arXiv:2412.15803, Dec 2024)
- WeInfer: Chen et al., "WeInfer: Unleashing WebGPU on LLM Inference in Web Browsers" (ACM, Apr 2025)
- WebRTC SCTP: Eskola, "Performance Evaluation of WebRTC Data Channels" (Univ. Helsinki)
- BIM: "BIM: A Browser-Native Tokenized Inference Mesh" (tangerine-crumble-635998.netlify.app)
- LLMlet: github.com/ktock/llmlet (Wasm I/O 2026 presentation)
- FlareLLM: github.com/sauravpanda/flarellm
- LARQL: github.com/chrishayuk/larql — "The model IS the database." Attention/FFN decoupling, MoE sharding, vindex format. Chris Hay, 2025-2026.
- Chris Hay: "I Decoupled Attention from Weights — Gemma 4 26B" (YouTube, May 2026) — Demonstrated attention-only ~2 GB on GPU, FFN/expert weights on CPU-only consumer machines.
- Nous Research Psyche: "The Next Phase of Psyche" (nousresearch.com, Sep 2025) — Distributed training coordination via Solana smart contracts. Consilience 40B run.
- BrowserAI: browserai.dev / npm: `@browserai/browserai` — Production browser AI library with MLC + Transformers.js backends.
- nullroom.io: Zero-trace P2P messaging. Open source. Post-quantum E2EE via Web Crypto API + WebRTC. Validates browser P2P at production scale.
- Storage quotas: MDN, web.dev (Google), Perkoon Technical Deep Dive
- WebNN: W3C Candidate Recommendation, April 2025 / January 2026
