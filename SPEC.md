# Browser Swarm AI — Specification Draft

Version: 0.1-draft
Status: exploratory

## 1. Overview

Browser Swarm AI defines a modular architecture for distributing AI artifacts to browser peers, executing local inference when possible, and optionally coordinating shared workloads between independent participants.

The spec is intentionally split into layers so implementations can adopt only the parts they need.

## 2. Terminology

### Peer
A browser or compatible node participating in transport, caching, execution, or coordination.

### Swarm
A temporary or persistent set of peers exchanging chunks for one or more artifacts.

### Artifact
Any content-addressed asset required for execution.
Examples:
- model weights
- tokenizer files
- metadata
- prompt templates
- adapters

### Manifest
A signed or unsigned metadata document describing an artifact set, its chunks, hashes, compatibility requirements, and loading rules.

### Coordinator
An optional service or protocol component that helps peers discover tasks, advertise capability, and exchange work claims or proofs.

### Verifier
A local or remote component that checks integrity, compatibility, and optionally result validity.

## 3. Layer boundaries

### 3.1 Transport layer
The transport layer is responsible for:
- peer discovery
- signaling
- chunk request and response
- retransmission policy
- disconnect handling

The transport layer is not responsible for:
- deciding what a valid model artifact is
- executing inference
- assigning economic value to tasks

### 3.2 Content layer
The content layer is responsible for:
- artifact identifiers
- chunk maps
- integrity hashes
- compatibility metadata
- cacheability rules

The content layer is not responsible for:
- how peers physically connect
- how prompts are executed

### 3.3 Runtime layer
The runtime layer is responsible for:
- environment detection
- model loading
- execution scheduling inside the peer
- memory and quota policies
- fallback behavior

### 3.4 Coordination layer
The coordination layer is responsible for:
- task publication
- capability matching
- work assignment
- optional verification workflows
- reputation inputs

## 4. Protocol objects

## 4.1 Manifest object

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
- `signatures`
- `compatibility`

## 4.2 Peer capability object

A peer MAY advertise capability metadata.

Example:

```json
{
  "peer_id": "peer-abc123",
  "runtime": {
    "browser": "generic",
    "webgpu": true,
    "wasm": true
  },
  "resources": {
    "memory_mb_estimate": 4096,
    "concurrency": 2
  },
  "policies": {
    "accept_download_requests": true,
    "accept_inference_tasks": false
  }
}
```

A peer SHOULD avoid exposing unnecessarily fingerprintable information.

## 4.3 Task offer object

A coordinator MAY publish task offers.

Example:

```json
{
  "task_id": "task-001",
  "task_type": "batch_inference",
  "artifact_id": "model:example-small-chat",
  "input_ref": "input:batch-42",
  "constraints": {
    "webgpu": true,
    "min_memory_mb": 2048
  },
  "verification": {
    "mode": "none"
  }
}
```

## 5. Peer lifecycle

A compliant peer SHOULD support the following flow:

1. initialize runtime
2. discover signaling endpoint or bootstrap peers
3. join swarm for one or more artifacts
4. fetch manifest
5. verify manifest structure
6. request chunks
7. verify chunk hashes
8. assemble or map artifact files
9. load runtime assets
10. optionally advertise readiness for tasks

## 6. Integrity rules

- Every chunk MUST be hash-verifiable.
- A file MUST NOT be considered usable until required chunks are verified.
- A manifest with missing required fields MUST be rejected.
- A peer SHOULD discard corrupted chunks and MAY penalize the sender locally.

## 7. Cache behavior

Peers MAY cache artifacts locally.

A cache policy SHOULD support:
- artifact pinning
- eviction priority
- partial download resumption
- version-aware invalidation

A peer SHOULD treat cache contents as untrusted until revalidated.

## 8. Runtime behavior

A runtime implementation SHOULD:
- detect environment support before attempting model load
- reject artifacts that exceed local policy limits
- expose execution errors cleanly
- allow fallback when a target runtime is unavailable

A runtime implementation MAY:
- support streaming output
- support partial warm caches
- support multiple execution backends

## 9. Coordination behavior

The coordination layer is optional.

If present, it SHOULD support:
- task publication
- peer claiming
- timeout and reassignment
- optional verification callback
- peer-level rate limiting

The coordination layer MUST NOT be required for basic artifact swarm download.

## 10. Security considerations

Implementations should assume hostile peers are possible.

Risks include:
- corrupted chunks
- malicious manifests
- denial of service
- capability spoofing
- result fabrication
- privacy leakage through peer metadata

Mitigations may include:
- chunk hashing
- manifest signatures
- bounded retries
- rate limits
- peer scoring
- minimal capability disclosure

## 11. Privacy considerations

Implementations SHOULD minimize:
- persistent peer identifiers
- detailed hardware disclosure
- unnecessary telemetry
- prompt leakage to third parties

Users SHOULD be informed when:
- prompts leave the local peer
- outputs are sent for verification
- coordinator services are involved

## 12. Compliance levels

### Level A — Swarm distribution only
A peer can join a swarm, fetch manifests, download chunks, and verify integrity.

### Level B — Local runtime peer
A peer satisfies Level A and can load artifacts for local inference.

### Level C — Coordinated worker peer
A peer satisfies Level B and can accept externally coordinated tasks.

## 13. Out of scope

The following are explicitly out of scope for this draft:
- economic protocol design
- cryptocurrency settlement
- universal trustless result validation
- browser escape or privileged execution
- training-specific gradient exchange rules

## 14. Reference implementation targets

A reference implementation for this draft should aim to provide:

- one browser client
- one minimal tracker service
- one manifest parser
- one chunk verifier
- one demo local inference app
- one optional coordinator stub

## 15. Future extensions

Potential future extensions:
- signed manifests
- adapter composition
- federated prompt routing
- cooperative batch scheduling
- verifiable inference protocols
- native node bridge peers
