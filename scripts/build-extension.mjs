import { build } from "esbuild";
import { mkdir, copyFile, access, writeFile, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname } from "node:path";

const MODEL_ID = "Xenova/all-MiniLM-L6-v2";
const MODEL_REVISION = "751bff37182d3f1213fa05d7196b954e230abad9";
const MODEL_FILES = [
  ["config.json", 650],
  ["special_tokens_map.json", 125],
  ["tokenizer.json", 711661],
  ["tokenizer_config.json", 366],
  ["onnx/model_quantized.onnx", 22972370, "afdb6f1a0e45b715d0bb9b11772f032c399babd23bfc31fed1c170afc848bdb1"]
];

async function downloadModelFile(relativePath, expectedSize, expectedSha256) {
  const cachePath = `.model-cache/${MODEL_REVISION}/${relativePath}`;
  try { await access(cachePath); } catch {
    const url = `https://huggingface.co/${MODEL_ID}/resolve/${MODEL_REVISION}/${relativePath}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Model download failed (${response.status}): ${relativePath}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length !== expectedSize) throw new Error(`Unexpected size for ${relativePath}: ${bytes.length}`);
    if (expectedSha256 && createHash("sha256").update(bytes).digest("hex") !== expectedSha256) throw new Error(`Checksum mismatch: ${relativePath}`);
    await mkdir(dirname(cachePath), { recursive: true });
    await writeFile(cachePath, bytes);
  }
  const target = `build/models/${MODEL_ID}/${relativePath}`;
  await mkdir(dirname(target), { recursive: true });
  await copyFile(cachePath, target);
}

await rm("build", { recursive: true, force: true });
await mkdir("build", { recursive: true });
await build({
  entryPoints: ["src/ml-background.js"],
  bundle: true,
  minify: true,
  format: "esm",
  platform: "browser",
  target: ["safari17", "chrome120"],
  outfile: "build/ml-background.js",
  define: { "process.env.NODE_ENV": '"production"' }
});
await copyFile(
  "node_modules/@huggingface/transformers/dist/ort-wasm-simd-threaded.jsep.wasm",
  "build/ort-wasm-simd-threaded.jsep.wasm"
);
await copyFile(
  "node_modules/@huggingface/transformers/dist/ort-wasm-simd-threaded.jsep.mjs",
  "build/ort-wasm-simd-threaded.jsep.mjs"
);
await Promise.all(MODEL_FILES.map(file => downloadModelFile(...file)));
console.log("Built semantic background service with pinned local MiniLM model and WASM runtime.");
