import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const exportPath = process.argv[2];

if (!exportPath) {
  console.error("Usage: npm run corpus:promote -- path/to/reddit-slop-corpus.json");
  process.exit(1);
}

const payload = JSON.parse(await fs.readFile(path.resolve(exportPath), "utf8"));
if (payload.schema !== "reddit-slop-filter-corpus/v1" || !Array.isArray(payload.examples)) {
  throw new TypeError("Unsupported corpus export. Expected reddit-slop-filter-corpus/v1.");
}

const promoted = payload.examples.map((example, index) => {
  if (!example || !["slop", "keep"].includes(example.label)) {
    throw new TypeError(`Example ${index + 1} must have a slop or keep label.`);
  }
  const text = String(example.text || "").replace(/\s+/g, " ").trim();
  if (text.length < 10 || text.length > 1800) {
    throw new RangeError(`Example ${index + 1} text must contain 10–1800 characters.`);
  }
  return {
    id: String(example.id || `promoted-${index + 1}`),
    label: example.label,
    text
  };
});

const corpusPath = path.join(projectRoot, "src", "corpus.js");
delete require.cache[require.resolve(corpusPath)];
const existing = require(corpusPath);
const merged = new Map(existing.map(example => [example.id, { id: example.id, label: example.label, text: example.text }]));
for (const example of promoted) merged.set(example.id, example);

const serialized = JSON.stringify([...merged.values()], null, 2).replace(/^/gm, "  ");
const source = `(function initCorpus(root) {
  "use strict";

  const corpus = Object.freeze(${serialized.trimStart()});
  root.SlopFilterCorpus = corpus;
  if (typeof module !== "undefined" && module.exports) module.exports = corpus;
})(typeof globalThis !== "undefined" ? globalThis : this);
`;

await fs.writeFile(corpusPath, source);
console.log(`Promoted ${promoted.length} example(s); baseline now contains ${merged.size}. Review src/corpus.js before committing.`);
