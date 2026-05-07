# Browser Swarm AI
## A White Paper for Browser-Native AI Swarms

**Status:** Draft 0.1  
**Language:** English  
**Format:** Markdown

---

## Abstract

Browser Swarm AI proposes a browser-native architecture for distributing, executing, and optionally adapting AI models across a network of voluntary peers. Instead of assuming that AI must run only in centralized clouds or only on fully local devices, this paper explores a third path: a capability-aware swarm where browsers can participate as clients, cache nodes, inference workers, routing nodes, or adaptation workers depending on what each device can actually do.

The central idea is simple: model artifacts can be distributed in chunks, execution can be local or split across selected peers, and coordination can remain modular rather than monolithic. In this design, the browser is not only a user interface. It can also become a compute participant, a storage participant, a transport participant, or a coordination endpoint.

This paper does not claim that browser swarms replace all existing AI infrastructure. Instead, it argues that browser-native AI opens a new design space for peer-assisted distribution, local inference, split inference, and bounded adaptation. The goal is to define that design space clearly enough that others can reuse it, fork it, criticize it, or build on top of it.

---

## 1. Introduction

The modern AI stack is dominated by two assumptions:

1. useful models must usually be served from centralized infrastructure
2. meaningful local execution requires dedicated native applications or specialized environments

Both assumptions are becoming less absolute.

Browsers can now participate in peer-to-peer networks, store large local artifacts, and execute increasingly serious compute workloads. At the same time, model packaging, quantization, and task-specific adaptation make it possible to separate the concerns of transport, storage, execution, and coordination more cleanly than before.

This creates an opening for a new architectural pattern:

- distribute AI artifacts through a browser-friendly swarm
- run inference locally when possible
- split execution across peers when local hardware is insufficient
- support bounded adaptation where appropriate
- treat coordination as a separate layer rather than a hidden assumption

Browser Swarm AI is an attempt to describe that pattern as a reusable system design.

---

## 2. Thesis

The thesis of this paper is that AI systems can be decomposed into four separable concerns:

- **artifact distribution**
- **runtime execution**
- **coordination**
- **adaptation**

When these concerns are separated, the browser becomes a viable participant in an AI swarm even when it cannot perform every role.

A weak device may still be a client.
A storage-rich device may still be a shard cache.
A GPU-capable device may serve attention, experts, or blocks.
A stable worker may execute full inference or bounded fine-tuning tasks.

This means the right unit of participation is not “a machine that can run the whole model.”
The right unit of participation is “a peer that can contribute one or more useful capabilities.”

---

## 3. Why Browser-Native AI Matters

A browser-native architecture changes the participation model of AI systems.

A browser is already the most widely deployed application runtime in the world. If browsers can participate directly in artifact distribution and execution, then AI systems become easier to:

- join
- inspect
- fork
- route
- cache
- experiment with

This matters for several reasons.

### 3.1 Lower barrier to entry

A user should be able to join a swarm from a URL, not only from a fully installed native stack.

### 3.2 Better use of idle heterogeneity

The world contains many devices that are not powerful enough to run a full model but are still capable of useful work such as caching, routing, expert hosting, local attention, or bounded adaptation.

### 3.3 More flexible infrastructure

A browser swarm does not require every peer to be equivalent. It can tolerate a mix of:

- weak clients
- storage peers
- strong worker peers
- coordinator nodes
- bridge peers connected to native runtimes

### 3.4 New social and political possibilities

A browser-native system is easier to publish, mirror, remix, and self-host than a closed cloud product. This makes it relevant not only technically, but also institutionally. Communities, classrooms, labs, cooperatives, and civic groups can potentially organize around shared access to models and compute without requiring that every participant install and manage a heavy local stack.

---

## 4. Design Principles

Browser Swarm AI follows the principles below.

### 4.1 Browser first, not browser only

The browser is the primary participation layer, but native or server-based peers are allowed where necessary.

### 4.2 Capability over uniformity

Peers should advertise what they can do rather than pretending all peers are interchangeable.

### 4.3 Chunking is for delivery, sharding is for footprint

Splitting files into chunks improves transfer, retry, and caching. Sharding execution across peers reduces local storage and compute requirements. These are related but distinct concerns.

### 4.4 Local when possible, distributed when necessary

If a task can be executed locally, it should be. If it cannot, execution may be routed to selected peers.

### 4.5 Coarse execution boundaries over chaotic micro-routing

The system should prefer stable blocks, expert groups, or session-pinned workers over token-by-token routing across random peers.

### 4.6 Verification must exist at every layer

Every useful swarm attracts noise, instability, and abuse. Hashes, checks, timeouts, and bounded trust assumptions are foundational, not optional.

### 4.7 The swarm is voluntary and ephemeral

Browsers are not permanent servers. Any design that assumes long-lived, stable browser presence as a default will fail in practice.

---

## 5. Core Architecture

The architecture can be understood as four layers.

### 5.1 Layer One: Transport

This layer is responsible for how peers discover each other and exchange data.

Its responsibilities include:

- signaling
- peer discovery
- chunk exchange
- activation packet exchange
- retry logic
- disconnect handling

This layer should be agnostic to the semantic meaning of a model shard.

### 5.2 Layer Two: Artifact and Content Layer

This layer is responsible for what is being moved.

Its responsibilities include:

- manifests
- chunk maps
- shard definitions
- hashes
- version metadata
- compatibility requirements
- cacheability and pinning metadata

This layer turns raw files into verifiable artifacts.

### 5.3 Layer Three: Runtime Execution Layer

This layer is responsible for loading and executing model-related workloads.

Its responsibilities include:

- model loading
- environment detection
- memory policy
- execution policy
- streaming outputs
- split inference packet handling
- adapter loading

### 5.4 Layer Four: Coordination Layer

This layer is responsible for orchestrating participation when more than one peer is involved.

Its responsibilities include:

- model catalogs
- capability advertisements
- peer selection
- session graph construction
- task claiming
- worker leases
- failure handling
- reputation inputs

Coordination should be optional for simple local inference and increasingly necessary as workloads become distributed.

---

## 6. Peer Roles

Not every peer is the same. Browser Swarm AI assumes a swarm of specialized roles.

### 6.1 Client-Only Peer

A client-only peer does not contribute compute or artifacts. It selects models, requests sessions, and consumes results.

This is the role for devices that cannot perform meaningful local execution.

### 6.2 Chunk Seeder

A chunk seeder stores and serves model artifacts or other static assets.

This peer may not be able to perform inference at all, yet it remains useful because artifact distribution is a major part of the system cost.

### 6.3 Attention or Router Peer

An attention or router peer performs the hot-path routing logic for a model. In mixture-of-experts or split execution systems, this peer may decide which experts or downstream blocks are needed for a given token or request.

### 6.4 Expert or Block Peer

An expert or block peer hosts a bounded part of the model.

Examples include:

- one or more transformer blocks
- one expert group in a mixture-of-experts model
- one feed-forward segment
- one adapter bank

### 6.5 Full Worker Peer

A full worker peer can execute the complete model for a request, or enough of the model graph that it behaves as a complete worker from the perspective of the client.

### 6.6 Adaptation Worker

An adaptation worker can execute bounded training or model adaptation tasks such as local adapter updates, evaluation loops, or structured knowledge editing.

### 6.7 Coordinator or Catalog Node

A coordinator publishes available models, tracks capability advertisements, assigns workers, issues leases, and helps clients recover from failure.

This role may be implemented by a browser peer, a service peer, or a native bridge.

---

## 7. Execution Modes

The system supports multiple execution modes rather than one universal path.

### 7.1 Mode A: Remote Inference Directory

A weak browser peer selects from a list of currently available models served by other peers.

In this mode:

- the local browser acts only as client and control plane
- remote peers perform the actual inference
- the coordinator provides discovery and routing

This mode is the lowest barrier entry point for old or weak machines.

### 7.2 Mode B: Local Inference with Peer-Assisted Delivery

The browser downloads model artifacts from the swarm and runs the model locally.

In this mode:

- distribution is shared
- execution is local
- the main benefit is reduced central hosting dependence

This is the cleanest browser-native baseline.

### 7.3 Mode C: Split Inference

The local browser performs one part of execution while selected remote peers perform the rest.

Examples include:

- local attention plus remote experts
- local routing plus remote feed-forward blocks
- local preprocessing plus remote full worker execution

This mode reduces local footprint while preserving partial local control.

### 7.4 Mode D: Cooperative Artifact Hosting

A browser hosts chunks, shards, or adapters for others even when it is not actively using the model.

This mode turns browsers into infrastructure participants.

### 7.5 Mode E: Full Worker Contribution

A browser or native bridge can volunteer to serve a whole model or a major execution shard for others.

---

## 8. Why Session Pinning Matters

A common mistake in thinking about decentralized inference is to imagine each token bouncing across arbitrary peers as if model execution behaved like torrent piece exchange.

That is not the right mental model.

Artifact distribution can be swarm-like and opportunistic. Inference should generally be session-pinned and graph-aware.

A session should preferably bind to a selected set of peers for its duration. This keeps latency predictable, simplifies error handling, and reduces coordination overhead.

The swarm is suitable for artifact movement. The execution path is better treated as a temporary routed graph.

---

## 9. Artifact Strategy

A large model should not be treated as one monolithic file.

Browser Swarm AI assumes that artifacts can be represented as:

- manifests
- file sets
- chunks
- semantic shards
- adapters
- checkpoints
- tokenizer assets

This distinction matters because different jobs need different granularity.

### 9.1 Chunking

Chunking helps with:

- resumable download
- retry
- partial cache hits
- multi-peer artifact delivery
- content verification

### 9.2 Sharding

Sharding helps with:

- reduced local footprint
- partial execution placement
- expert hosting
- block hosting
- distributed adaptation

Chunking solves delivery.
Sharding solves footprint.

---

## 10. Split Inference as a First-Class Pattern

A key contribution of this paper is the claim that split inference should be treated as a first-class browser-native execution pattern.

Not every browser can run a full dense model.
Not every peer should have to download the entire model.
But many peers can still participate if execution is divided at stable architectural boundaries.

Examples of useful boundaries include:

- embeddings
- attention blocks
- router logic
- feed-forward blocks
- experts
- adapters
- output heads

The system should prefer coarse-grained boundaries because they reduce network chatter and simplify scheduling.

For dense models, contiguous block groups are often more realistic than one-layer-per-peer designs.
For mixture-of-experts systems, expert hosting is a more natural fit because not every token activates every expert.

---

## 11. Training and Adaptation

The phrase “train the model” hides several very different tasks.

Browser Swarm AI distinguishes among:

- full pretraining
- fine-tuning
- bounded adaptation
- structured model editing

### 11.1 Full Pretraining

Full pretraining is outside the intended browser-first core of this system.

It may be coordinated by the same ecosystem, but it should not be assumed to be a normal browser task.

### 11.2 Fine-Tuning

Fine-tuning may be possible on stable and capable workers, including native bridges or unusually strong browser peers.

However, this should be treated as a specialized role rather than the default expectation.

### 11.3 Bounded Adaptation

Bounded adaptation is a realistic target for browser participation.

Examples include:

- lightweight adapter updates
- local personalization
- preference tuning
- evaluation loops
- prompt-conditioned memory components

### 11.4 Structured Model Editing

Not all improvement must happen through gradient-based training.
Some systems may support structured editing of model-adjacent representations, knowledge indices, or recomposable components.

This is important because it broadens the meaning of participation beyond classic training loops.

### 11.5 Training Principle

The architecture should assume the following:

> Browsers may contribute bounded, verifiable adaptation work. Large-scale fine-tuning and pretraining belong to selected stable workers.

---

## 12. Capability-Based Routing

A swarm should not route by ideology. It should route by capability.

Each peer should be able to advertise one or more capabilities such as:

- I can browse only
- I can store chunks
- I can serve cached shards
- I can run attention
- I can host experts
- I can run a full worker
- I can perform bounded adaptation

Routing should then match requests to roles.

A model session is therefore not merely “a connection.”
It is a temporary capability graph.

---

## 13. Trust, Failure, and Verification

Any useful peer swarm must assume that peers can:

- disappear
- lie
- throttle
- corrupt data
- fail silently
- become overloaded

A serious design therefore requires layered verification.

### 13.1 Artifact Verification

- chunk hashes
- manifest checks
- version compatibility
- partial revalidation after resume

### 13.2 Runtime Verification

- session heartbeats
- timeout boundaries
- worker lease expiration
- bounded retries

### 13.3 Adaptation Verification

- shape checks
- checkpoint hash checks
- mini-evaluation sanity checks
- bounded metric expectations

Perfect trustlessness is not assumed.
Practical bounded trust is.

---

## 14. Privacy and Local Control

Browser-native systems can strengthen local control, but only if they remain honest about what is and is not private.

### 14.1 What can stay local

- prompts in fully local mode
- caches and adapters in local storage
- inference in local-only execution paths

### 14.2 What cannot be assumed private

- prompts routed to remote peers
- activations sent during split inference
- metadata shared for coordination
- capability advertisements that may reveal hardware class

The system should therefore expose execution mode explicitly to the user.
A user should know whether they are:

- running fully local
- using remote workers
- serving others
- sharing activations
- participating in adaptation

---

## 15. Incentives Without Premature Dogma

The architecture does not require tokenomics or a blockchain to make sense.

Communities may choose incentives later, but the protocol should not be defined around speculative economics before its technical roles are even stable.

Possible social operating models include:

- voluntary mutual aid
- cooperative hosting
- lab-managed worker pools
- classroom or research collectives
- quota-based private groups
- credit systems introduced later

The protocol should remain neutral enough to support several governance models.

---

## 16. Example Participation Scenarios

### Scenario A: Weak Client

A user with an old machine opens the application, sees a list of currently available models, and selects one. A remote full worker or split worker graph serves the session. The local machine remains only a client.

### Scenario B: Local Attention Contributor

A user with moderate local capability can run router or attention components and connect to a group of peers hosting experts or heavier blocks. The same peer may optionally volunteer its own attention capacity to the swarm.

### Scenario C: Mixed Participation Peer

A stronger device caches chunks, hosts some experts or blocks, and can also consume inference from others when needed. This peer is both infrastructure and user.

### Scenario D: Adaptation Contributor

A selected peer performs a bounded adaptation task, publishes a delta artifact or adapter, and returns metrics for verification.

These scenarios show that participation is not binary. It is composable.

---

## 17. What This System Is Not

Browser Swarm AI is not:

- a promise that browsers replace datacenters
- a claim that every peer can run every model
- a guarantee of trustless correctness
- a claim that split inference is always efficient
- a requirement that all models be decentralized
- a dismissal of server-based infrastructure

It is an architectural proposal for a specific design space.

---

## 18. Why This Is Worth Building Anyway

Even if browser swarms never become the dominant AI deployment model, they are still worth building.

They are worth building because they:

- reduce dependence on single serving points
- make model access more forkable and inspectable
- create new paths for cooperative infrastructure
- widen participation beyond high-end native setups
- encourage modular thinking about AI systems

They are also worth building because constraints force clarity.
A browser swarm cannot hide architectural confusion behind unlimited servers and invisible backends. It must expose what is local, what is remote, what is cached, what is routed, and what is merely assumed.

That clarity is valuable on its own.

---

## 19. Open Questions

The following questions remain intentionally open.

- How should capability advertisements avoid excessive fingerprinting?
- What is the best artifact schema for chunk maps, semantic shards, and adapters?
- What are the safest split boundaries for browser-native execution?
- How should worker leases and failover behave for long generations?
- Which adaptation tasks are realistic inside commodity browsers?
- What minimal verification model is good enough for useful cooperation?
- When should a session migrate from browser peers to native bridge peers?
- What governance models best fit voluntary compute swarms?

These are not edge questions. They are the real work.

---

## 20. Conclusion

Browser Swarm AI proposes a simple but powerful shift in perspective.

Instead of asking whether a browser can run a whole modern AI stack by itself, we ask a better question:

**What useful role can this peer play in a modular AI swarm right now?**

From that question, a more realistic architecture appears.

Some browsers will only browse.
Some will cache.
Some will route.
Some will host experts.
Some will serve full models.
Some will adapt model components.
Some will coordinate.

A browser swarm is therefore not a fantasy of uniform peers.
It is a federation of partial capabilities.

If we design for that reality, then browser-native AI stops being a gimmick and starts becoming infrastructure.

---

## 21. Suggested Next Documents

After this white paper, the next useful documents are:

1. **Protocol Overview**
   - message flow
   - peer lifecycle
   - session establishment
   - routing logic

2. **Specification Draft**
   - object schemas
   - manifest format
   - peer capability format
   - session graph format
   - worker lease format

3. **Threat Model**
   - malicious peers
   - dropout handling
   - privacy leakage
   - integrity failures

4. **Reference Implementation Plan**
   - browser client
   - tracker/coordinator
   - artifact store
   - split inference demo

---

## Appendix A: One-Sentence Summary

**Browser Swarm AI is a browser-native architecture for peer-assisted model distribution, local or split inference, and capability-based participation in AI systems.**

---

## Appendix B: Working Terminology

- **Chunking**: splitting artifacts for transport and caching
- **Sharding**: splitting execution or ownership to reduce footprint
- **Session Graph**: the selected execution topology for one request or conversation
- **Worker Lease**: a temporary assignment granting a peer the right or obligation to serve part of a session
- **Adaptation**: bounded model-improving work short of full pretraining
- **Bridge Peer**: a non-browser node that participates in the same swarm protocol

