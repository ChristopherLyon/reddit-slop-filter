const test = require("node:test");
const assert = require("node:assert/strict");
const corpus = require("../src/corpus.js");

test("ships both positive and protective semantic examples", () => {
  assert.ok(corpus.filter(item => item.label === "slop").length >= 8);
  assert.ok(corpus.filter(item => item.label === "keep").length >= 4);
});

test("includes the reported planning-poker miss as a seed example", () => {
  const example = corpus.find(item => item.id === "seed-planning-poker");
  assert.ok(example);
  assert.match(example.text, /planning poker/i);
});
