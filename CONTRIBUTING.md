# Contributing

Keep changes inspectable and evidence-led.

1. Open an issue describing the false positive, missed archetype, Reddit DOM failure, or proposed feature.
2. Add or update a test when classifier behavior changes.
3. Run `npm test`, `npm run check`, and `npm run package`.
4. Open a focused pull request explaining the user-visible effect and privacy impact.

Do not add remote code, telemetry, full-post background fetching, or a new host permission without explicit design discussion. Classifier changes should include representative positive and negative fixtures, not only a new keyword.
