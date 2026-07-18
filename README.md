# Reddit Slop Filter

[![CI](https://github.com/ChristopherLyon/reddit-slop-filter/actions/workflows/ci.yml/badge.svg)](https://github.com/ChristopherLyon/reddit-slop-filter/actions/workflows/ci.yml)
[![Safari project](https://github.com/ChristopherLyon/reddit-slop-filter/actions/workflows/safari-project.yml/badge.svg)](https://github.com/ChristopherLyon/reddit-slop-filter/actions/workflows/safari-project.yml)

A Safari-first, local, inspectable relevance firewall for Reddit. It collapses repetitive cloneware launches, thin AI wrappers, adoption complaints, and validation farming before they consume your feed.

**No account. No backend. No Reddit API. No browsing history leaves your browser.**

This is an opinionated personal filter, not an "AI-generated text detector." It scores the content archetypes you choose to avoid and gives every collapsed post a **Show** and **Not slop** control.

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

## What ships in v0.1

- Supports current Reddit, older React Reddit, and old.reddit.com feed containers.
- Scores title, visible preview, subreddit, flair, and linked domain already present in the page.
- Collapses or dims posts without fetching their full content.
- Tunable category pressure, threshold, subreddit allowlist, and confidence display.
- Local **Not slop** corrections and simple filtering statistics.
- An inspectable weighted feature classifier with no runtime dependencies.

The v0.1 classifier is deliberately lexical. It is fast, tiny, auditable, and establishes the browser integration and feedback loop. A local sentence-embedding model is planned only after a labelled evaluation set proves that it improves false-positive rates enough to justify its download and memory cost.

## Development

Requires Node.js 20 or newer. There are no package dependencies.

```bash
npm test
npm run check
npm run package
```

`npm run package` creates an installable zip in `dist/`. Reload the unpacked extension from `chrome://extensions` after changing files.

### Safari packaging

The same source is a native Safari WebExtension. With full Xcode installed, generate the containing macOS app and Xcode project with:

```bash
sh scripts/package-safari.sh
```

The GitHub **Safari project** workflow performs the same conversion on a macOS runner and publishes the generated project as a workflow artifact. Permanent distribution requires the maintainer's Apple signing identity and either App Store review or Developer ID signing and notarization.

## How scoring works

The classifier looks for weighted positive signals such as cloneware categories, generic AI-wrapper language, formulaic launch framing, adoption complaints, and validation requests. Substantive technical signals reduce the score. Matching multiple related categories adds a combination bonus.

The rules and weights live in [`src/classifier.js`](src/classifier.js). They are versioned, testable, and intentionally easy to dispute or change.

This is not a claim about whether a post was written by AI. It is a personal relevance judgment based on visible text.

## Privacy

All extraction, scoring, settings, corrections, and statistics remain in the browser's local extension storage. See [PRIVACY.md](PRIVACY.md).

## Roadmap

- Build and publish a labelled, redacted evaluation fixture.
- Measure precision and false-positive rate per category.
- Export/import corrections as portable training data.
- Compare the lexical baseline with quantized MiniLM embeddings in a Web Worker.
- Validate and sign the generated Safari macOS app for permanent installation.

## Contributing

Bug reports, Reddit DOM fixtures, classifier tests, accessibility improvements, and measured model comparisons are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md).

MIT licensed.
