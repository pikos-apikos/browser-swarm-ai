# Browser Swarm AI

Browser-native AI through peer-assisted distribution, local inference, split inference, and capability-based participation.

## Documents

| Document | Purpose |
|----------|---------|
| [WHITEPAPER.md](WHITEPAPER.md) | Full architectural white paper |
| [SPEC.md](SPEC.md) | Specification draft — protocol objects, peer lifecycle, integrity rules |
| [ROADMAP.md](ROADMAP.md) | Development phases and milestones |
| [VALIDATION.md](VALIDATION.md) | Technical assumption validation against current browser capabilities |

## What this is

Browser Swarm AI is an open template for building systems where:

- model artifacts can be distributed through a browser-friendly swarm
- inference runs locally in the browser when possible
- execution can be split across peers when local hardware is insufficient
- peers contribute according to capability, not uniformity
- coordination is optional and modular
- no single cloud backend is required for the whole stack

This repo is **not** a finished product.
It is a **reference architecture + starter implementation** for people who want to explore:

- WebRTC-based peer transport
- content-addressed model delivery
- browser runtime execution (WebGPU, WebNN, WASM)
- split inference across heterogeneous peers
- peer role specialization (client, seeder, router, worker, expert host)
- optional task coordination and verification

Think of it as:

**BitTorrent-style ideas for AI assets and browser compute — where weak devices can still be clients, storage devices can still seed, and GPU-capable devices can serve attention, experts, or blocks.**

## Why

Today, four things have become practical at the same time:

1. Browsers can participate in peer-to-peer networks.
2. Browsers can execute increasingly capable local AI workloads (WebGPU retains ~80% of native performance).
3. Model packaging and quantization make it practical to separate artifacts into chunks, shards, and adapters.
4. Coordination layers can distribute work across many independent nodes.

Taken together, this suggests a new application pattern:

- distribute model artifacts through a swarm
- cache them close to users
- run inference locally when hardware allows
- split execution across peers at stable architectural boundaries when local hardware is insufficient
- optionally coordinate shared workloads across many peers
- support bounded adaptation where appropriate

## Design goals

- **Browser first, not browser only**: a peer should be able to join with just a browser. Native or server-based peers are allowed where necessary.
- **Capability over uniformity**: peers should advertise what they can do rather than pretending all peers are interchangeable.
- **Modular**: transport, content, runtime, and coordination are separate layers.
- **Local when possible, distributed when necessary**: if a task can be executed locally, it should be. If it cannot, execution may be routed to selected peers.
- **Content addressed**: model artifacts should be chunked, hashed, and verifiable.
- **Coarse execution boundaries**: stable blocks, expert groups, or session-pinned workers over token-by-token routing across random peers.
- **Graceful fallback**: if swarm participation is unavailable, the app should still function in degraded mode.
- **Open template**: easy to fork, replace, or simplify.

## Non-goals for v0

This repo does **not** try to solve all of the following in its first versions:

- decentralized training at full scale (pretraining belongs to selected stable workers)
- tokenomics or blockchain incentives (the protocol remains incentive-neutral)
- trustless execution of arbitrary remote code
- privacy guarantees beyond the limits of browser execution
- replacement of existing ML infrastructure
- universal perfection of split inference efficiency

## Architecture

The architecture is four layers, each with clearly separated responsibilities.

### Layer 1 — Transport
Responsible for peer discovery and chunk exchange. Agnostic to the semantic meaning of model artifacts.

- WebRTC data channels (reliable and unreliable modes)
- WebSocket tracker/signaling
- STUN/TURN for NAT traversal
- retry logic and disconnect handling
- activation packet exchange for split inference

### Layer 2 — Content Addressing
Responsible for what is being moved. Turns raw files into verifiable artifacts.

- model manifests
- chunk maps and chunk hashes
- shard definitions and semantic splits
- version compatibility metadata
- cacheability and pinning policies
- adapter and checkpoint metadata

### Layer 3 — Runtime
Responsible for local execution. Detects environment, loads models, executes workloads.

- model loading (WebGPU, WebNN, WASM backends)
- environment detection and capability probing
- memory policy and quota enforcement
- execution policy (local, split, remote)
- streaming output support
- split inference packet handling
- adapter loading and hot-swapping
- fallback behavior

### Layer 4 — Coordination
Responsible for optional multi-peer orchestration. Becomes increasingly necessary as workloads become distributed.

- model catalogs and availability
- capability advertisements
- peer selection and session graph construction
- task offers and claiming
- worker leases with timeout and reassignment
- failure handling
- reputation inputs
- quota and fairness policies

## Peer Roles

Not every peer is the same. Browser Swarm AI assumes specialized roles based on capability.

| Role | Description | Requirements |
|------|-------------|--------------|
| **Client-Only Peer** | Selects models, requests sessions, consumes results | Browser only |
| **Chunk Seeder** | Stores and serves model artifacts or static assets | Storage, network |
| **Attention / Router Peer** | Hot-path routing logic, decides experts or blocks per token | WebGPU, moderate compute |
| **Expert / Block Peer** | Hosts a bounded part of the model (transformer blocks, expert groups, adapters) | CPU or GPU, sufficient memory for the shard |
| **Full Worker Peer** | Executes the complete model for a request | Strong GPU, full model memory |
| **Adaptation Worker** | Executes bounded training or model adaptation tasks | Stable compute, GPU recommended |
| **Coordinator / Catalog Node** | Publishes models, tracks capabilities, assigns workers, issues leases | Stable connection, coordination logic |

A peer may hold multiple roles. The unit of participation is not "a machine that can run the whole model" but "a peer that can contribute one or more useful capabilities."

## Execution Modes

The system supports multiple execution modes rather than one universal path.

### Mode A: Remote Inference Directory
A weak browser peer selects from a list of available models served by other peers. The local browser acts only as client and control plane. Lowest barrier entry point.

### Mode B: Local Inference with Peer-Assisted Delivery
The browser downloads model artifacts from the swarm and runs the model locally. Distribution is shared; execution is local. Cleanest browser-native baseline.

### Mode C: Split Inference
The local browser performs one part of execution while selected remote peers perform the rest. Examples: local attention + remote experts, local routing + remote feed-forward blocks. Reduces local footprint while preserving partial local control.

### Mode D: Cooperative Artifact Hosting
A browser hosts chunks, shards, or adapters for others even when not actively using the model. Turns browsers into infrastructure participants.

### Mode E: Full Worker Contribution
A browser or native bridge volunteers to serve a whole model or a major execution shard for others.

## Proposed repo layout

```text
browser-swarm-ai/
  README.md
  LICENSE
  WHITEPAPER.md
  SPEC.md
  ROADMAP.md
  VALIDATION.md

  apps/
    demo-chat/
    demo-swarm-download/
    demo-batch-inference/
    demo-split-inference/

  packages/
    protocol/
    transport-webrtc/
    tracker-client/
    manifest/
    runtime-browser/
    coordinator/
    verifier/
    capability/

  services/
    tracker/
    coordinator-api/

  docs/
    architecture/
    threat-model/
    use-cases/
    protocol-overview/
```

## Minimal viable prototype

### v0.1 — Swarm Download + Local Inference
- browser peer joins a swarm
- peer downloads model chunks from other peers
- manifest verifies chunk integrity
- browser runtime loads a small model
- app performs local inference

### v0.2 — Caching + Capability
- resumable chunk cache (IndexedDB / OPFS)
- peer capability advertisement
- better chunk scheduling with SCTP-aware pacing
- optional coordinator for work offers

### v0.3 — Split Inference
- session-pinned split inference across selected peers
- attention/FFN decoupling
- expert hosting for MoE models
- worker leases with timeout and failover

### v0.4 — Coordination + Verification
- verification hooks for artifacts, runtime, and adaptation
- multi-model manifests with adapter support
- peer reputation and rate limiting
- bounded adaptation workflows

## Example use cases

- offline-friendly browser chat app
- community-hosted model distribution
- edge-local assistants
- classroom or hackathon swarms
- temporary peer groups for shared inference experiments
- split inference for large models on consumer hardware
- cooperative artifact hosting within organizations
- privacy-preserving local inference with swarm fallback

## Threat model

This architecture must assume:

- peers may lie
- peers may disappear
- peers may throttle or send garbage
- browsers have strict sandbox limits
- local hardware capabilities vary a lot
- WebRTC SCTP throughput is constrained on WAN links

Because of this, every layer should be designed around:

- verification (hashes, checks, sanity checks)
- timeouts (session heartbeats, worker leases)
- retries (bounded, with backoff)
- capability detection (probe before promise)
- graceful degradation (local fallback when swarm is unavailable)
- session pinning (stable execution graphs over chaotic routing)

## Open questions

- How should capability advertisements avoid excessive fingerprinting?
- What is the best chunking and sharding strategy for models, tokenizers, and adapters?
- How should outputs be verified in split inference flows?
- Which adaptation tasks are realistic inside commodity browsers?
- What are the safest split boundaries for browser-native execution?
- How should worker leases and failover behave for long generations?
- When should a session migrate from browser peers to native bridge peers?
- What governance models best fit voluntary compute swarms?

## Acknowledgements and inspiration

This project is inspired by adjacent work exploring browser-native AI, distributed coordination, and peer-assisted delivery.

In particular:

- **WebLLM** (MLC-AI) demonstrated that browser inference can retain ~80% of native GPU performance.
- **LARQL** (Chris Hay) proved that attention/FFN decoupling and MoE expert sharding work in production, with CPU-only FFN serving.
- **LLMlet** showed that P2P distributed LLM inference across browser tabs via WebRTC is achievable.
- **BrowserAI** made browser AI accessible at the npm install level.
- **Psyche by Nous Research** framed the coordination side of internet-scale, distributed participation and completed the largest distributed pre-training run ever.
- **WebTorrent and the browser P2P ecosystem** validated the transport layer assumptions behind browser-friendly swarm delivery.
- **nullroom.io** demonstrated production-grade browser P2P with post-quantum E2EE.
- **BIM** proposed a browser-native tokenized inference mesh with tolerance-aware consensus.
- **FlareLLM** showed a single Rust/WASM codebase can do browser inference with P2P primitives.

This repository is an independent template and is **not affiliated with, endorsed by, or a fork of** those projects.

## Who this is for

This repo is for:

- hackers
- protocol designers
- browser ML experimenters
- distributed systems people
- anyone who wants to explore open, browser-native AI infrastructure

## Contributing

Fork it.
Break it.
Replace parts of it.
Use only the layers you need.

The goal is not uniformity.
The goal is to make the pattern easy to understand and easy to reuse.

## Status

Architecture and specification phase. Core assumptions validated against current browser capabilities. See [VALIDATION.md](VALIDATION.md) for detailed technical assessment. Expect breaking changes as implementation begins.

## License

MIT
