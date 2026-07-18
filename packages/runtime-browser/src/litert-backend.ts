import { loadAndCompile, loadLiteRt, Tensor, type TypedArray } from "@litertjs/core";

export type LiteRtAccelerator = "webgpu" | "webnn" | "wasm";

export interface SmokeInferenceResult {
  accelerator: LiteRtAccelerator;
  inputs: unknown;
  outputs: number[][];
  elapsedMs: number;
}

let initialized = false;

export async function runSmokeInference(modelBytes: Uint8Array, accelerator: LiteRtAccelerator): Promise<SmokeInferenceResult> {
  if (!initialized) {
    await loadLiteRt("https://cdn.jsdelivr.net/npm/@litertjs/core@2.5.3/wasm/");
    initialized = true;
  }
  const model = await loadAndCompile(modelBytes, { accelerator });
  const details = model.getInputDetails();
  const entries = Array.isArray(details) ? details : Object.values(details);
  const tensors = entries.map((detail: any) => Tensor.fromTypedArray(createZeroData(detail.dtype, product(detail.shape)), detail.shape));
  const started = performance.now();
  const outputs = await model.run(tensors);
  const values = await Promise.all(outputs.map(async (output: any) => Array.from(await output.data()) as number[]));
  const elapsedMs = performance.now() - started;
  tensors.forEach((tensor) => tensor.delete());
  outputs.forEach((output: any) => output.delete());
  return { accelerator, inputs: details, outputs: values, elapsedMs };
}

function product(shape: number[]): number { return shape.reduce((total, dimension) => total * Math.max(1, dimension), 1); }

function createZeroData(dtype: string, length: number): TypedArray {
  if (dtype.includes("uint8")) return new Uint8Array(new ArrayBuffer(length));
  if (dtype.includes("int")) return new Int32Array(new ArrayBuffer(length * 4));
  return new Float32Array(new ArrayBuffer(length * 4));
}
