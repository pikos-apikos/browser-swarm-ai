import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";

const url = "https://huggingface.co/litert-community/MobileNet-v3-small/resolve/main/mobilenet_v3_small_dynamic_wi8_afp32.tflite";
const expectedSha256 = "a93f73c57e09b1f0224ee9965ae92af6c7da16373b2b02f9db232721f5b0ced6";
const directory = new URL("../generated/", import.meta.url);
const modelUrl = new URL("mobilenet-v3-small-dynamic-int8.tflite", directory);
const profileUrl = new URL("mobilenet-v3-small.profile.json", directory);

const response = await fetch(url);
if (!response.ok) throw new Error(`MobileNet download failed: HTTP ${response.status}`);
const bytes = new Uint8Array(await response.arrayBuffer());
const actualSha256 = createHash("sha256").update(bytes).digest("hex");
if (actualSha256 !== expectedSha256) throw new Error(`MobileNet SHA-256 mismatch: ${actualSha256}`);

await mkdir(directory, { recursive: true });
await writeFile(modelUrl, bytes);
await writeFile(profileUrl, JSON.stringify({
  backend: "litert",
  input: { dtype: "float32", shape: [1, 3, 224, 224], fill: 0 },
}, null, 2) + "\n");
console.log(`Downloaded ${modelUrl.pathname} (${bytes.byteLength} bytes)`);
console.log(`Verified SHA-256 ${actualSha256}`);
