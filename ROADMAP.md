# Roadmap

Based on [WHITEPAPER.md](WHITEPAPER.md) and validated against current browser capabilities. See [VALIDATION.md](VALIDATION.md) for technical assessment.

## Phase 0 — Specification & Validation
- [x] write the minimal spec
- [x] define manifest schema
- [x] define peer lifecycle
- [x] write architectural white paper
- [x] validate assumptions against current browser capabilities
- [ ] define session graph schema
- [ ] define worker lease schema
- [ ] pick one demo runtime target (recommended: WebLLM or Transformers.js)

## Phase 1 — Transport & Distribution (Mode B, D)
Target: swarm download + local inference

- [ ] implement minimal tracker/signaling service
- [ ] implement browser swarm client (WebRTC data channels)
- [ ] implement chunk verification (Web Crypto SHA-256)
- [ ] implement local chunk cache (IndexedDB / OPFS)
- [ ] implement manifest parser and validator
- [ ] implement SCTP-aware chunk scheduling (buffer backpressure, adaptive pacing)
- [ ] demo: browser peer downloads model chunks from swarm, loads locally, performs inference

**Validation notes:**
- WebRTC SCTP window size is fixed at 128 KiB — implement multi-channel and adaptive pacing from the start
- Browser storage quotas vary — implement quota checking before caching
- Recommended chunk size: 64 KiB per message

## Phase 2 — Capability & Roles (Mode A, D, E)
Target: peer role advertisement and remote inference directory

- [ ] implement peer capability detection (WebGPU limits, memory, storage)
- [ ] implement role assignment based on detected capabilities
- [ ] implement capability advertisement (bucketed to avoid fingerprinting)
- [ ] implement remote inference directory (Mode A)
- [ ] implement cooperative artifact hosting (Mode D)
- [ ] implement full worker contribution (Mode E)
- [ ] demo: weak client selects model from directory, full worker peer serves inference

**Validation notes:**
- ~78% of users have WebGPU-capable devices; 22% need WASM fallback
- Capability values should be bucketed to coarse tiers for privacy
- Browser background execution is severely limited — full workers need active tabs

## Phase 3 — Split Inference (Mode C)
Target: attention/FFN decoupling and expert/block hosting

- [ ] implement attention/FFN decoupling in runtime
- [ ] implement activation packet serialization for split inference
- [ ] implement session graph construction (coordinator)
- [ ] implement worker lease issuance, heartbeat, and timeout
- [ ] implement expert/block peer role (CPU-only FFN serving)
- [ ] implement failover on lease expiration
- [ ] demo: local attention + remote FFN on a 8B+ model
- [ ] demo: MoE expert sharding across multiple peers

**Validation notes:**
- LARQL proves attention/FFN decoupling works at production quality (83 tok/s local, 6.5 tok/s remote-FFN on 31B)
- FFN/expert serving can run CPU-only — no GPU required on remote peers
- Session pinning is critical — avoid token-by-token peer routing
- Expected latency: N × (RTT + compute_time) per layer group

## Phase 4 — Coordination & Verification
Target: full coordination layer with verification

- [ ] implement model catalog (coordinator)
- [ ] implement task offers with capability matching
- [ ] implement peer reputation and scoring
- [ ] implement rate limiting and quota policies
- [ ] implement verification hooks (artifact, runtime, adaptation)
- [ ] implement multi-model manifests with adapter support
- [ ] document threat model and privacy tradeoffs
- [ ] demo: shared batch inference with verification across heterogeneous peers

## Phase 5 — Adaptation (Future)
Target: bounded browser adaptation workflows

- [ ] implement LoRA adapter loading and hot-swapping
- [ ] implement bounded adaptation task framework
- [ ] implement adaptation verification (shape checks, checkpoint hashes, mini-evaluation)
- [ ] demo: browser peer performs personalization adapter update, publishes delta artifact

**Validation notes:**
- LoRA adapter training is within browser capability for small models
- Adaptation is bounded and verifiable, not full fine-tuning
- Nous Research Psyche proves distributed coordination at scale (native, not browser)

## Phase 6 — Production Hardening (Future)
Target: reliability, scale, and cross-browser compatibility

- [ ] cross-browser testing (Chrome, Firefox, Safari, Edge)
- [ ] TURN relay integration for NAT-trapped peers
- [ ] CDN fallback for cold-start model distribution
- [ ] persistent storage permission flows
- [ ] mobile browser constraints and mitigations
- [ ] native bridge peer protocol
- [ ] post-quantum transport encryption (ML-KEM-768)
- [ ] performance benchmarking framework

## Dependency Graph

```
Phase 0 (Spec)
  └─► Phase 1 (Transport + Distribution)
        └─► Phase 2 (Capability + Roles)
              ├─► Phase 3 (Split Inference)
              │     └─► Phase 4 (Coordination + Verification)
              │           └─► Phase 5 (Adaptation)
              │                 └─► Phase 6 (Production)
              └─► Phase 4 (Coordination without split inference)
```

Phase 2 can fork: split inference (Phase 3 → 4) and coordination-only (Phase 4 direct) can proceed in parallel.

## Key Risks

| Risk | Mitigation |
|------|------------|
| WebRTC SCTP throughput insufficient for split inference activations | Quantized activation packets, parallel data channels, native bridge fallback |
| Browser storage quotas insufficient for model artifacts | OPFS with persistence permission, CDN fallback, chunk-level eviction |
| Background tab suspension kills worker peers | Active-tab requirement for workers, native bridge peers for persistent serving |
| Safari/Firefox WebGPU limitations | WASM CPU fallback, feature detection with graceful degradation |
| Split inference latency makes interactive use impractical | Session pinning, local-attention-first design, coarse boundaries to minimize hops |
| Insufficient peers to form swarms | CDN bootstrap, coordinator-driven peer discovery, TURN relay as last resort |
