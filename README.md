# Reddit Slop Filter

[![CI](https://github.com/ChristopherLyon/reddit-slop-filter/actions/workflows/ci.yml/badge.svg)](https://github.com/ChristopherLyon/reddit-slop-filter/actions/workflows/ci.yml)
[![Safari project](https://github.com/ChristopherLyon/reddit-slop-filter/actions/workflows/safari-project.yml/badge.svg)](https://github.com/ChristopherLyon/reddit-slop-filter/actions/workflows/safari-project.yml)

A Safari-first, local, inspectable relevance firewall for Reddit. It collapses repetitive cloneware launches, thin AI wrappers, adoption complaints, and validation farming before they consume your feed.

**No account. No backend. No Reddit API. No browsing history leaves your browser.**

This is an opinionated personal filter, not an "AI-generated text detector." It scores the content archetypes you choose to avoid and gives every collapsed post reversible **Peek / Close** and **Not slop** controls.

## Install in Safari 26 (recommended)

Safari 26 can load this WebExtension folder directly—Xcode is not required for local use.

1. Download the [latest release zip](https://github.com/ChristopherLyon/reddit-slop-filter/releases/latest) and unzip it, or clone this repository.
2. In Safari, open **Safari → Settings → Advanced** and enable **Show features for web developers**.
3. Open the new **Developer** tab in Safari Settings.
4. Click **Add Temporary Extension…** and choose the extension folder or release zip.
5. In **Safari → Settings → Extensions**, enable **Reddit Slop Filter** and allow access to Reddit.

Safari removes temporary extensions after 24 hours or when Safari quits. That makes this route suitable for trying and developing the extension, but not permanent distribution. A permanently installed build must be packaged and signed as a macOS app; see [Safari packaging](#safari-packaging).

## Install in Chrome, Brave, Arc, or Edge

1. Download the latest release zip and unzip it, or clone this repository.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Choose **Load unpacked** and select this repository folder (or the unzipped release folder).
5. Open Reddit. Use the toolbar popup to change sensitivity.

## What ships in v0.3

- Supports current Reddit, older React Reddit, and old.reddit.com feed containers.
- Scores title, visible preview, subreddit, flair, and linked domain already present in the page.
- Collapses or dims posts without fetching their full content.
- Tunable category pressure, sensitivity, subreddit allowlist, and confidence display.
- **Add to training corpus** and **Worthwhile** controls when viewing a Reddit post.
- A **Slop** action beside Reddit's Share control for one-click local labelling.
- Reversible **Peek / Close** disclosure for every filtered post.
- A searchable developer corpus inspector with per-entry removal and portable JSON export.
- A choice between the shipped baseline corpus and an empty starting corpus.
- Local **Not slop** corrections and simple filtering statistics.
- A bundled quantized MiniLM neural model running in a Manifest V3 background service worker with WASM.
- An inspectable lexical fallback that works even if neural inference fails.

The neural model turns visible post text into a 384-dimensional sentence embedding. It compares that embedding with seeded examples and your personal positive/negative corpus. Labelling a post therefore affects semantically similar posts rather than adding only an exact-title rule.

### Exporting and promoting a corpus

The options page exports personal labels in the versioned `reddit-slop-filter-corpus/v1` JSON format. The file contains readable labelled examples, not MiniLM weights: MiniLM remains the fixed sentence encoder, while these examples are the trainable semantic layer.

To merge a reviewed export into the repository baseline:

```bash
npm run corpus:promote -- path/to/reddit-slop-corpus-2026-07-18.json
npm test
```

The promotion command keeps only each example's ID, label, and normalized training text. Review the resulting [`src/corpus.js`](src/corpus.js) for private or low-quality text before committing it.

## Development

Requires Node.js 20 or newer.

```bash
npm install
npm test
npm run package
npm run check
```

`npm run package` bundles the worker and WASM runtime, downloads the pinned MiniLM weights into a local ignored cache, verifies the model checksum, and creates an installable zip in `dist/`. The packaged extension makes no model-network requests at runtime.

### Safari packaging

The same source is a native Safari WebExtension. With full Xcode installed, generate the containing macOS app and Xcode project with:

```bash
sh scripts/package-safari.sh
```

The GitHub **Safari project** workflow performs the same conversion on a macOS runner and publishes the generated project as a workflow artifact. Permanent distribution requires the maintainer's Apple signing identity and either App Store review or Developer ID signing and notarization.

## How scoring works

The lexical classifier looks for weighted signals such as cloneware categories, generic AI-wrapper language, formulaic launch framing, adoption complaints, and validation requests. Substantive technical signals reduce the score. Matching multiple related categories adds a combination bonus.

Posts that the lexical classifier does not filter are batched through quantized `all-MiniLM-L6-v2` in the extension's background service worker. The closest positive corpus example raises the score; a similarly close **Worthwhile** example protects against false positives. The model revision and runtime are pinned and bundled locally.

The rules and weights live in [`src/classifier.js`](src/classifier.js), seeded examples in [`src/corpus.js`](src/corpus.js), and neural scoring in [`src/ml-background.js`](src/ml-background.js). They are versioned, testable, and intentionally easy to dispute or change.

This is not a claim about whether a post was written by AI. It is a personal relevance judgment based on visible text.

## Privacy

All extraction and scoring happen inside the browser. Settings, corrections, deliberately labelled corpus entries, and statistics remain in local extension storage. See [PRIVACY.md](PRIVACY.md).

## Roadmap

- Build and publish a labelled, redacted evaluation fixture.
- Measure precision and false-positive rate per category.
- Add corpus import and an evaluation dashboard.
- Measure semantic and lexical contribution separately on labelled fixtures.
- Validate and sign the generated Safari macOS app for permanent installation.

## Contributing

Bug reports, Reddit DOM fixtures, classifier tests, accessibility improvements, and measured model comparisons are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md).

MIT licensed.
