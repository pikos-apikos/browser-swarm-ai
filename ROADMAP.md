# Roadmap

Browser Swarm AI advances through one production-oriented product spine and a separate research track.

The product spine must remain useful without split inference. Research work is promoted only after measured evidence shows that it improves a concrete workload.

See [WHITEPAPER.md](WHITEPAPER.md), [VALIDATION.md](VALIDATION.md), and [IMPLEMENTATION.md](IMPLEMENTATION.md).

## Principles

1. **Local inference first.** Peer-assisted delivery and persistent local execution are the baseline.
2. **Whole-task remote execution before split inference.** It provides a simpler product and the comparison baseline.
3. **Integrity is transport-independent.** HTTP, cache, and peers cross the same verification boundary.
4. **Capabilities are earned by implementation.** Advertise only functions the runtime can perform.
5. **Production hardening is continuous.** Security and reliability are not a final phase.
6. **Research has exit criteria.** Interesting experiments do not automatically enter the protocol.

---

# Product Spine

## v0.1 — Verified Vertical Slice

**Goal:** prove the complete path from origin or peer to local LiteRT.js execution.

- [x] TypeScript/Vite browser demo
- [x] HTTP artifact gateway
- [x] content-addressed manifest
- [x] SHA-256 verification per chunk and final artifact
- [x] WebSocket signaling and WebRTC chunk delivery
- [x] bounded HTTP fallback
- [x] LiteRT.js runtime backend
- [x] deterministic micro-model recipe: `y = 2x + 1`
- [x] runtime profile with input `3` and expected output `7`
- [x] MobileNet V3 Small downloader with pinned SHA-256
- [ ] execute the deterministic model in two browser contexts
- [ ] execute MobileNet through the complete path

### Exit Criteria

- [ ] input `3` produces output `7` in LiteRT.js
- [ ] Browser B receives chunks from Browser A
- [ ] corrupted chunks are rejected before storage or execution
- [ ] final hashes match across HTTP and WebRTC paths
- [ ] MobileNet runs with WebGPU and WASM fallback

---

## v0.2 — Real Artifact Delivery

**Goal:** make distribution persistent, resumable, efficient, and observable.

- [ ] binary WebRTC frames instead of base64 JSON
- [ ] `bufferedAmount` backpressure and adaptive SCTP pacing
- [ ] bounded parallel requests and multiple peer sources
- [ ] retry and reassignment per chunk
- [ ] OPFS persistent chunk store
- [ ] resume after refresh or disconnect
- [ ] storage quota detection and chunk eviction
- [ ] transfer progress and source metrics

### Exit Criteria

- [ ] refresh resumes without re-downloading verified chunks
- [ ] interrupted transfers complete without restarting
- [ ] peer loss causes bounded reassignment
- [ ] an artifact of at least 250 MB completes successfully
- [ ] benchmarks compare origin-only and peer-assisted delivery

---

## v0.3 — Real Browser Application

**Goal:** deliver a demo whose value is visible without understanding the protocol.

- [ ] image upload and MobileNet preprocessing
- [ ] ImageNet labels and top-k classification
- [ ] execution-mode indicator: cache, peer, or origin
- [ ] peer, source, throughput, and inference metrics
- [ ] Web Worker for hashing, reconstruction, and inference
- [ ] locally hosted LiteRT.js WASM artifacts
- [ ] accessible loading and failure states
- [ ] deterministic browser integration tests

### Exit Criteria

- [ ] a user classifies an image after peer-assisted delivery
- [ ] the UI proves which chunks came from each source
- [ ] heavy work does not block the main thread
- [ ] the demo works without a third-party runtime CDN

---

## v0.4 — Internet-Capable Swarm

**Goal:** operate between browsers on different real-world networks.

- [ ] deployable HTTPS/WSS tracker and signaling service
- [ ] configurable STUN and TURN
- [ ] ICE timeout and failure handling
- [ ] peer reconnect and room rejoin
- [ ] expiring artifact rooms
- [ ] signaling rate limits and basic abuse controls
- [ ] Chrome, Firefox, Safari, and Edge test matrix

### Exit Criteria

- [ ] browsers on different networks exchange verified chunks
- [ ] TURN succeeds for NAT-trapped peers
- [ ] signaling never receives model bytes, activations, or prompts
- [ ] P2P failure degrades cleanly to origin delivery

---

## v0.5 — Capability and Privacy

**Goal:** select peers with useful but privacy-preserving information.

- [ ] detect WebGPU, WebNN, and WASM
- [ ] bucket memory, storage, and network capacity into coarse tiers
- [ ] advertise cached artifacts and seeding capacity
- [ ] capability-aware peer selection
- [ ] explicit opt-in and revocation for serving
- [ ] delayed and scoped capability disclosure
- [ ] fingerprinting and metadata-leakage review
- [ ] versioned capability schema

### Exit Criteria

- [ ] routing never requires raw hardware identifiers
- [ ] peers advertise only implemented capabilities
- [ ] users can inspect and revoke participation
- [ ] matching improves successful transfers in benchmarks

---

## v0.6 — Full-Worker Inference

**Goal:** allow weak clients to use whole-model workers before split execution.

- [ ] model and worker directory
- [ ] whole-request remote inference
- [ ] streaming output
- [ ] worker leases and heartbeats
- [ ] cancellation, concurrency, and queue limits
- [ ] local-first and remote-fallback policy
- [ ] prompt and execution privacy disclosure
- [ ] active-tab worker lifecycle handling

### Exit Criteria

- [ ] a weak client can select and use a worker
- [ ] worker loss fails over or terminates within a bounded interval
- [ ] cancellation stops remote work
- [ ] latency and reliability establish the split-inference baseline

---

## v0.7 — Protocol and Production Baseline

**Goal:** stabilize distribution and full-worker execution as a reusable public protocol.

- [ ] versioned manifest and compatibility tests
- [ ] protocol conformance fixtures
- [ ] signed publisher manifests
- [ ] complete threat model
- [ ] privacy-preserving operational telemetry
- [ ] reproducible performance benchmarks
- [ ] automated cross-browser CI
- [ ] reproducible public demo deployment
- [ ] CDN/origin cold-start fallback
- [ ] dependency and supply-chain policy

### Exit Criteria

- [ ] incompatible changes fail conformance tests
- [ ] publisher authenticity is independently verifiable
- [ ] public benchmarks are reproducible
- [ ] the system remains useful without split inference

---

# Research Track

Research may begin after v0.3 but does not block the product spine.

## R1 — Split-Inference Feasibility

**Question:** does one stable split boundary improve a real workload over local or full-worker inference?

- [ ] select one model family and one boundary
- [ ] implement a native remote block or expert first
- [ ] measure activation size, serialization, RTT, and compute
- [ ] compare with local and v0.6 full-worker execution
- [ ] document privacy leakage from activations
- [ ] define workload-specific success and abort thresholds

### Promotion Gate

Proceed only if split inference enables a useful model or latency/footprint tradeoff unavailable through local or full-worker execution. A functioning but consistently worse path remains a research artifact.

## R2 — Browser Split Inference

- [ ] activation packet and binary transport
- [ ] session graph schema
- [ ] block/expert capability advertisement
- [ ] leases, heartbeat, timeout, and bounded failover
- [ ] stable session pinning
- [ ] MoE expert-routing experiment
- [ ] end-to-end latency and bandwidth report

Dynamic token-by-token peer routing is out of scope. Stable coarse boundaries are required.

## R3 — Execution Verification

- [ ] deterministic runtime fixtures
- [ ] selective redundant execution
- [ ] output and activation sanity checks
- [ ] runtime evidence where platforms expose it
- [ ] reputation as a routing input, not proof
- [ ] adversarial and dropout test suite

Perfect trustlessness is not assumed. Verification cost must be proportional to the workload.

## R4 — Bounded Adaptation

- [ ] adapter artifact schema
- [ ] LoRA loading and hot-swapping
- [ ] bounded adaptation task format
- [ ] delta and checkpoint hashing
- [ ] mini-evaluation fixtures
- [ ] base-model, data-policy, adapter, and evaluator provenance
- [ ] publish and revoke adapter artifacts

Full pretraining remains a native-worker concern.

---

# Continuous Engineering Tracks

These apply to every release.

## Security and Privacy

- threat modeling and dependency review
- signaling and transport abuse controls
- execution-mode disclosure
- fingerprinting minimization
- prompt and activation privacy

## Reliability

- bounded timeouts and retries
- graceful origin fallback
- deterministic cleanup
- disconnect and background-tab behavior
- quota and resource limits

## Compatibility

- Chrome, Edge, Firefox, and Safari
- WebGPU, WebNN, and WASM
- desktop and mobile constraints
- native bridges where browsers cannot remain persistent

## Measurement

- origin versus peer throughput
- cache hit and resume rate
- time to first inference
- inference latency by accelerator
- signaling, ICE, and TURN success rates
- peer-dropout recovery

---

# Dependency Flow

```text
v0.1 Verified Slice
  -> v0.2 Persistent Delivery
    -> v0.3 Real Browser App
      -> v0.4 Internet Swarm
        -> v0.5 Capability & Privacy
          -> v0.6 Full-Worker Inference
            -> v0.7 Protocol Baseline

v0.3 Real Browser App
  -> R1 Split Feasibility
    -> R2 Browser Split Inference
      -> R3 Execution Verification
        -> R4 Bounded Adaptation
```

The research track may inform the product spine, but it cannot destabilize the working local-first distribution path without passing its promotion gates.
