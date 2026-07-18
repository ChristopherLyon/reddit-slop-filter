# Privacy

Reddit Slop Filter operates entirely inside your browser.

It reads visible Reddit feed content—titles, visible previews, subreddit names, flair, and linked domains—to score posts. It does not fetch full posts, use the Reddit API, send analytics, include advertising, or transmit browsing data.

Settings, aggregate counts, explicit **Not slop** corrections, and posts you deliberately add to the training corpus are stored with the browser's local WebExtension storage. Corpus entries contain the visible title, preview, subreddit, flair, linked domain, and post URL; usernames are not deliberately collected. Removing the extension removes this extension-managed local data according to the browser's extension-data behavior.

The quantized MiniLM model weights and WebAssembly inference runtime are bundled inside the extension. Reddit text is never sent to Hugging Face or another inference service. Building the extension from source downloads a model artifact pinned to a specific public revision, but running the packaged extension does not.

The extension requests only:

- access to pages on `*.reddit.com`, to inspect and alter the visible feed;
- local extension storage, to retain preferences, counts, and corrections.

If a future release introduces any networked model, telemetry, synchronization, or external service, that change must be documented here before release.
