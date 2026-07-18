const test = require("node:test");
const assert = require("node:assert/strict");
const classifier = require("../src/classifier.js");

test("scores generic AI cloneware above the default threshold", () => {
  const result = classifier.score({ title: "I built an AI-powered todo app and nobody is using it", subreddit: "SideProject" });
  assert.equal(result.hide, true);
  assert.ok(result.overall >= classifier.DEFAULT_SETTINGS.threshold);
  assert.ok(result.categories.cloneware > 0);
  assert.ok(result.categories.thinWrapper > 0);
});

test("filters a formulaic launch in a generic cloneware category", () => {
  const result = classifier.score({ title: "I made a habit tracker", subreddit: "SideProject" });
  assert.equal(result.hide, true);
  assert.equal(result.overall, 0.72);
});

test("allows technical posts with substantive signals", () => {
  const result = classifier.score({ title: "Technical deep dive: benchmark results for a Rust database engine", domain: "github.com" });
  assert.equal(result.hide, false);
  assert.ok(result.categories.technicalDepth > 0);
});

test("respects a raised threshold", () => {
  const post = { title: "I launched my new side project", subreddit: "startups" };
  assert.equal(classifier.score(post, { threshold: 0.9 }).hide, false);
});

test("stable keys are deterministic and title-sensitive", () => {
  const first = classifier.stableKey({ title: "A post", subreddit: "test" });
  assert.equal(first, classifier.stableKey({ title: "A post", subreddit: "test" }));
  assert.notEqual(first, classifier.stableKey({ title: "Another post", subreddit: "test" }));
});

test("settings merge nested category defaults", () => {
  const settings = classifier.mergeSettings({ categoryWeights: { cloneware: 0 } });
  assert.equal(settings.categoryWeights.cloneware, 0);
  assert.equal(settings.categoryWeights.thinWrapper, 1);
});
