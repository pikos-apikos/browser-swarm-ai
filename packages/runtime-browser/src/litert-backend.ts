import { loadAndCompile, loadLiteRt, Tensor, type TypedArray } from "@litertjs/core";
import type { LiteRtRuntimeProfile } from "../../protocol/src/artifact.ts";

export type LiteRtAccelerator = "webgpu" | "webnn" | "wasm";

export interface SmokeInferenceResult {
  accelerator: LiteRtAccelerator;
  inputs: unknown;
  outputs: number[][];
  elapsedMs: number;
  expectation?: { passed: boolean; maxAbsoluteError: number };
}

let initialized = false;

export async function runSmokeInference(modelBytes: Uint8Array, accelerator: LiteRtAccelerator, profile?: LiteRtRuntimeProfile): Promise<SmokeInferenceResult> {
  if (!initialized) {
    await loadLiteRt("https://cdn.jsdelivr.net/npm/@litertjs/core@2.5.3/wasm/");
    initialized = true;
  }
  const model = await loadAndCompile(modelBytes, { accelerator });
  const details = model.getInputDetails();
  const entries = Array.isArray(details) ? details : Object.values(details);
  const tensors = entries.map((detail: any, index) => {
    const configured = index === 0 ? profile?.input : undefined;
    const shape = configured?.shape ?? Array.from(detail.shape as Int32Array);
    return Tensor.fromTypedArray(createInputData(configured?.dtype ?? detail.dtype, product(shape), configured?.values, configured?.fill), shape);
  });
  const started = performance.now();
  const outputs = await model.run(tensors);
  const values = await Promise.all(outputs.map(async (output: any) => Array.from(await output.data()) as number[]));
  const elapsedMs = performance.now() - started;
  tensors.forEach((tensor) => tensor.delete());
  outputs.forEach((output: any) => output.delete());
  const expectation = profile?.expectedOutput ? compareOutput(values[0] ?? [], profile.expectedOutput.values, profile.expectedOutput.tolerance) : undefined;
  return { accelerator, inputs: details, outputs: values, elapsedMs, expectation };
}

function product(shape: number[]): number { return shape.reduce((total, dimension) => total * Math.max(1, dimension), 1); }

function createInputData(dtype: string, length: number, values?: number[], fill = 0): TypedArray {
  if (values && values.length !== length) throw new Error(`Profile provides ${values.length} values for an input of length ${length}`);
  const source = values ?? Array.from({ length }, () => fill);
  if (dtype.includes("uint8")) return Uint8Array.from(source);
  if (dtype.includes("int")) return Int32Array.from(source);
  return Float32Array.from(source);
}

function compareOutput(actual: number[], expected: number[], tolerance: number): { passed: boolean; maxAbsoluteError: number } {
  if (actual.length < expected.length) return { passed: false, maxAbsoluteError: Number.POSITIVE_INFINITY };
  const maxAbsoluteError = expected.reduce((max, value, index) => Math.max(max, Math.abs(value - actual[index])), 0);
  return { passed: maxAbsoluteError <= tolerance, maxAbsoluteError };
}
