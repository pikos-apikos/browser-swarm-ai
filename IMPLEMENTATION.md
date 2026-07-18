# v0.1 Vertical Slice

This branch implements the first end-to-end Browser Swarm AI path:

```text
.tflite file -> HTTP gateway -> hashed chunks -> Browser A
                                      |             |
                                      |         WebRTC seeder
                                      |             |
                                      +--------> Browser B
                                                    |
                                             SHA-256 verify
                                                    |
                                             reconstruct bytes
                                                    |
                                               LiteRT.js
```

## Run

Requirements: Node.js 20.19+ and a LiteRT-compatible `.tflite` model.

```bash
npm install
MODEL_PATH=/absolute/path/to/model.tflite npm run dev
```

Open `http://localhost:5173` in two browser windows:

1. In Browser A, select **Bootstrap from HTTP**. It downloads and verifies every chunk, then joins the artifact room as a seeder.
2. In Browser B, select **Load peer-first**. It requests each chunk from Browser A through a WebRTC data channel. If no peer responds within four seconds, that chunk falls back to HTTP.
3. Select an accelerator and run the LiteRT smoke inference. The demo creates zero-valued tensors from the model's declared input shapes and displays the first output values.

## What is deliberately small

- Chunk storage is in memory; OPFS persistence belongs to v0.2.
- Signaling is a minimal WebSocket relay with no identity or authorization.
- Chunk responses use base64 JSON for inspectability; binary framed messages and SCTP-aware pacing belong to v0.2.
- The gateway serves one model configured at startup.
- The smoke inference is intended for simple models whose inputs can validly be zero-filled.

## Integrity boundary

Every received chunk is verified before entering `VerifiedChunkStore`. Reconstruction is allowed only when all manifest chunks exist, and the final artifact hash is verified again before LiteRT receives the bytes. Peer delivery and HTTP delivery therefore share the same trust boundary.
