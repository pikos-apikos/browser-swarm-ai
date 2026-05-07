# Browser Swarm AI

## Protocol Overview

**Status:** Draft 0.1
**Language:** English
**Format:** Markdown

---

## Purpose

This document describes the operational protocol model for Browser Swarm AI.

It sits between the white paper and the formal specification.

Its purpose is to answer practical questions such as:

* how peers join the network
* how models are discovered
* how capabilities are advertised
* how sessions are established
* how artifact chunks are exchanged
* how split inference is routed
* how workers are leased
* how failures are handled

This is not yet a normative specification.
It is a protocol-level map of the moving parts.

---

## 1. Protocol Scope

Browser Swarm AI is a capability-based swarm protocol for AI artifact distribution and model execution.

The protocol supports five broad functions:

1. **discovery**
2. **artifact distribution**
3. **capability advertisement**
4. **session-based inference routing**
5. **bounded adaptation coordination**

The protocol is designed to allow participation by peers with very different strengths.

A peer may contribute any combination of:

* client access
* artifact storage
* chunk seeding
* attention or routing compute
* expert or block hosting
* full-model serving
* bounded adaptation work
* coordination and catalog services

---

## 2. Architectural Layers

The protocol is easiest to understand as a stack.

### 2.1 Discovery Layer

Responsible for:

* bootstrapping into the swarm
* finding coordinators, trackers, or bootstrap peers
* locating available model catalogs

### 2.2 Artifact Layer

Responsible for:

* manifests
* chunk maps
* shard metadata
* artifact integrity
* cache policy

### 2.3 Capability Layer

Responsible for:

* peer role advertisement
* local resource hints
* execution eligibility
* policy limits

### 2.4 Session Layer

Responsible for:

* model selection
* session graph construction
* peer assignment
* worker leasing
* runtime routing

### 2.5 Adaptation Layer

Responsible for:

* bounded training job offers
* adaptation claims
* delta publication
* evaluation workflows

Each layer should be independently understandable and replaceable where possible.

---

## 3. Main Actors

### 3.1 Client Peer

A client peer initiates model discovery, requests sessions, sends prompts or tasks, and consumes outputs.

A client peer may have no useful compute capability at all.

### 3.2 Seeder Peer

A seeder peer stores and serves chunks, shard files, adapters, tokenizer assets, or checkpoints.

This role improves artifact availability and reduces dependence on a single origin.

### 3.3 Execution Peer

An execution peer performs part or all of model execution.

Execution roles may include:

* attention host
* router host
* expert host
* block host
* full worker

### 3.4 Adaptation Peer

An adaptation peer accepts bounded model-improvement work such as adapter updates, evaluations, or structured edits.

### 3.5 Coordinator

A coordinator tracks available models, receives capability advertisements, assembles execution graphs, issues worker leases, and helps recover from failure.

A coordinator does not need to run the model itself.

### 3.6 Bridge Peer

A bridge peer is a non-browser node that speaks the same swarm protocol or a compatible subset of it.

This allows the protocol to include native workers without changing the browser-first design.

---

## 4. Participation Model

Participation is role-based and composable.

A single peer may behave as any of the following:

* `client-only`
* `chunk-seeder`
* `attention-host`
* `router-host`
* `expert-host`
* `block-host`
* `full-worker`
* `adaptation-worker`
* `coordinator`
* `bridge-peer`

A peer may advertise multiple roles at once.

Examples:

* an old laptop may be `client-only`
* a storage-rich machine may be `chunk-seeder`
* a GPU-capable desktop may be `attention-host` and `expert-host`
* a native worker may be `full-worker` and `adaptation-worker`

The protocol should never assume role uniformity.

---

## 5. Bootstrap and Discovery

Before anything else can happen, a peer must learn where to begin.

### 5.1 Bootstrap Sources

A peer may bootstrap from one or more of the following:

* a known coordinator URL
* a known tracker URL
* a model catalog URL
* a signed bootstrap document
* a saved peer list from a previous session

### 5.2 Discovery Goals

The immediate goals of discovery are:

* find a catalog of available models
* find at least one coordinator or routing authority
* find artifact seeders or peers for requested models
* optionally announce presence

### 5.3 Discovery Output

At the end of bootstrap, the peer should know:

* which models are currently discoverable
* which coordinators can issue sessions
* which transport endpoints are available
* which artifact sources exist for initial model assets

---

## 6. Model Catalog and Offers

The protocol assumes a model catalog layer.

A catalog entry does not mean a model is always online everywhere.
It means the swarm can currently describe and possibly serve it.

Each model entry should communicate:

* model identifier
* version
* artifact manifest reference
* supported execution modes
* minimum requirements
* currently known worker availability
* whether the model supports full local, split, or remote-only execution

This makes it possible for a weak peer to choose a remote model while a stronger peer may choose local or split execution.

---

## 7. Capability Advertisement

Capability advertisement is the foundation of routing.

A peer should be able to publish what it can contribute without pretending to be more capable than it is.

### 7.1 What a Peer May Advertise

A peer may advertise:

* supported roles
* available artifact storage
* presence of WebGPU or compatible runtime
* memory estimates
* concurrency limits
* preferred execution modes
* willingness to serve others
* willingness to perform adaptation work
* privacy policy hints
* uptime intent or lease duration preference

### 7.2 Advertisement Principles

Capability advertisements should be:

* bounded
* privacy-aware
* refreshable
* revocable
* explicit about limits

The protocol should avoid excessive hardware fingerprinting.

### 7.3 Registration Modes

A peer may advertise capability in two ways:

* **ephemeral registration**, valid for a short period
* **lease-backed registration**, where the coordinator expects short-term availability guarantees

---

## 8. Artifact Distribution Flow

Artifact distribution is swarm-like.

This is where torrent-style thinking is useful.

### 8.1 Artifact Types

The protocol may distribute:

* model shards
* tokenizer files
* quantized weights
* adapters
* checkpoints
* evaluation bundles
* metadata files

### 8.2 Artifact Flow

The basic artifact flow is:

1. client resolves a manifest
2. client learns chunk map and shard map
3. client or worker requests chunks from one or more seeders
4. chunks are verified on arrival
5. verified chunks are cached locally
6. peer may optionally become a seeder for those chunks

### 8.3 Chunking and Sharding

Chunking and sharding must not be confused.

* **chunking** is for transport and cache efficiency
* **sharding** is for footprint reduction and execution placement

A full local worker may need all shards.
A split worker may need only a subset.
A seeder may hold chunks it cannot execute.

### 8.4 Artifact Availability Policy

A coordinator or catalog may expose rough availability signals such as:

* replication count
* online seeders
* warm peers
* preferred chunk sources

These signals help clients avoid dead paths.

---

## 9. Session Establishment

A session is the protocol unit for inference or interactive execution.

A session is not only a connection.
It is a temporary execution contract between a client and one or more peers.

### 9.1 Session Inputs

To establish a session, a client supplies:

* requested model
* desired execution mode
* privacy preference
* latency preference
* willingness to contribute local compute
* optional cost or quota constraints

### 9.2 Session Construction

The coordinator evaluates:

* model availability
* artifact placement
* peer capabilities
* session policy
* current load
* preferred execution path

The coordinator then returns a proposed session graph.

### 9.3 Session Graph

A session graph describes:

* selected peers
* assigned roles
* transport edges
* artifact dependencies
* activation routes
* lease durations
* fallback order

A session graph should remain stable for the life of a short session whenever possible.

This is session pinning.

---

## 10. Execution Modes in Protocol Terms

### 10.1 Remote Directory Mode

In remote directory mode:

* client selects a model
* coordinator finds a full worker or split graph
* client sends prompt or request
* worker graph returns outputs

The client contributes no execution.

### 10.2 Local Mode

In local mode:

* client obtains artifacts from seeders
* local runtime loads the model
* inference happens entirely on the local peer

The coordinator may still help discovery, but it is not required for every token.

### 10.3 Split Mode

In split mode:

* local peer performs some part of execution
* selected remote peers perform the rest
* activations or intermediate packets move along the session graph
* outputs stream back to the client

Split mode must prefer coarse boundaries such as:

* block groups
* experts
* feed-forward segments
* routing components

### 10.4 Contribution Mode

In contribution mode:

* a peer serves artifacts
* or serves execution shards
* or both

The same peer may also be a client in another session.

---

## 11. Worker Leases

Distributed execution requires temporary commitments.

A worker lease is the protocol object that says:

* this peer is assigned this role
* for this session
* for this time window
* under these limits

### 11.1 Why Leases Matter

Leases help define:

* expected availability
* timeout policy
* reassignment rules
* accountability boundaries

Without leases, every session becomes guesswork.

### 11.2 Lease Lifecycle

The lease lifecycle is:

1. offer
2. accept
3. active service
4. renewal or expiry
5. release or revocation

### 11.3 Lease Boundaries

A lease may limit:

* number of concurrent sessions
* maximum tokens
* wall-clock duration
* memory use
* artifact retention obligation

---

## 12. Split Inference Routing

Split inference is the most sensitive protocol path.

Artifact exchange is tolerant of delay and retry.
Inference is not.

### 12.1 Routing Model

Split inference should be:

* session-pinned
* graph-aware
* latency-sensitive
* coarse-grained

It should not be based on random peer selection for each token.

### 12.2 Recommended Split Boundaries

The protocol should prefer these boundaries:

* local attention plus remote experts
* local routing plus remote feed-forward
* contiguous block groups assigned to remote peers
* local preprocessing plus remote full worker

### 12.3 Activation Packets

Split inference requires intermediate packets.

These may include:

* hidden states
* routing decisions
* token positions
* sequence metadata
* attention cache references

Activation packets must remain compact, versioned, and bound to one session graph.

### 12.4 Sticky Execution

Once a session graph is active, the protocol should avoid moving execution unless necessary.

This reduces:

* latency variance
* coordination chatter
* state migration complexity

---

## 13. Streaming and Output Flow

The protocol assumes that many model interactions are interactive.

Outputs should therefore be streamable.

### 13.1 Output Sources

Outputs may come from:

* one full worker
* the terminal node in a split graph
* a local peer after receiving remote intermediate results

### 13.2 Stream Semantics

Streams may include:

* token output
* partial text
* status events
* progress markers
* warnings
* recovery notices

### 13.3 Client Experience

The client should always know whether the session is:

* fully local
* remote-served
* split across peers
* degraded or recovering

Execution mode visibility is a protocol concern, not only a UI concern.

---

## 14. Failure and Recovery

Browser-native swarms are inherently unstable compared with fixed server clusters.

Failure handling is therefore core protocol logic.

### 14.1 Expected Failures

The protocol should assume:

* peer disconnects
* background tab suspension
* lease expiration
* artifact source disappearance
* partial chunk corruption
* overloaded workers
* split graph breaks

### 14.2 Artifact Recovery

Artifact recovery is simple:

* re-request from another seeder
* revalidate chunks
* resume from verified position

### 14.3 Session Recovery

Session recovery is harder.

The protocol may attempt:

* lease renewal
* warm standby promotion
* block reassignment
* full session restart
* degrade to remote full worker mode

### 14.4 Recovery Principle

Artifact transfer should be optimistic.
Session execution should be conservative.

---

## 15. Adaptation and Training Jobs

The protocol supports bounded adaptation as a separate class of work.

### 15.1 Adaptation Job Types

Examples include:

* adapter updates
* local personalization tasks
* mini-evaluation runs
* structured model edits
* checkpoint scoring

### 15.2 Adaptation Flow

The basic flow is:

1. coordinator publishes adaptation offer
2. eligible peer claims the job
3. peer fetches required artifacts and data references
4. peer executes bounded work
5. peer returns delta artifact and metrics
6. verifier or coordinator checks results
7. accepted outputs become swarm artifacts

### 15.3 Why This Is Separate

Inference sessions and adaptation jobs have different constraints.

Inference is latency-sensitive.
Adaptation is deadline-sensitive.

The protocol should keep them distinct.

---

## 16. Verification Model

The protocol assumes bounded trust, not perfect trustlessness.

### 16.1 Artifact Verification

Artifact verification should include:

* manifest validation
* chunk hash checks
* shard completeness checks
* version compatibility checks

### 16.2 Session Verification

Session verification should include:

* lease ownership checks
* heartbeat monitoring
* session graph consistency checks
* timeout enforcement

### 16.3 Adaptation Verification

Adaptation verification may include:

* shape validation
* metric sanity checks
* replay on a mini-eval set
* checkpoint consistency checks

The protocol should be strict where verification is cheap and explicit about where it is not.

---

## 17. Privacy and Disclosure Model

A peer must understand what it is sharing.

The protocol should distinguish among:

* local-only execution
* remote prompt routing
* split activation sharing
* artifact seeding only
* adaptation participation

A client should be able to see:

* who is executing the session
* whether prompts leave the device
* whether intermediate activations are shared
* whether local resources are being contributed

The protocol should make execution mode visible by design.

---

## 18. End-to-End Flow Examples

### 18.1 Weak Client Using Remote Workers

1. client bootstraps to coordinator
2. client fetches model catalog
3. client selects remote-capable model
4. coordinator assigns full worker
5. client opens session
6. prompts stream to worker
7. tokens stream back to client

### 18.2 Local Attention with Remote Experts

1. client bootstraps and advertises attention capability
2. client selects split-capable model
3. coordinator finds expert peers
4. session graph pins local attention and remote experts
5. local peer routes activations to selected experts
6. expert outputs return to the local peer
7. local peer renders output to user

### 18.3 Artifact Seeder Joining the Swarm

1. peer bootstraps to coordinator or tracker
2. peer requests artifact manifest
3. peer downloads selected chunks
4. peer verifies and caches them
5. peer advertises seeding capability
6. peer serves chunks to later requesters

### 18.4 Adaptation Worker Completing a Job

1. coordinator publishes bounded adaptation job
2. worker claims the job
3. worker downloads required base artifact and adapter target
4. worker executes bounded update
5. worker publishes delta and metrics
6. verifier accepts or rejects the result

---

## 19. Protocol Design Rules

The following rules summarize the intended behavior.

### Rule 1

Use swarm logic for artifact placement, not for chaotic token routing.

### Rule 2

Route by capability, not by ideological symmetry.

### Rule 3

Treat every session as a temporary execution graph.

### Rule 4

Prefer coarse execution boundaries over layer-by-layer fragmentation.

### Rule 5

Require explicit leases for distributed workers.

### Rule 6

Separate inference flows from adaptation flows.

### Rule 7

Expose execution mode and privacy consequences to the user.

### Rule 8

Assume peers are ephemeral, partial, and heterogeneous.

---

## 20. From Protocol Overview to Formal Specification

The next document should convert these ideas into explicit objects and message schemas.

At minimum, the specification should define:

* `ModelOffer`
* `ArtifactManifest`
* `ChunkMap`
* `PeerCapability`
* `SessionRequest`
* `SessionGraph`
* `ShardAssignment`
* `WorkerLease`
* `ActivationPacket`
* `OutputStreamEvent`
* `AdaptationOffer`
* `AdaptationResult`

The formal specification should also define:

* required fields
* optional fields
* validation rules
* state transitions
* failure semantics
* compatibility guarantees

---

## 21. Summary

Browser Swarm AI is not a protocol for identical peers doing identical work.

It is a protocol for assembling useful AI behavior from mixed peers with partial capabilities.

Some peers browse.
Some seed.
Some route.
Some host experts.
Some serve whole models.
Some adapt.
Some coordinate.

The protocol succeeds when these peers can discover one another, describe their capabilities honestly, exchange artifacts efficiently, form stable session graphs, and recover from failure without pretending that the web is a datacenter.

That is the core idea.
