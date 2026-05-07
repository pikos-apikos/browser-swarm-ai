# Browser Swarm AI — Specification Draft

Version: 0.2-draft
Status: exploratory
Based on: [WHITEPAPER.md](WHITEPAPER.md) / [VALIDATION.md](VALIDATION.md)

## 1. Overview

Browser Swarm AI defines a modular architecture for distributing AI artifacts to browser peers, executing local inference when possible, splitting execution across peers when necessary, and optionally coordinating shared workloads between independent participants.

The spec is intentionally split into layers so implementations can adopt only the parts they need.

## 2. Terminology

### Peer
A browser or compatible node participating in transport, caching, execution, adaptation, or coordination.

### Swarm
A temporary or persistent set of peers exchanging chunks and/or executing workloads for one or more artifacts.

### Artifact
Any content-addressed asset required for execution. Examples: model weights, tokenizer files, metadata, prompt templates, adapters, checkpoints.

### Manifest
A signed or unsigned metadata document describing an artifact set, its chunks, hashes, shards, compatibility requirements, and loading rules.

### Chunking
Splitting artifacts for transport, caching, and verification. Solves delivery.

### Sharding
Splitting execution or ownership to reduce footprint. Solves memory.

### Session Graph
The selected execution topology for one request or conversation — a temporary capability graph binding specific peers to specific roles.

### Worker Lease
A temporary assignment granting a peer the right or obligation to serve part of a session, with timeout and reassignment.

### Coordinator
An optional service or protocol component that helps peers discover tasks, advertise capability, and exchange work claims or proofs.

### Verifier
A local or remote component that checks integrity, compatibility, and optionally result validity.

### Adaptation
Bounded model-improving work short of full pretraining (adapter updates, personalization, preference tuning, evaluation loops).

### Bridge Peer
A non-browser node that participates in the same swarm protocol.

## 3. Peer Roles

Not every peer is the same. A compliant peer SHOULD advertise which roles it can fulfill.

### 3.1 Client-Only Peer
Does not contribute compute or artifacts. Selects models, requests sessions, consumes results.
- Minimum requirements: browser, network connectivity.
- This is the default role for devices that cannot perform meaningful local execution.

### 3.2 Chunk Seeder
Stores and serves model artifacts or other static assets. May not be able to perform inference.
- Requirements: sufficient storage, network.
- Useful even without compute capability because artifact distribution is a major system cost.

### 3.3 Attention / Router Peer
Performs the hot-path routing logic for a model. In MoE or split execution systems, decides which experts or downstream blocks are needed for a given token or request.
- Requirements: WebGPU, moderate compute, low latency.
- Attention is typically ~5-15% of total model weight size.

### 3.4 Expert / Block Peer
Hosts a bounded part of the model. Examples: one or more transformer blocks, one expert group in a MoE model, one feed-forward segment, one adapter bank.
- Requirements: sufficient memory for the shard, CPU or GPU.
- FFN/expert serving can run CPU-only on consumer hardware.

### 3.5 Full Worker Peer
Can execute the complete model for a request, or enough of the model graph that it behaves as a complete worker from the perspective of the client.
- Requirements: strong GPU, full model memory.

### 3.6 Adaptation Worker
Can execute bounded training or model adaptation tasks such as local adapter updates, evaluation loops, or structured knowledge editing.
- Requirements: stable compute, GPU recommended, sufficient memory for adapter parameters.

### 3.7 Coordinator / Catalog Node
Publishes available models, tracks capability advertisements, assigns workers, issues leases, and helps clients recover from failure.
- Requirements: stable connection, coordination logic.
- May be implemented as a browser peer, service peer, or native bridge.

## 4. Execution Modes

The system supports multiple execution modes. A peer MUST indicate which mode it is operating in.

### 4.1 Mode A: Remote Inference Directory
A weak browser peer selects from a list of available models served by other peers. Local browser acts only as client and control plane.

### 4.2 Mode B: Local Inference with Peer-Assisted Delivery
Browser downloads model artifacts from the swarm and runs the model locally. Distribution is shared; execution is local.

### 4.3 Mode C: Split Inference
Local browser performs one part of execution while selected remote peers perform the rest. Examples: local attention + remote experts, local routing + remote feed-forward blocks, local preprocessing + remote full worker.

### 4.4 Mode D: Cooperative Artifact Hosting
A browser hosts chunks, shards, or adapters for others even when not actively using the model.

### 4.5 Mode E: Full Worker Contribution
A browser or native bridge volunteers to serve a whole model or a major execution shard for others.

## 5. Layer Boundaries

### 5.1 Transport Layer
Responsible for: peer discovery, signaling, chunk request and response, activation packet exchange, retransmission policy, disconnect handling.

Not responsible for: deciding what a valid model artifact is, executing inference, assigning economic value to tasks.

### 5.2 Content Layer
Responsible for: artifact identifiers, chunk maps, shard definitions, integrity hashes, compatibility metadata, cacheability rules.

Not responsible for: how peers physically connect, how prompts are executed.

### 5.3 Runtime Layer
Responsible for: environment detection, model loading, execution scheduling inside the peer, memory and quota policies, fallback behavior, split inference packet handling, adapter loading.

### 5.4 Coordination Layer
Responsible for: task publication, capability matching, work assignment, session graph construction, worker lease management, optional verification workflows, reputation inputs.

Not required for basic swarm download or local-only inference.

## 6. Protocol Objects

### 6.1 Manifest Object

A manifest SHOULD contain:

```json
{
  "manifest_version": "1",
  "artifact_id": "model:example-small-chat",
  "artifact_version": "0.1.0",
  "created_at": "2026-04-07T00:00:00Z",
  "runtime": {
    "engine": "browser",
    "format": "generic"
  },
  "requirements": {
    "webgpu": true,
    "max_memory_mb": 2048
  },
  "execution_mode": "local",
  "files": [
    {
      "path": "weights/part-0001.bin",
      "size": 1048576,
      "hash": "sha256:...",
      "chunks": [
        {
          "index": 0,
          "offset": 0,
          "length": 262144,
          "hash": "sha256:..."
        }
      ]
    }
  ],
  "shards": [
    {
      "shard_id": "attention",
      "description": "Attention blocks L0-L11",
      "files": ["weights/attention.bin"],
      "role": "attention",
      "required": true
    },
    {
      "shard_id": "ffn",
      "description": "Feed-forward blocks L0-L11",
      "files": ["weights/ffn.bin"],
      "role": "ffn",
      "required": false,
      "remote_servable": true
    }
  ]
}
```

Required fields:
- `manifest_version`
- `artifact_id`
- `artifact_version`
- `files`

Recommended fields:
- `requirements`
- `runtime`
- `shards` — semantic execution splits enabling role-based distribution
- `execution_mode` — supported modes: `local`, `split`, `remote`
- `signatures`
- `compatibility`

### 6.2 Peer Capability Object

A peer SHOULD advertise capability metadata. This object replaces the simpler v0.1 schema.

```json
{
  "peer_id": "peer-abc123",
  "roles": ["client", "attention", "chunk_seeder"],
  "runtime": {
    "browser": "generic",
    "webgpu": true,
    "webnn": false,
    "wasm": true,
    "wasm_threads": true,
    "shared_array_buffer": true
  },
  "resources": {
    "memory_mb_estimate": 4096,
    "gpu_memory_mb_estimate": 2048,
    "max_storage_buffer_bytes": 536870912,
    "concurrency": 2
  },
  "network": {
    "supported_transports": ["webrtc", "websocket"],
    "estimated_bandwidth_mbps": 50,
    "nat_type": "cone"
  },
  "policies": {
    "accept_download_requests": true,
    "accept_inference_tasks": false,
    "accept_adaptation_tasks": false,
    "max_concurrent_sessions": 1,
    "max_artifact_cache_mb": 10240,
    "availability_schedule": "on_demand"
  }
}
```

Required fields:
- `peer_id`
- `roles` — one or more from: `client`, `chunk_seeder`, `attention`, `expert`, `full_worker`, `adaptation_worker`, `coordinator`

Recommended fields:
- `runtime` — detected browser capabilities
- `resources` — hardware estimates
- `policies` — participation constraints

A peer SHOULD avoid exposing unnecessarily fingerprintable information. Capability values SHOULD be bucketed to coarse tiers.

### 6.3 Task Offer Object

A coordinator MAY publish task offers.

```json
{
  "task_id": "task-001",
  "task_type": "batch_inference",
  "artifact_id": "model:example-small-chat",
  "input_ref": "input:batch-42",
  "execution_mode": "remote",
  "constraints": {
    "roles": ["full_worker"],
    "webgpu": true,
    "min_memory_mb": 2048
  },
  "lease": {
    "duration_ms": 30000,
    "max_retries": 3
  },
  "verification": {
    "mode": "none"
  }
}
```

Required fields:
- `task_id`
- `task_type`
- `artifact_id`

Task types include: `batch_inference`, `streaming_inference`, `chunk_seed`, `adaptation`, `verification`.

### 6.4 Session Graph Object

A session graph describes the execution topology for a request involving multiple peers.

```json
{
  "session_id": "sess-abc123",
  "artifact_id": "model:example-moe-8b",
  "execution_mode": "split",
  "created_at": "2026-04-07T12:00:00Z",
  "expires_at": "2026-04-07T12:05:00Z",
  "nodes": [
    {
      "node_id": "client-1",
      "peer_id": "peer-client-abc",
      "role": "client",
      "shard_id": "attention",
      "layers": [0, 1, 2, 3]
    },
    {
      "node_id": "expert-a-1",
      "peer_id": "peer-expert-xyz",
      "role": "expert",
      "shard_id": "experts",
      "expert_range": [0, 31]
    },
    {
      "node_id": "expert-b-1",
      "peer_id": "peer-expert-def",
      "role": "expert",
      "shard_id": "experts",
      "expert_range": [32, 63]
    }
  ],
  "edges": [
    {
      "from": "client-1",
      "to": "expert-a-1",
      "type": "activation_forward",
      "protocol": "webrtc_datachannel"
    },
    {
      "from": "client-1",
      "to": "expert-b-1",
      "type": "activation_forward",
      "protocol": "webrtc_datachannel"
    }
  ],
  "pinned": true
}
```

Required fields:
- `session_id`
- `artifact_id`
- `execution_mode`
- `nodes` — at least one
- `expires_at`

A session SHOULD be pinned (`pinned: true`) for inference workloads.
A session MAY be unpinned for artifact distribution only.

### 6.5 Worker Lease Object

A worker lease grants a peer the right to serve part of a session for a bounded duration.

```json
{
  "lease_id": "lease-xyz",
  "session_id": "sess-abc123",
  "node_id": "expert-a-1",
  "peer_id": "peer-expert-xyz",
  "role": "expert",
  "granted_at": "2026-04-07T12:00:00Z",
  "expires_at": "2026-04-07T12:05:00Z",
  "heartbeat_interval_ms": 5000,
  "max_missed_heartbeats": 3,
  "status": "active"
}
```

Required fields:
- `lease_id`
- `session_id`
- `node_id`
- `peer_id`
- `expires_at`

Lease statuses: `active`, `expired`, `revoked`, `failed`.

A coordinator SHOULD reassign a lease if a peer misses `max_missed_heartbeats` consecutive heartbeats.

### 6.6 Adaptation Task Object

An adaptation task describes bounded model-improving work.

```json
{
  "task_id": "adapt-001",
  "task_type": "adapter_update",
  "artifact_id": "model:example-small-chat",
  "base_artifact_version": "0.1.0",
  "adaptation": {
    "type": "lora",
    "target_modules": ["q_proj", "v_proj"],
    "max_parameter_count": 4194304,
    "dataset_ref": "dataset:personalization-42",
    "max_steps": 100
  },
  "verification": {
    "mode": "checkpoint_hash",
    "evaluation_prompts": 10
  }
}
```

Adaptation types: `lora`, `preference_tuning`, `knowledge_edit`, `evaluation_loop`.

## 7. Peer Lifecycle

A compliant peer SHOULD support the following flow:

1. Initialize runtime and detect environment capabilities
2. Determine available roles based on detected capabilities
3. Discover signaling endpoint or bootstrap peers
4. Join swarm for one or more artifacts
5. Fetch and verify manifest
6. Request chunks and verify chunk hashes
7. Assemble or map artifact files
8. Load runtime assets
9. Optionally advertise capabilities and roles to coordinator
10. Optionally accept task offers or worker leases

For split inference (Mode C), additional steps:
11. Receive session graph from coordinator
12. Establish data channels to assigned peers
13. Begin serving assigned shard (attention, expert, block)
14. Send heartbeats per lease agreement
15. Handle failover if coordinator signals reassignment

## 8. Integrity Rules

- Every chunk MUST be hash-verifiable.
- A file MUST NOT be considered usable until all required chunks are verified.
- A semantic shard MUST NOT be executed until its constituent files pass verification.
- A manifest with missing required fields MUST be rejected.
- A peer SHOULD discard corrupted chunks and MAY penalize the sender locally.
- A worker lease holder MUST produce outputs that can be verified or the session SHOULD be reassigned.
- For adaptation tasks, output artifacts MUST pass shape checks and checkpoint hash checks.

## 9. Cache Behavior

Peers MAY cache artifacts locally.

A cache policy SHOULD support:
- artifact pinning (prevent eviction)
- eviction priority (least-recently-used, size-based)
- partial download resumption
- version-aware invalidation
- shard-level caching (cache only the shards needed for your role)

A peer SHOULD treat cache contents as untrusted until revalidated.

Cache backends: IndexedDB, Origin Private File System (OPFS), Cache API.

Storage quotas vary dramatically by browser:
| Browser | Typical Quota |
|---------|--------------|
| Chrome/Edge | Up to 60% of total disk |
| Firefox | ~2 GB per origin (extendable via `navigator.storage.persist()`) |
| Safari | ~1 GB initially, prompts for more |
| Chrome with "Clear on close" | ~300 MB |

Implementations SHOULD check available quota before caching and degrade gracefully.

## 10. Runtime Behavior

A runtime implementation SHOULD:
- detect environment support before attempting model load
- reject artifacts that exceed local policy limits
- expose execution errors cleanly
- allow fallback when a target runtime is unavailable
- support role-based partial model loading (load only attention, only FFN, etc.)

A runtime implementation MAY:
- support streaming output
- support partial warm caches
- support multiple execution backends (WebGPU, WebNN, WASM)
- support activation packet serialization for split inference
- support adapter hot-swapping

## 11. Coordination Behavior

The coordination layer is optional.

If present, it SHOULD support:
- model catalog publication and discovery
- peer capability and role advertisement
- session graph construction
- task publication and claiming
- worker lease issuance and renewal
- heartbeat monitoring and lease expiration
- failover and reassignment on timeout
- peer-level rate limiting

The coordination layer MUST NOT be required for:
- basic artifact swarm download (Mode B, D)
- local-only inference (Mode B)

## 12. Split Inference Protocol

Split inference (Mode C) requires additional protocol considerations.

### 12.1 Split Boundaries

Split boundaries SHOULD be at coarse, stable architectural points:
- Embeddings (input layer)
- Attention blocks (one or more contiguous transformer attention layers)
- Router logic (MoE gating)
- Feed-forward blocks (one or more contiguous FFN layers)
- Expert groups (one or more expert banks in MoE)
- Adapters
- Output heads / LM head

### 12.2 Session Pinning

Inference sessions SHOULD be pinned to a specific set of peers for their duration.
- Artifact distribution can be swarm-like and opportunistic.
- Inference execution should be graph-aware and session-stable.

Changing the session graph mid-inference (e.g., token-by-token routing) is NOT RECOMMENDED.

### 12.3 Communication Pattern

For dense model split inference:
- Client runs attention layers, sends hidden states to FFN peers.
- FFN peers run feed-forward projections, return results.
- Client continues with next attention layer.

For MoE split inference:
- Client runs attention and router.
- Router selects experts per token.
- Client dispatches expert calls to appropriate expert peers.
- Expert peers return results; client aggregates.

### 12.4 Latency Budget

Implementations SHOULD account for:
- Per-hop network RTT between peers
- FFN/expert compute time on remote peers
- Serialization/deserialization of activation packets

A session graph with N remote peers adds approximately N × (RTT + compute_time) per layer group.

## 13. Training and Adaptation

### 13.1 Distinction

Browser Swarm AI distinguishes among:
- **Full pretraining** — out of scope for browser peers
- **Fine-tuning** — possible on stable, capable workers (native bridges, strong browser peers); specialized role
- **Bounded adaptation** — realistic target for browser participation (LoRA, preference tuning, evaluation loops)
- **Structured model editing** — knowledge editing without gradient-based training

### 13.2 Adaptation Scope

Adaptation tasks SHOULD:
- Operate on a subset of model parameters (adapters, not full weights)
- Have bounded compute requirements
- Produce verifiable output artifacts
- Not block other swarm operations

Adaptation tasks MUST NOT:
- Modify the base artifact without producing a separately versioned delta
- Require access to training data that compromises privacy

## 14. Security Considerations

Implementations should assume hostile peers are possible.

Risks include:
- corrupted chunks
- malicious manifests
- denial of service
- capability spoofing
- result fabrication
- privacy leakage through peer metadata
- split inference activation interception

Mitigations may include:
- chunk hashing
- manifest signatures
- bounded retries
- rate limits
- peer scoring
- minimal capability disclosure
- session pinning to known peers
- activation encryption between session graph nodes

## 15. Privacy Considerations

Implementations SHOULD minimize:
- persistent peer identifiers
- detailed hardware disclosure (bucket to coarse tiers)
- unnecessary telemetry
- prompt leakage to third parties
- activation leakage during split inference

Users SHOULD be informed when:
- prompts leave the local peer
- outputs are sent for verification
- coordinator services are involved
- execution is split across remote peers
- they are serving compute or artifacts to others

## 16. Compliance Levels

### Level A — Swarm Distribution
A peer can join a swarm, fetch manifests, download chunks, and verify integrity.

### Level B — Local Runtime
A peer satisfies Level A and can load artifacts for local inference (Mode B).

### Level C — Split Inference Participant
A peer satisfies Level B and can participate as a node in a session graph (Mode C), either as attention/router, expert/block, or full worker.

### Level D — Adaptation Worker
A peer satisfies Level B and can execute bounded adaptation tasks, producing verifiable output artifacts.

### Level E — Coordinator
A peer or service satisfies Level A and can publish catalogs, construct session graphs, issue leases, and manage failover.

## 17. Out of Scope

The following are explicitly out of scope for this draft:
- economic protocol design
- cryptocurrency settlement
- universal trustless result validation
- browser escape or privileged execution
- full-scale pretraining on browser peers
- token-by-token peer routing for inference

## 18. Reference Implementation Targets

A reference implementation for this draft should aim to provide:

- one browser client with role selection
- one minimal tracker service
- one manifest parser and chunk verifier
- one demo local inference app (Mode B)
- one demo split inference app (Mode C) with attention/FFN decoupling
- one optional coordinator stub with lease management
- one demo cooperative artifact hosting (Mode D)

## 19. Future Extensions

Potential future extensions:
- signed manifests
- adapter composition and hot-swapping
- federated prompt routing
- cooperative batch scheduling
- verifiable inference protocols
- native node bridge peers
- post-quantum transport encryption
- tiered context with boundary residuals
- mesh-optimized activation compression
