# Architecture rules

- Validate local anime image origins through `src/lib/animeImageSources.ts` before rendering; imported catalog data can reference retired environments.
- Share the image-loading fallback lifecycle between `LazyImage` and `AnimeCardImage`; identical recovery and cleanup prevent broken covers across views.
- Keep Jikan ingestion separate from legacy delta ingestion; Jikan has no change feed and uses resumable page scans.
- Jikan updates omit translated fields and populated text fields, and retain existing genre/studio names; source refreshes must not replace editorial content.
- Authenticate Jikan ingestion server-side with `has_role` and serialize page execution through `sync_state`; administrative UI alone is not authorization.
- Download Jikan covers in bounded batches to the existing image bucket; failed downloads retain the original URL and previous local cover for later recovery.
- Keep Jikan retry intent scoped to the authenticated administrator in browser storage; reconcile each retry with server checkpoints and fence writes with the acquired lease to avoid duplicate progress and stale workers.- Authenticate scheduled Jikan runs with a vault-held token compared by hash in a service-only table; schedulers cannot hold admin sessions.
