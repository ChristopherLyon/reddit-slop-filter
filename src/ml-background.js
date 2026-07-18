import { env, pipeline } from "@huggingface/transformers";

const extensionApi = globalThis.browser || globalThis.chrome;
const MODEL_ID = "Xenova/all-MiniLM-L6-v2";
const MODEL_REVISION = "751bff37182d3f1213fa05d7196b954e230abad9";
const DIMENSIONS = 384;
let extractorPromise;
let corpusSignature = "";
let corpusVectors = [];

env.allowLocalModels = true;
env.allowRemoteModels = false;
env.localModelPath = extensionApi.runtime.getURL("build/models/");
env.useBrowserCache = false;
env.backends.onnx.wasm.wasmPaths = extensionApi.runtime.getURL("build/");
env.backends.onnx.wasm.numThreads = 1;

function setStatus(status, details = {}) {
  extensionApi.storage.local.set({ mlStatus: { status, ...details } });
}

function progress(info) {
  if (["initiate", "progress", "ready"].includes(info.status)) {
    setStatus(info.status, { file: info.file || "", progress: Math.round(info.progress || 0) });
  }
}

function getExtractor() {
  if (!extractorPromise) {
    setStatus("loading", { progress: 0 });
    extractorPromise = pipeline("feature-extraction", MODEL_ID, {
      revision: MODEL_REVISION,
      dtype: "q8",
      device: "wasm",
      progress_callback: progress
    }).then(extractor => {
      setStatus("ready", { progress: 100 });
      return extractor;
    }).catch(error => {
      extractorPromise = undefined;
      setStatus("error", { error: error?.message || String(error) });
      throw error;
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

async function scoreRequest(message) {
  await configureCorpus(message.corpus, message.corpusSignature);
  const vectors = await embed(message.texts);
  return { type: "result", requestId: message.requestId, results: vectors.map(semanticScore) };
}

extensionApi.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "ML_SCORE") return false;
  scoreRequest(message)
    .then(sendResponse)
    .catch(error => sendResponse({ type: "error", requestId: message.requestId, error: error?.message || String(error) }));
  return true;
});
