import { env, pipeline } from "@huggingface/transformers";

const MODEL_ID = "Xenova/all-MiniLM-L6-v2";
const MODEL_REVISION = "751bff37182d3f1213fa05d7196b954e230abad9";
const DIMENSIONS = 384;
let extractorPromise;
let corpusSignature = "";
let corpusVectors = [];

env.allowLocalModels = true;
env.allowRemoteModels = false;
env.localModelPath = new URL("./models/", self.location.href).href;
env.useBrowserCache = false;
env.backends.onnx.wasm.wasmPaths = new URL("./", self.location.href).href;
env.backends.onnx.wasm.numThreads = 1;

function progress(info) {
  if (["initiate", "progress", "ready"].includes(info.status)) {
    self.postMessage({ type: "status", status: info.status, file: info.file || "", progress: info.progress || 0 });
  }
}

function getExtractor() {
  if (!extractorPromise) {
    self.postMessage({ type: "status", status: "loading", progress: 0 });
    extractorPromise = pipeline("feature-extraction", MODEL_ID, {
      revision: MODEL_REVISION,
      dtype: "q8",
      device: "wasm",
      progress_callback: progress
    }).then(extractor => {
      self.postMessage({ type: "status", status: "ready", progress: 100 });
      return extractor;
    });
  }
  return extractorPromise;
}

async function embed(texts) {
  const extractor = await getExtractor();
  const output = await extractor(texts, { pooling: "mean", normalize: true });
  const flat = Array.from(output.data);
  return texts.map((_, index) => flat.slice(index * DIMENSIONS, (index + 1) * DIMENSIONS));
}

function dot(left, right) {
  let value = 0;
  for (let index = 0; index < DIMENSIONS; index += 1) value += left[index] * right[index];
  return value;
}

async function configureCorpus(corpus, signature) {
  if (signature === corpusSignature) return;
  const vectors = await embed(corpus.map(item => item.text));
  corpusVectors = corpus.map((item, index) => ({ ...item, vector: vectors[index] }));
  corpusSignature = signature;
}

function semanticScore(vector) {
  let positive = { similarity: -1, id: "" };
  let negative = { similarity: -1, id: "" };
  for (const example of corpusVectors) {
    const similarity = dot(vector, example.vector);
    const target = example.label === "keep" ? negative : positive;
    if (similarity > target.similarity) {
      target.similarity = similarity;
      target.id = example.id;
    }
  }
  let score = Math.max(0, Math.min(1, (positive.similarity - 0.28) / 0.5));
  if (negative.similarity >= positive.similarity - 0.03) score *= 0.2;
  return {
    score: Number(score.toFixed(3)),
    positiveSimilarity: Number(positive.similarity.toFixed(3)),
    negativeSimilarity: Number(negative.similarity.toFixed(3)),
    matchedExampleId: positive.id
  };
}

self.onmessage = async event => {
  const { requestId, texts, corpus, corpusSignature: signature } = event.data || {};
  if (!requestId || !Array.isArray(texts)) return;
  try {
    await configureCorpus(corpus, signature);
    const vectors = await embed(texts);
    self.postMessage({ type: "result", requestId, results: vectors.map(semanticScore) });
  } catch (error) {
    self.postMessage({ type: "error", requestId, error: error?.message || String(error) });
  }
};
