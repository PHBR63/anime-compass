# Architecture rules

- Allow notification/audit inserts only from trusted service clients or security-definer triggers; keep the audit writer RPC non-executable by browser roles to prevent forged records.
- Validate local anime image origins through `src/lib/animeImageSources.ts` before rendering; imported catalog data can reference retired environments.
- Share the image-loading fallback lifecycle between `LazyImage` and `AnimeCardImage`; identical recovery and cleanup prevent broken covers across views.
- Keep ingestion pipelines separate (legacy delta, Jikan, Kitsu); each source has its own edge function and resumable page scans.
- Kitsu (`import-kitsu`, successor of Hummingbird) only fills empty catalog fields, adds reserve covers when the anime has no image at all, and imports new animes only when Anime Relations Map (`relations.yuna.moe`) maps them to a MAL id; Jikan-sourced values and PT-BR content are never overwritten.
- Jikan updates omit translated fields and populated text fields, and retain existing genre/studio names; source refreshes must not replace editorial content.
- Authenticate Jikan ingestion server-side with `has_role` and serialize page execution through `sync_state`; administrative UI alone is not authorization.
- Persist autonomous Jikan intent separately from its checkpoint; serialize commands and page acquisition under the same database lock, use recoverable leases, and arm recovery only while work remains so closing the browser cannot stop execution or leave idle polling.
- Download Jikan covers in bounded batches to the existing image bucket; failed downloads retain the original URL and previous local cover for later recovery.
- Keep Jikan retry intent scoped to the authenticated administrator in browser storage; reconcile each retry with server checkpoints and fence writes with the acquired lease to avoid duplicate progress and stale workers.- Authenticate scheduled Jikan runs with a vault-held token compared by hash in a service-only table; schedulers cannot hold admin sessions.
- Jikan: optional self-hosted base URL via JIKAN_BASE_URL secret, public API as fallback; keeps imports working when either source is down.
- Discover reads only through SQL `discover_catalog`/`discover_facets` (also used by `anime-api`); counts, filters and list exclusion (via `auth.uid()`) must stay server-side so app and API numbers match.
- Discover state lives in the URL (`src/lib/discoverParams.ts`); never add parallel per-tab queries.
- Kitsu metadata enrichment writes only through `apply_kitsu_metadata` (empty fields only, provenance in `metadata_sources`, checkpoint per anime); genres/studios are stored by name without invented MAL ids.
