# Explorify — Recommendation Engine Design

**Date:** 2026-09-20 · **Status:** design, not yet implemented · **Author:** design session notes

---

## 1. Context

Explorify recommends songs and artists based on the track a Spotify user is currently playing.
The recommendation engine — the core of the product — was never built.
`app/api/spotify/discover/route.ts` stands in for it with placeholder logic: fetch the seed
artist's genres → fetch that artist's top tracks → run one `search?q=genre:"<first genre>"` →
dedupe → slice.

Two problems prompted this work.

**It isn't a recommendation engine.** Half of what it returns is by the artist the user is
already listening to. The genre search is deterministic — the same seed genre returns the same
globally popular results for every user, every time. It uses only `genres[0]`, often an
arbitrary micro-genre.

**It is almost certainly broken outright.** See §2.

### Product definition

The goal is **similarity**: *"I like this song, give me songs that are similar."*

This is a correction. `README.md:1`, `CLAUDE.md:7` and `src/components/artists/ArtistCarousel.tsx:59`
all describe exploring music *outside* the user's taste profile. That framing is wrong and
should be updated wherever it appears.

The distinction is load-bearing. Under a similarity goal, popularity gets **de-biased**, not
penalised — a genuinely similar popular song is a good answer. And familiar *artists* should
not be penalised at all (see §6.3).

---

## 2. What is broken today

Spotify ran a second, much larger deprecation in **February–March 2026**, on top of the
November 2024 one `CLAUDE.md` documents. Development Mode apps were migrated on 9 March 2026.

| Endpoint / field | Status |
| --- | --- |
| `GET /artists/{id}/top-tracks` | **Removed** |
| `artist.genres` | Deprecated; reported returning `null` since ~Aug 2026 |
| `artist.popularity`, `artist.followers` | **Removed** |
| `search` `limit` | Max cut **50 → 10**, default 20 → 5 |
| `POST /playlists/{id}/tracks` | Renamed → `/playlists/{id}/items` |
| `GET /playlists/{id}/items` | Own/collaborated playlists only (403 otherwise) |
| Batch gets (`GET /tracks`, `GET /artists`) | **Removed** — fetch individually |
| `/browse/*`, `/recommendations`, `/related-artists`, `/audio-features` | Removed (Nov 2024) |

### Affected call sites (verified by grep)

| File:line | Problem | Minimal fix |
| --- | --- | --- |
| `discover/route.ts:78-81` | `/artists/{id}/top-tracks` removed → throws into outer catch | Deleted by the rewrite |
| `discover/route.ts:97,107` | `limit=20` exceeds new max of 10 | Both are inside `try/catch` so they degrade to `[]` silently |
| `artists/[artistId]/route.ts:30` | `/artists/{id}/top-tracks` removed | `/search?q=artist:"<name>"&type=track&limit=10` using the name from the parallel `/artists/{id}` call — becomes sequential. Apply the artist gate from §7. |
| `artists/[artistId]/route.ts:24-25` | Comment asserts both endpoints survived | Correct it |
| `playlists/route.ts:62` | `/tracks` → `/items` | Path rename. It's a POST, not the 403-restricted GET, so it still works. |
| `playlists/[playlistId]/tracks/route.ts:20` | `/tracks` → `/items` | Same |

**Combined effect:** the top-tracks call throws and both genre searches fail, so
**Discover is fully down, not degraded.** Separately, `ArtistDetail.tsx:37` fetches the artist
route on every artist page, so **clicking any artist card is a dead page today** — reachable
from the carousel and from every `SongRow`'s "Go to artist page".

> Not verified against a live token. Drawn from Spotify's changelog and migration guide; the
> `genres: null` detail comes from community reports rather than an official changelog entry.
> Confirming empirically is task 0.

### Null-genres will crash the UI

Two components read `genres` without guarding the array itself:

- `ArtistCard.tsx:30` — `{artist.genres[0] ?? ""}`. If `genres` is `null`, `null[0]` throws a
  `TypeError`. The `?? ""` guards an undefined *element*, not a null *array*. Every card in
  the carousel dies, taking the render with it.
- `ArtistDetail.tsx:94-96` — same dereference, plus `artist.followers`, which is removed.

`src/lib/artistGenres.ts:20` is safe (`artist?.genres ?? []`), which is why `TrackMeta.tsx:29`
survives. The two components above read raw `SpotifyArtist` objects straight off search and
`/artists/{id}`, bypassing that guard.

`src/types/spotify.ts:20` declares `genres: string[]` required and non-nullable — a lie the
compiler will now enforce against you. Change to `genres?: string[] | null`.

---

## 3. The binding constraint

Spotify is no longer a music-knowledge graph. It is now three things: a **seed source**
(`/me/player`), a **search box**, and a **speaker**.

```
        ┌─────────────────────────────────────────────┐
        │         SPOTIFY WEB API (Dev Mode)          │
        ├─────────────────────────────────────────────┤
        │  STILL AVAILABLE                            │
        │   /me/player              what's playing    │
        │   /me/top/{artists,tracks}   taste profile  │ ← scopes granted,
        │   /me/player/recently-played                │   currently unused
        │   /me/playlists + own playlist items        │
        │   /search  (limit 10)  name → URI resolver  │
        │   /tracks/{id} → external_ids.isrc          │
        │   player controls                           │
        ├─────────────────────────────────────────────┤
        │  GONE                                       │
        │   recommendations · related-artists         │
        │   audio-features · artist top-tracks        │
        │   browse · artist genres/popularity/followers│
        │   other users' playlists (403)              │
        └─────────────────────────────────────────────┘
```

All similarity intelligence must come from outside. External sources speak in **names** or
**MusicBrainz IDs**; the app needs **Spotify URIs**. The only bridge is `GET /search`, capped
at 10 results and metered against an undocumented per-developer-account quota.

**Resolution is the scarcest resource in the system.** The pipeline is shaped around conserving it.

### Permanent constraints

- **Development Mode is permanent.** ~5 users max; owner must hold Premium. Extended Quota
  needs a registered business and 250k MAU. Design for a handful of users, not scale.
- **Developer Policy §III.14:** *"Do not use the Spotify Platform or any Spotify Content to
  train a machine learning or AI model or otherwise ingest Spotify Content into a machine
  learning or AI model."*

---

## 4. Approaches considered

Three ideas were raised at the outset. Verdicts:

**"See Spotify's cross-user listening data"** — not possible. Spotify has never exposed this
and is actively closing off what it did. But the substitute is real: **Last.fm** and
**ListenBrainz** are built on exactly that kind of data — decades of scrobbles from millions
of users — and are free.

**"Custom ML model"** — feasible but cold-start: there is no interaction data, so training
would use a public dataset. §III.14 means the corpus must be non-Spotify. ListenBrainz dumps
(CC0) keep this path open. Deferred to phase 5.

**"Incorporate LLMs"** — strong quality-per-effort, and the "why we picked this" text would be
a real differentiator. But §III.14's *"or otherwise ingest Spotify Content into a machine
learning or AI model"* arguably covers sending track metadata to a model. Also: latency,
per-call cost, and a bias toward well-documented artists. Deferred; not in v1.

**Chosen:** a pluggable candidate-generation pipeline sourcing similarity from Last.fm and
ListenBrainz. The architecture makes a trained model or LLM a drop-in generator later without
touching the rest.

---

## 5. Data sources

### Last.fm — primary generator

Scrobble data since 2002. Free, **API key only**, no OAuth. Verified: an unauthenticated call
returns `{"error":6}`.

`GET https://ws.audioscrobbler.com/2.0/?method=...&api_key=...&format=json`, `User-Agent` required.

| Method | Use |
| --- | --- |
| `track.getSimilar` | **Primary generator.** Track-level — the right granularity for "this song". |
| `artist.getSimilar` | Feeds `artistRecommendations` |
| `artist.getTopTags` | Replaces the deleted Spotify `artist.genres` |
| `artist.getTopTracks` | Replaces the removed Spotify `/artists/{id}/top-tracks` |
| `track.getInfo` | Returns the seed's `mbid` — see §7.2 |

**Why primary:** keyed by *names*, so output goes straight into a Spotify search with no
identity-resolution hop. It also returns **`artist.mbid` on every result at zero extra cost**,
which is what makes de-biasing possible (§6.1).

**Caveats.** Rate limits are undocumented — the terms warn only against *"several calls per
second"*; design for ~1/sec. Commercial use requires written permission. Results are not
freely redistributable — check the [ToS](https://www.last.fm/api/tos) before any durable cache.
Attribution is required.

### ListenBrainz — secondary generator + de-biasing input

MetaBrainz's open equivalent. Smaller, but **CC0** — redistributable and trainable, which is
what keeps phase 5 compliant under §III.14. Documented **1 req/sec**; returns `X-RateLimit-*`
headers. Labs endpoints are explicitly **experimental with no stability guarantee** — treat
shape changes as expected, not exceptional.

```
labs.api.listenbrainz.org/similar-recordings/json     no auth, needs `algorithm` enum
labs.api.listenbrainz.org/similar-artists/json        no auth, needs `algorithm` enum
api.listenbrainz.org/1/popularity/{artist,recording}  no auth, BATCH POST
api.listenbrainz.org/1/metadata/lookup/               name → MBID, REQUIRES token (401)
data.metabrainz.org                                   bulk dumps, phase 5
```

The `algorithm` parameter is a required enum whose values are self-describing
(`session_based_days_7500_session_300_contribution_5_threshold_10_limit_100_filter_True_skip_30`),
so the time window is tunable by swapping the string. An invalid value returns an error listing
every valid one.

**Verified gotchas:**
- `score` is an **unbounded co-occurrence count**, not a normalised similarity.
- An unknown MBID returns **`[]`, not an error**. Generators must treat empty as "no data".
- `POST /1/popularity/recording` takes `recording_mbids` only; `/artist` takes `artist_mbids`
  only. **Neither accepts names.** This is why damping must be artist-level (§6.1).

---

## 6. Scoring

### 6.1 Popularity damping — the quality centrepiece

Raw collaborative-filtering co-occurrence is heavily popularity-biased. Measured live against
the ListenBrainz Labs API, seeded with Radiohead:

| Raw co-occurrence | Damped by listen count (α = 0.5) |
| --- | --- |
| Nirvana, Red Hot Chili Peppers, Muse, Coldplay, Smashing Pumpkins, The Beatles | Blur, Beck, Pixies, R.E.M., Weezer, The Cure |

The left column is "big rock bands" — barely responsive to the seed. The right column is an
actual answer to *"what sounds like Radiohead?"* Same API, same seed, one line of arithmetic.

Raw co-occurrence asks *"how many Radiohead listeners also play X?"* — popular artists win
automatically. Damping asks *"how much more than you'd expect by chance?"*

```
  damped = raw_score / (total_listen_count ^ α)

    α = 0    raw co-occurrence — generic, popular
    α = 0.5  the right column above
    α = 1    full de-bias — over-corrects into a noisy long tail
```

**Damp at the artist level.** The popularity endpoints take MBIDs only, and Last.fm's
track-level `mbid` is frequently `""` in practice — but its **artist-level `mbid` is reliable**.
So: collect `artist.mbid` off every candidate from both generators, one batched
`POST /1/popularity/artist`, damp by `total_listen_count`. This reproduces exactly the
experiment above, costs **one unauthenticated call per Discover**, and is generator-agnostic.
Apply track-level damping opportunistically where a track `mbid` exists; never depend on it.

### 6.2 Fusing sources — rank, not score

`artist.getSimilar` returns `match` in 0–1. **`track.getSimilar` does not** — its documented
sample carries values like `10.95`. ListenBrainz returns unbounded integers. Three different
units cannot share one ranking; whichever has the largest raw magnitude would win every time,
and an α sweep would paper over that rather than fix it.

**Fuse by rank using Reciprocal Rank Fusion.** Damp *within* each source, rank within each
source, then:

```
  score = Σ_s  w_s / (k + rank_s)        k ≈ 60
```

Five lines, unit-agnostic, robust to a source returning garbage magnitudes, and the per-source
weights `w_s` are far more interpretable to sweep than α alone. α stays as the *within-source*
damping exponent, where it is meaningful.

### 6.3 Familiarity — a filter, not a penalty

An earlier draft applied `× (1 − λ · familiarity)` to penalise artists the user already knows.
That is the rejected "outside your taste" framing surviving in the maths. Under a similarity
goal, a song by an artist the user already loves is a **good** recommendation.

**Replace with a hard filter on already-heard _tracks_:** drop anything in
`/me/player/recently-played` or `/me/top/tracks`. Recommending a song the user just played is
useless. Do not penalise familiar *artists*. This removes λ from the sweep entirely.

This is also the first time the two granted-but-unused scopes in `src/lib/auth.ts:5-14`
(`user-top-read`, `user-read-recently-played`) earn their place.

### 6.4 Diversification

The objective is **coherence**, not variety — the list should read as one consistent vibe. MMR
with a low diversity weight, per-artist cap 2–3. Three tracks by one closely related artist is
a good result here, not a failure. The seed artist's own tracks are legitimate again under a
similarity goal, capped at ~3.

---

## 7. Architecture

**Four stages. Resolution goes last.**

An earlier draft resolved at stage 3, then discarded roughly half those Spotify searches during
diversification. Nothing in scoring or diversification needs a Spotify URI — damping needs
MBIDs, familiarity needs `/me/top/*`, MMR needs tags. Only the final output needs a URI.
Moving resolution last and stopping as soon as 20 tracks are accepted roughly halves the budget.

```
  seed: trackId → server fetches /tracks/{id} for clean primary artist name + ISRC
        │
        ▼
 ┌──────────────────────────────────────────────────────────┐
 │ 1. GENERATE     parallel, best-effort, degrade to []     │
 │    Last.fm track.getSimilar / artist.getSimilar          │  no Spotify calls
 │    ListenBrainz similar-recordings / similar-artists     │
 │    → ~150-200 candidates { artistName, trackName,        │
 │      artistMbid?, trackMbid?, source, rawScore, rank }   │
 └────────────────────────┬─────────────────────────────────┘
                          ▼
 ┌──────────────────────────────────────────────────────────┐     ┌──────────────────┐
 │ 2. SCORE        dedupe on normalised key                 │◄────│ TasteProfile     │
 │    one batched POST /1/popularity/artist                 │     │ /me/top/tracks   │
 │    per-source damping → RRF fusion                       │     │ recently-played  │
 │    drop already-heard tracks                             │     │ (keyed by user!) │
 └────────────────────────┬─────────────────────────────────┘     └──────────────────┘
                          ▼                                        no Spotify calls
 ┌──────────────────────────────────────────────────────────┐
 │ 3. DIVERSIFY    MMR on tag vectors + per-artist cap      │
 │    → a ranked QUEUE, not a truncated list                │
 └────────────────────────┬─────────────────────────────────┘
                          ▼
 ┌──────────────────────────────────────────────────────────┐
 │ 4. RESOLVE      walk the queue in waves of 6-8 at        │  ◄── THE EXPENSIVE
 │    concurrency 4; stop at 20 accepted                    │      STAGE
 │    L1 cache → Spotify /search → adjudicate (§7.1)        │
 │    failures absorbed by the queue's tail, not holes      │
 └──────────────────────────────────────────────────────────┘
```

### 7.1 The resolution matcher

This is the riskiest component. "Search Spotify for track + artist" is underspecified in a way
that produces wrong recommendations — and for a similarity product, a wrong track destroys
exactly the perceived quality the design exists to deliver.

The dominant failure mode is **not** live versions or remasters. It is **karaoke and tribute
pollution**: `track:"<title>" artist:"Radiohead"` returns *"Creep (Made Famous by Radiohead)"*
by "Karaoke Band" and *"Piano Tribute to Radiohead"*. Both score high on title similarity.

1. **Field-filter the query:** `q=track:"<t>" artist:"<a>"`. Free-text is materially worse.
2. **Normalise both sides:** NFKD + strip diacritics, lowercase, strip bracketed suffixes
   `(...)`/`[...]` and ` - ...` tails, strip `feat.`/`ft.`/`with`, strip leading `the`,
   collapse whitespace.
3. **Artist gate (hard reject).** Normalised Spotify artist must equal the candidate artist, or
   one must contain the other. **This does more work than every title heuristic combined** —
   karaoke and tribute acts have their own name in the artist field, not the original's.
4. **Title gate.** Normalised base-title equality, else length-normalised Levenshtein ≤ 0.15.
5. **Rank survivors.** Penalise stripped suffixes matching
   `live|remaster|karaoke|cover|tribute|instrumental|demo|acoustic|sped up|slowed|8-bit|lullaby|made famous`.
   Prefer `album_type: "album"` > `"single"` > `"compilation"`. Tie-break on `track.popularity`.
6. **Never take `items[0]`. Reject rather than guess.** Record rejections with a reason so the
   eval harness can read them.

Last.fm scrobble metadata is user-submitted and dirty. `track.getCorrection` /
`artist.getCorrection` exist for this but cost a call each — use them on the **seed only**,
never on candidates.

### 7.2 Seed identity

Two traps:

- `DiscoverRequest` (`src/types/spotify.ts:77-80`) carries only ids, so the route needs *names*
  for Last.fm. The tempting fix — send `CurrSong.songArtist` from the client — is wrong:
  `current-track/route.ts:38` builds it as `track.artists.map(a => a.name).join(", ")`, and
  `"Artist A, Artist B"` matches nothing on Last.fm.
  **Instead, have the server fetch `/tracks/{id}`** — one call, gives the clean primary artist
  name *and* `external_ids.isrc`, and keeps the request contract unchanged.
- **The seed MBID does not need a ListenBrainz token.** Preference order:
  1. Last.fm `track.getInfo` returns the track's `mbid` — free, no auth, same arm already being
     called. This removes the token requirement entirely.
  2. Spotify `/tracks/{id}` → `isrc` → MusicBrainz `/ws/2/isrc/{isrc}?inc=recordings&fmt=json`.
     One call, exact rather than fuzzy. Good fallback.
  3. ListenBrainz `metadata/lookup` with a token — last resort.

MusicBrainz is **1 req/sec, mandatory meaningful `User-Agent`, no batch recording lookup**. So
MBID→ISRC for 40 candidates is 40 seconds — dead on the online path. ISRC's role here is
**offline cache warming**, not request-time resolution.

### 7.3 Seed failure path

If the seed isn't on Last.fm, or its Spotify title is decorated
(`"Song (feat. X) - Remastered 2019"`), `track.getSimilar` returns nothing and the pipeline
yields nothing. Normalise the seed title with the same normaliser from §7.1, then fall back to
`artist.getSimilar` on the artist name alone, which is far more robust.

### 7.4 Fallback floor

If both generators fail, the design degrades to `[]` and the panel shows the empty-state
placeholder (`RecommendedSongs.tsx:45`), which looks broken. Add a floor:
`/search?q=artist:"<seed artist>"&type=track` — one Spotify call, always works, and "more from
this artist" is genuinely on-brand for similarity.

---

## 8. Budget, latency and the client

### 8.1 Search budget

Today's Discover is 2–4 Spotify calls. The four-stage pipeline with early stop is ~26–34 cold,
near zero warm. An earlier three-stage draft was ~56.

Spotify's rate limit is a rolling **30-second** window with an **undisclosed** ceiling, lower in
Development Mode; the commonly reported figure is ~180/min (~90 per window). Baseline load from
`usePlaybackSync.ts` is 1 call / 5s / user = 30 per window across 5 users.

**The real danger is not a failed Discover — it is that a Discover burst starves
`/api/spotify/current-track`,** which is the app's core surface. A 429 lands on whichever
request loses the race.

Mitigations:
- `MAX_SEARCHES_PER_DISCOVER` hard ceiling, start at 24. When exhausted, return what resolved.
  A shorter correct list beats a 429.
- A shared token bucket in `src/lib/spotifyApi.ts` (the single chokepoint) with **reserved
  headroom for the poll** — two classes, poll always admitted, discover admitted only above a
  floor. ~30 lines.
- `spotifyFetch` currently discards response headers (`spotifyApi.ts:70-75`). `SpotifyApiError`
  carries `status`/`path`/`rawBody` but **not `Retry-After`**, which Spotify sends on 429. Add
  it — one line, and the limiter needs it.
- Budget against an *observed* ceiling. Log calls-per-Discover and 429s; make the ceiling an
  env var to tune down. You cannot budget against an unpublished quota any other way.

### 8.2 Latency and the function timeout

Cold path: Last.fm ~0.4s + LB labs 0.5–2s + LB popularity 0.3–0.8s + 24–34 searches at
concurrency 4 ≈ 1.5–3s ≈ **4–7s cold**, near-instant warm.

Vercel Hobby caps functions at 10s and returns a **504 with an HTML body**. Then:
`NowPlayingCard.tsx:76` does `await response.json()` with no `.catch`, so a non-JSON body throws
a `SyntaxError`, caught at line 88, painting *"Unexpected token '<'…"* under the Discover
button. (`SongRow.tsx:34` already does `.catch(() => ({}))` — the repo is inconsistent here.)

- Hard pipeline deadline ~6s, returning partial results rather than nothing.
- Guard the `.json()` parse in `NowPlayingCard` and `ArtistDetail.tsx:40`.
- Set `maxDuration` explicitly on the route.

### 8.3 Auto-rediscover

`NowPlayingCard.tsx:86-87` decides whether to discard a completed Discover *after* the work
finishes. Today that wastes 3 calls; under this design it wastes ~30 calls and several seconds —
and spends budget the poll needs.

- **Debounce the auto-trigger** (2–3s settle timer on the `songId` effect,
  `NowPlayingCard.tsx:108-119`). A user mid-skip-run doesn't want recommendations for a track
  they hear for two seconds. Simplest, highest-value fix.
- **Abort in-flight work.** `runDiscover` holds an `AbortController`; a new call aborts the old.
  Next 14 aborts `req.signal` on client disconnect and `spotifyFetch`'s `init` spread already
  passes `signal` through (`spotifyApi.ts:48-56`), so threading it lets the *server* stop
  calling Spotify — which is where the saving actually is.

---

## 9. Caching

The two layers that matter most are the ones an earlier draft omitted:

- **Whole-result cache**, keyed on `seedTrackId` (+ user id, since heard-track filtering is
  per-user). Re-pressing Discover, returning to a track, or a second user on the same song all
  become **zero Spotify calls**. Highest leverage, smallest effort.
- **In-flight deduplication** — a `Map<key, Promise<Result>>` so two users on the same song run
  one pipeline, not two.

Beyond that, L1 follows the pattern already in `src/lib/artistGenres.ts`: module-level `Map`
with a TTL.

> **Per-user keying is a trap.** `artistGenres.ts:9-10` says explicitly *"Genres aren't
> user-specific, so the cache isn't either."* Taste data **is**. Copying that pattern verbatim
> for `/me/top/*` serves user A's listening history to user B — with 5 users on one lambda
> that's a live leak, not a theoretical one. Key taste caches by `spotifyId` (from
> `getSpotifySession`, `spotifyApi.ts:35-41`) and say so in the comment, because the file you're
> modelling on says the opposite.

### On Neon (L2) — recommended to defer

Neon is a sound choice technically: pgvector is built in (keeping phase 5 infrastructure-free),
SQL suits the eval harness, and branching gives throwaway databases per eval run. But for **v1**
the case is weak:

- There is **no `@neondatabase/serverless`, no `DATABASE_URL`** anywhere in the repo today — new
  dependency, new secret, new failure mode.
- Neon's free tier suspends after 5 minutes idle; cold start is ~300ms–3s. For a 5-user app
  that means nearly every request pays it — potentially slower than the upstream call it caches.
- The durability argument is weaker than it looks: with 5 users polling every 5s, the lambda is
  effectively **always warm**, so the L1 `Map` survives far longer than "across lambdas" implies.
  Deploys are the only guaranteed flush.
- **Next 14 has no `after()`** (that's Next 15). L2 writes either block the response — adding
  latency to a thing explicitly not about latency — or need `waitUntil` from `@vercel/functions`,
  a second new dependency.

**Recommendation:** ship L1-only, instrument resolution hit rate and calls-per-Discover, and add
Neon only if measured cold-start misses actually cause 429s. If it lands: **one table**
(`track_resolution`), one round trip per Discover (`WHERE key = ANY($1)`). Drop
`similarity_cache` / `popularity_cache` — Last.fm and ListenBrainz have no meaningful quota
pressure, so caching them durably buys only latency, at the cost of round trips.

```sql
create table track_resolution (
  source        text not null,     -- 'lastfm' | 'listenbrainz'
  external_key  text not null,     -- normalised "artist||track"
  spotify_id    text,              -- NULL = confirmed unresolvable
  resolved_at   timestamptz not null default now(),
  primary key (source, external_key)
);
```

**Negative-cache rule.** Only cache *"search succeeded, no acceptable match."* A 429, a 5xx or
an aborted request must **never** be written as a negative — one rate-limit blip would
permanently blacklist a batch of good candidates, and because the cache is cross-user it poisons
everyone. Give negatives a much shorter TTL than positives (hours vs days).

---

## 10. Module layout

Five flat files. This repo's `src/lib/` is flat (6 files), there are **zero `index.ts` files
anywhere in `src/`**, and types live in `src/types/`, not colocated. An earlier draft proposed
`src/lib/recommend/generators/lastfm.ts` with two barrel files — that would be the deepest path
in `src/` by two levels and would introduce a convention the codebase doesn't have. Tiny modules
*are* the convention (`errors.ts` is 125 bytes), so small files are fine; nesting and barrels
are not.

```
src/lib/lastfm.ts         API client + L1 cache. Peer of spotifyApi.ts.
src/lib/listenbrainz.ts   API client + L1 cache. Peer of spotifyApi.ts.
src/lib/resolveTrack.ts   normaliser + matcher + positive/negative cache.
                          Structurally identical to artistGenres.ts.
src/lib/rank.ts           pure: damp, RRF fuse, heard-filter, MMR.
                          Exported individually so the eval harness can import them.
src/lib/recommend.ts      orchestrator. One exported function.
src/types/recommend.ts    Candidate, ScoredCandidate, RecommendOptions.
```

`discover/route.ts` becomes thin: authenticate → validate → build seed → `recommend()` →
respond, keeping its existing `SpotifyApiError` status translation and structured logging.

### Response contract

`DiscoverSuccess` stays `{ songRecommendations: SpotifyTrack[]; artistRecommendations: SpotifyArtist[] }`.

**But "zero component changes" is not true** — the *type* is preserved, the *data* is not. The
null-genres crashes in §2 must be fixed regardless. And with `artist.genres` gone, the artist
subtitle in `ArtistCard`/`ArtistDetail` has nothing to render. The obvious source is Last.fm
`artist.getTopTags`, which the pipeline already fetches — wiring it through *does* mean a
contract change (a parallel `artistTags` map, or a bespoke DTO). **Decide this deliberately
rather than shipping a blank line under every artist name.**

Unions here are discriminated by **key presence**, and consumers narrow with `"error" in data`.
Any new response type must keep required keys disjoint with no shared optional fields, or
narrowing silently breaks under `strict`.

---

## 11. Evaluation

No test framework exists in this repo. Given its minimal-dependency style, a standalone
`scripts/eval-recommend.ts` is lower friction than adding vitest — but it needs `tsx` as a
devDependency (or Node 22's `--experimental-strip-types`). Decide explicitly.

| Metric | What it catches |
| --- | --- |
| **Resolution precision** | A matcher that accepts karaoke scores 100% on *rate*. Needs a hand-labelled gold set of ~50 `(candidateName, expectedSpotifyId)` pairs. **Nothing else catches the failure mode that most damages perceived quality.** |
| **Seed specificity** | Overlap between result sets across ~50 seeds. High overlap = returning popular songs regardless of seed. This is how α and the RRF weights get chosen. Needs controls: compute it for the current genre-search implementation (lower bound) and for global top tracks (upper bound on badness). |
| **Tag overlap** | Do recommendations share Last.fm tags with the seed? Cheap automatic relevance proxy. |
| **Cross-source agreement** | Weak validation — ListenBrainz imports Last.fm history for many users, so agreement is partly a shared-population artefact, not independent corroboration. |
| **Resolution rate** | Fraction of candidates becoming playable URIs. Measures the matcher, not the recommender. |

### Observability

For a system whose entire risk surface is budget, log per-Discover
`{ spotifyCalls, cacheHits, resolvedRate, stageMs, source }`. Without it the parameter sweep is
measuring a system you cannot see, and there's no way to decide whether L2 is needed.

---

## 12. Policy and attribution

**§III.14 — low risk.** There is no model; the scoring is hand-written arithmetic. Two rules
keep it that way:

- The α / weight sweep is parameter tuning over a handful of scalars, not training. Keep the
  **objective function free of Spotify Content** — seed specificity, tag overlap and
  cross-source agreement are all computable from Last.fm/ListenBrainz data. Only resolution
  rate touches Spotify, and it measures the matcher rather than tuning the recommender.
- Never let anyone later "learn" weights from Spotify track popularity or user top-tracks.

**The larger risk is storage, not models.** Spotify's terms restrict persistent storage of
Spotify Content. A durable cross-user name → Spotify-URI table is functionally a derived
catalogue index — closer to the line than anything §III.14 covers. Another argument for
L1-only. If L2 ships: store only the Spotify **ID**, never names/art/metadata copied from
Spotify; hard TTL ≤ 30 days; documented.

**Third-party transfer:** artist and track names originating from Spotify are sent to Last.fm,
ListenBrainz and MusicBrainz. Practically this is scrobbler-shaped and low risk, but make it a
rule: **never send Spotify IDs or URIs to a third party.**

**Attribution (currently missing from the design):** Last.fm requires attribution and restricts
commercial use. MusicBrainz requires a meaningful `User-Agent` — mandatory and enforced by IP
blocking. ListenBrainz labs endpoints carry no stability guarantee.

---

## 13. Phasing

| Phase | Scope |
| --- | --- |
| **0 — Repair** *(separate commit, first)* | Verify the deprecations against a live token. Fix the six call sites in §2. Fix the null-genres crashes. Loosen `SpotifyArtist.genres` to `string[] \| null`. Correct the stale comment at `artists/[artistId]/route.ts:24-25`. Mechanical repairs to known-dead endpoints — and the artist page is a dead page today. |
| **1 — Pipeline, Last.fm only** | Four stages, `track.getSimilar` + `artist.getSimilar`, resolution matcher with artist gate, heard-track filter, whole-result cache, in-flight dedupe, L1 caches, fallback floor, observability. End-to-end working replacement. |
| **2 — De-biasing** | ListenBrainz similarity + batched `/popularity/artist`, artist-level α damping, RRF fusion. **The quality centrepiece** — the Radiohead result. |
| **3 — Evaluation** | `scripts/eval-recommend.ts`, gold set for resolution precision, seed-specificity controls, α / weight sweep. |
| **4 — Hardening** | Token bucket with poll headroom, `Retry-After` on `SpotifyApiError`, abort + debounce on auto-rediscover, pipeline deadline, `maxDuration`. *(Pull forward if 429s show up earlier.)* |
| **5 — Deferred** | Neon L2 (only if instrumentation justifies it). Audio-content embeddings from Deezer previews via CLAP/MERT — solves cold-start and is legitimately "similarity". Trained model on ListenBrainz CC0 dumps. LLM curator with "why this track" explanations. |

### Docs to update

`CLAUDE.md` is the stated source of truth for future sessions, so leaving it stale is the
highest-leverage source of future wrong decisions here. It is wrong at `:25` (top-tracks and
`limit=20` described as working), `:27` (both endpoints "survived"), `:35` ("Search and Top
Tracks return the same object shapes"), `:47` (25-user cap — the real figure is ~5, and
Extended Quota is unreachable), and `:7` (exploration framing). Also `README.md:1` and
`ArtistCarousel.tsx:59`.

Add `LASTFM_API_KEY` to `.env.local.example` and `CLAUDE.md:18`. The route must **degrade, not
500**, when it is absent — otherwise anyone cloning the repo gets a broken Discover.

---

## 14. Open decisions

1. **Credentials** — a Last.fm API key is required for phase 1 (free, instant, self-serve). A
   ListenBrainz token is *not* needed if the seed MBID comes from `track.getInfo` (§7.2).
2. **Artist subtitle** — what replaces the deleted `artist.genres` in `ArtistCard` /
   `ArtistDetail`? Last.fm tags are the obvious answer but require a contract change (§10).
3. **Eval runner** — `tsx` devDependency, Node 22 `--experimental-strip-types`, or vitest.
4. **Market** — `discover/route.ts:25` hardcodes `MARKET = "US"`, and resolved URIs are fed to
   `PUT /api/spotify/playback`. A non-US user gets unplayable tracks. Low impact at 5 users, but
   the resolution cache is cross-user and market-blind, so decide deliberately (fetch `/me` once,
   cache `country`) rather than inheriting it.
5. **Neon** — defer per §9, or include in phase 1 anyway?

---

## 15. Verification

- `npx tsc --noEmit` and `npm run lint` clean.
- `npm run dev`, play a track, press Discover: 20 songs + 9 artists, none by karaoke/tribute
  acts, none already in recently-played.
- Instrumentation shows calls-per-Discover within `MAX_SEARCHES_PER_DISCOVER`, and near-zero on
  a repeat press of the same seed (whole-result cache hit).
- Click an artist card — the artist page loads (currently a dead page).
- Skip rapidly through five tracks: one debounced Discover fires, not five.
- Kill the Last.fm key and re-run: Discover degrades to the fallback floor rather than 500ing.
- `scripts/eval-recommend.ts` reports resolution precision ≥ 0.95 on the gold set, and seed
  specificity materially below the global-top-tracks control.
