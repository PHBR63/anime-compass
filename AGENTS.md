# Architecture rules

- Validate local anime image origins through `src/lib/animeImageSources.ts` before rendering; imported catalog data can reference retired environments.
- Share the image-loading fallback lifecycle between `LazyImage` and `AnimeCardImage`; identical recovery and cleanup prevent broken covers across views.