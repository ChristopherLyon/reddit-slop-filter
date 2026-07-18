import { readFile, access } from "node:fs/promises";

const manifest = JSON.parse(await readFile("manifest.json", "utf8"));
if (manifest.manifest_version !== 3) throw new Error("Extension must use Manifest V3");
if (!/^\d+\.\d+\.\d+$/.test(manifest.version)) throw new Error("Manifest version must be semver-like");
const files = [
  "popup.html",
  "options.html",
  ...Object.values(manifest.icons || {}),
  ...Object.values(manifest.action?.default_icon || {}),
  ...manifest.web_accessible_resources.flatMap(item => item.resources.filter(resource => !resource.includes("*"))),
  ...manifest.content_scripts.flatMap(item => [...item.js, ...item.css])
];
await Promise.all(files.map(file => access(file)));
await access("build/ml-worker.js");
await access("build/ort-wasm-simd-threaded.jsep.mjs");
await access("build/ort-wasm-simd-threaded.jsep.wasm");
await access("build/models/Xenova/all-MiniLM-L6-v2/onnx/model_quantized.onnx");
for (const htmlFile of ["popup.html", "options.html"]) {
  const html = await readFile(htmlFile, "utf8");
  const srcs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(match => match[1]).filter(src => !src.startsWith("http"));
  await Promise.all(srcs.map(src => access(src)));
}
console.log(`Validated ${manifest.name} ${manifest.version}: ${files.length} declared assets found.`);
