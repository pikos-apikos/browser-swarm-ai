# Browser Swarm AI

Browser-native AI through peer-assisted distribution, local inference, and optional shared coordination.

## What this is

Browser Swarm AI is an open template for building systems where:

- models or model shards can be distributed through a browser-friendly swarm
- inference runs locally in the browser when possible
- coordination is optional and modular
- no single cloud backend is required for the whole stack

This repo is **not** a finished product.
It is a **reference architecture + starter implementation** for people who want to explore:

- WebRTC-based peer transport
- content-addressed model delivery
- browser runtime execution
- optional task coordination and verification

Think of it as:

**BitTorrent-style ideas for AI assets and browser compute.**

## Why

Today, three things have become practical at the same time:

1. Browsers can participate in peer-to-peer networks.
2. Browsers can execute increasingly capable local AI workloads.
3. Coordination layers can distribute work across many independent nodes.

Taken together, this suggests a new application pattern:

- distribute model artifacts through a swarm
- cache them close to users
- run inference locally when hardware allows
- optionally coordinate shared workloads across many peers

## Design goals

- **Browser first**: a peer should be able to join with just a browser.
- **Modular**: transport, runtime, manifests, and coordination are separate layers.
- **Local by default**: inference should prefer local execution.
- **Content addressed**: model artifacts should be chunked, hashed, and verifiable.
- **Graceful fallback**: if swarm participation is unavailable, the app should still function in degraded mode.
- **Open template**: easy to fork, replace, or simplify.

## Non-goals for v0

This repo does **not** try to solve all of the following in its first versions:

- decentralized training at full scale
- tokenomics or blockchain incentives
- trustless execution of arbitrary remote code
- privacy guarantees beyond the limits of browser execution
- replacement of existing ML infrastructure

## Architecture

### Layer 1 — Transport
Responsible for peer discovery and chunk exchange.

Examples:
- WebRTC data channels
- WebSocket tracker/signaling
- STUN/TURN for traversal

### Layer 2 — Content Addressing
Responsible for what is being moved.

Examples:
- model manifests
- chunk hashes
- shard metadata
- version compatibility
- cache policies

### Layer 3 — Runtime
Responsible for local execution.

Examples:
- model loading
- capability detection
- prompt execution
- memory limits
- fallback policy

### Layer 4 — Coordination
Responsible for optional multi-peer orchestration.

Examples:
- task offers
- work assignment
- verification
- peer reputation
- quota and fairness policies

## Proposed repo layout

```text
browser-swarm-ai/
  README.md
  LICENSE
  SPEC.md
  ROADMAP.md

  apps/
    demo-chat/
    demo-swarm-download/
    demo-batch-inference/

  packages/
    protocol/
    transport-webrtc/
    tracker-client/
    manifest/
    runtime-browser/
    coordinator/
    verifier/

  services/
    tracker/
    coordinator-api/

  docs/
    architecture/
    threat-model/
    use-cases/
```

## Minimal viable prototype

The first useful milestone is simple:

### v0.1
- browser peer joins a swarm
- peer downloads model chunks from other peers
- manifest verifies chunk integrity
- browser runtime loads a small model
- app performs local inference

### v0.2
- resumable chunk cache
- peer capability advertisement
- better chunk scheduling
- optional coordinator for work offers

### v0.3
- verification hooks
- multi-model manifests
- simple shared batch inference workflow

## Example use cases

- offline-friendly browser chat app
- community-hosted model distribution
- edge-local assistants
- classroom or hackathon swarms
- temporary peer groups for shared inference experiments

## Threat model

This architecture must assume:

- peers may lie
- peers may disappear
- peers may throttle or send garbage
- browsers have strict sandbox limits
- local hardware capabilities vary a lot

Because of this, every layer should be designed around:

- verification
- timeouts
- retries
- capability detection
- graceful degradation

## Open questions

- How should peers advertise hardware capability safely?
- What is the best chunking strategy for models and tokenizer assets?
- How should outputs be verified in shared compute flows?
- Which tasks belong in browser peers and which require native or server nodes?
- What privacy guarantees can realistically be offered?

## Acknowledgements and inspiration

This project is inspired by adjacent work exploring browser-native AI, distributed coordination, and peer-assisted delivery.

In particular:

- **BrowserAI** helped make the direction legible by showing what local AI execution in the browser can look like.
- **Psyche by Nous Research** helped frame the coordination side of internet-scale, distributed participation.
- **WebTorrent and the browser P2P ecosystem** helped validate the transport layer assumptions behind browser-friendly swarm delivery.

This repository is an independent template and is **not affiliated with, endorsed by, or a fork of** those projects.
It is a small attempt to make the shared architectural pattern easier to study, discuss, and reuse.

Where possible, readers should explore the original work directly and give credit upstream.

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

Early-stage template.
Expect breaking changes.

## License

MIT
