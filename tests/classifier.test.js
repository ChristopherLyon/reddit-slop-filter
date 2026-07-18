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
  assert.equal(classifier.score(post, { settingsVersion: 2, sensitivity: 0.2 }).hide, false);
});

test("migrates the old threshold slider as sensitivity", () => {
  const settings = classifier.mergeSettings({ threshold: 0.9 });
  assert.equal(settings.sensitivity, 0.9);
  assert.ok(settings.threshold < 0.4);
});

test("recognizes the reported planning-poker launch", () => {
  const result = classifier.score({
    title: "Launched my ad-free, no-signup planning poker tool on Product Hunt today",
    preview: "Nothing to install. Built on Next.js. Feedback very welcome.",
    subreddit: "SideProject"
  }, { settingsVersion: 2, sensitivity: 0.9 });
  assert.equal(result.hide, true);
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
