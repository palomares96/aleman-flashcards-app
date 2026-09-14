# Learning platform improvements

PR #1 was merged into `main` at `d15d07e1e395484443c2d1f98fd190898b3cf35d`. This follow-up implements the review roadmap on that baseline. It does not deploy Firebase, access the live deck, change live account plans, or publish native releases.

## What learners get

- A finite **due queue**, using FSRS 6 through pinned-lockfile `ts-fsrs` 5.4.2. Due items come first, then up to 20 new items per local day across directions. “Todo el mazo” deliberately permits extra practice. Again/Hard/Good/Easy ratings update the model; the default retention target is 90%, with deterministic intervals and short-term learning enabled. Parameters are defaults, not trained on this user's history.
- Independent memory records for **base verb, each separable prefix, translation direction, listening, and deck owner**. A borrowed deck cannot change the owner's results or collide with the learner's own records.
- Optional **typed answers** and **German dictation**. Whitespace and terminal sentence punctuation are ignored. German noun capitalization and articles are checked explicitly. Saved alternatives are accepted. Approximate spellings are explained instead of silently marked correct; users can rate another valid answer themselves. Dictation requires a device German speech-synthesis voice; there is a clear fallback when unavailable.
- **12 authored contrasts**, selected from the learner's words or the complete starter set. They cover stellen/legen/setzen, lassen/verlassen, wissen/kennen, holen/bringen, verb cases and prefix placement. Failed questions repeat once at the end, and past failures are prioritized next visit. Contrast attempts have separate history; they do not pretend to measure an isolated word's FSRS memory.
- Optional **grammar metadata** and an additive starter catalogue of 18 verbs and 10 nouns: principal parts, Perfekt auxiliary, plural, valency/preposition pattern, main/subordinate clause examples and register notes. Custom data is preserved. Generated derivatives receive their own grammar where known; they never inherit the base verb's forms or auxiliary.
- A **mistakes notebook** with article/case/prefix/conjugation/meaning/spelling/capitalization counts, the most recent failed answer, and corrective sessions of up to 10 items grouped by direction and deck. It currently covers flashcard, typing and dictation errors. Sentence feedback and contrast errors have their own histories.
- **Personalized sentence contexts** (everyday life, Zürich, work, shopping, travel), bounded generation with distinct vocabulary items, reusable session examples, and saved examples that can be practised and corrected. Evaluation saves can be retried without another AI call. Automatic judgement is still fallible; examples and alternatives remain editable.
- **Offline web app assets**, opt-in personal vocabulary/example copies, a review outbox and explicit sync errors/retry. JSON export includes vocabulary and study history; JSON import restores vocabulary and skips duplicates, retaining the current scheduler. CSV has named columns for manual Anki mapping. Android/iOS use their bundled web assets and do not register the web service worker.

## Data model and migration

Existing `users/{uid}/words`, `progress`, `dailyStats`, `sentenceAttempts`, and achievement awards are retained. Legacy base/derived progress was pooled and cannot be divided reliably; it is archived rather than copied into new schedules. New items start without an FSRS schedule. Existing study history therefore remains available for inspection/export, but the new direction-specific dashboard begins with new reviews.

New records:

| Path/field                                                  | Purpose                                                                                                                                           |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `words/{id}.grammar`                                        | Optional text fields `plural`, `principalParts`, `auxiliary`, `pattern`, `mainClause`, `subordinateClause`, `registerEs`; version/source metadata |
| `words/{id}.learning.alternativesDe/Es`                     | Explicit accepted answers, at most 20 each                                                                                                        |
| `studyProgress/{cardId}`                                    | FSRS schedule, correct/incorrect/streak counters, direction/source identity, mistakes and last review                                             |
| `reviewEvents/{uuid}`                                       | Immutable event with rating, attempted answer, timestamps, local day/timezone, before/after scheduling log and session/filter metadata            |
| `studyDays/{YYYY-MM-DD}`                                    | Committed review, correct and new-item totals; written in the review transaction, never by Statistics                                             |
| `contrastProgress/{exerciseId}` / `contrastAttempts/{uuid}` | Contrast summaries and deduplicated attempt history                                                                                               |
| `savedExamples/{id}`                                        | Bilingual sentence, direction/context and user corrections                                                                                        |
| `publicProfiles/{uid}`                                      | Only uid and display name/search key, written by the server                                                                                       |
| `usernames/{sha256}`                                        | Server-only case-insensitive username reservation                                                                                                 |

A card ID is an encoded JSON tuple `[ownerUid, baseDocumentId, prefix-or-empty, direction]`. This avoids underscore collisions and keeps senses with different source document IDs distinct. Lexical duplicate detection instead compares type, normalized lemma, Spanish sense and optional hint. Re-imports use a deterministic SHA-256 document ID and a transaction, so an interrupted import can resume. Simultaneous manual creation of the same word is not globally locked.

The existing authenticated backfill now adds missing grammar and writes schema version 3. It rereads each candidate in a transaction and preserves explicit empty/custom grammar. The existing `scripts/enrich-vocabulary.mjs` preview/apply flow uses the same planner. The live vocabulary and unmatched queue have **not** been inspected in this session.

## Persistence and offline behavior

Each review is written to a UID-scoped local outbox before the card advances. The server transaction checks the UUID, applies the scheduler to the latest item, records the event and updates that local day's counters atomically. A crash after commit and before local deletion can be retried without incrementing twice. Concurrent device transactions serialize through Firestore. Late offline events retain their original timestamp/day but are scheduled after the most recent committed review; exact historical replay/parameter optimization is not implemented.

The in-memory store is shared by study screens. Collection reads are paginated in groups of 200 and use server reads; a network failure does not become an empty deck. Pending progress is visible immediately. Reconnection, vocabulary mutations and a 30-second sync timer retry the outbox. Cross-tab events only respond to outbox keys, avoiding cache-update loops. Day totals show committed events; pending introductions count toward the current device's new-card budget. Two devices studying offline cannot enforce a globally strict 20-card limit.

Offline copies use browser local storage. Capacity/private-mode failures are shown to the learner; a failed outbox write leaves the current card unanswered. Opt-in and successful download/cache completion are prerequisites for offline startup. Speech voices may themselves need internet. Offline examples must have been loaded online after enabling the cache. Contrast saving and AI evaluation require a connection. Exporting the complete history requires a connection; CSV can export a loaded cached deck. Clearing browser data removes unsynced reviews, so pending reviews block ordinary in-app logout until synchronized. An external authentication change leaves that account's outbox intact for its next sign-in.

Closing/reopening or using another account does not send an earlier account's queued events under the new identity. In-app logout clears both native and JS authentication and removes personal offline caches. This flow still needs physical Android/iOS verification.

## Permissions

- Private user records are readable only by their owner. Clients cannot create accounts directly or change tier, identity or email. The server registration function creates new accounts as free and reserves usernames transactionally.
- Public profile queries require authentication and a limit of 20, and return no private fields. Existing users publish their minimal profile when opening the updated app; searching also retries publication. Dormant users appear after they next open the app. Existing duplicate legacy names are not automatically renamed.
- Client friend-request mutations and friendship writes are denied. Server callables derive identities and names from authenticated profiles, validate recipient/status and accept requests transactionally. Requests from the old client schema cannot be accepted; decline and resend them. Existing friendships remain, but no vocabulary is exposed until its owner opts in.
- Reading another user's words requires **both reciprocal friend documents and that user's opt-in**. Revocation blocks future reads. Imported copies cannot be retroactively removed.
- Review/grammar data remains owner-controlled personal study data, not a billing authority. Review events are create-only. Rate limits and username reservations are inaccessible to clients.
- Existing Premium assignments and old friendships need an administrator audit because historical rules permitted tampering. Tightening future writes cannot establish their past integrity.

## AI setup

The deprecated Vertex generative SDK is replaced by `@google/genai`. Browser and server share input/output validation and prompts in `functions/shared/aiContracts.mjs`. Inputs are bounded (up to six words; text limits), responses require complete strings and integer 0–10 scores, and private prompts/responses are not logged.

The current Chrome `LanguageModel` API is used only when its German/Spanish capabilities are available. Optional model download is a user action; prompting has an abort timeout and always destroys its session. Unsupported devices and local errors use the budgeted cloud endpoint.

Configure Firebase function parameters before deployment:

- `GEMINI_MODEL`: **required**, no guessed model default. Choose and smoke-test an ID available in the actual Google Cloud project.
- `GEMINI_LOCATION`: defaults to `europe-west1`; adjust only to a location that supports the chosen model and the project's data-location requirements.
- `FREE_AI_DAILY_LIMIT`: default 5 **per function per UTC day**.
- `PREMIUM_AI_DAILY_LIMIT`: default 50 **per function per UTC day**.

The server checks the protected stored tier, consumes budget transactionally before the model call, and returns remaining usage. Provider failures consume a request, which the UI states. Input validation failures do not. `expiresAt` is written on rate-limit documents; enable Firestore TTL for that field if automatic cleanup is desired. Merely writing the field does not enable TTL. No live model call, quota or billing check was possible here.

## Release order and rollback

1. Run all commands in README and review the rules tests. Confirm the configured production Firebase project explicitly.
2. Audit current tier assignments, pending requests and accepted friendships. Preview vocabulary enrichment using authenticated administrator credentials, retaining the local backup outside git.
3. Configure and deploy the functions, rules and indexes as one coordinated release, followed immediately by the new web client and compatible native builds. Existing clients that write user identities/friend requests directly will stop working under the stricter rules. Do not silently relax those rules for old binaries. A maintenance/release window may be needed.
4. Sign in using a test account. Verify signup and discoverability, accepted/declined requests, opt-in import and revocation, AI generation/evaluation and budget display. Confirm no email is returned by profile search.
5. Run the owner backfill or reviewed admin apply. Inspect real unmatched words, grammar notes and prefix families; this starter catalogue is bounded.
6. On web and real native devices, verify flip panels, long notes, keyboard controls, German audio, offline startup/reconnect, logout and a second account. The service worker update prompt reloads only when chosen; finish edits first.

New learning collections are additive. Preserve them during rollback. A frontend rollback must account for the stricter server API/rules; do not restore the vulnerable rules. Review outbox entries should be synced before changing the study client schema. JSON import does not restore scheduler records; the exported histories are an archive, not an automated disaster-recovery mechanism.

## Validation and limits

Automated coverage includes domain/React interaction tests plus Firestore emulator tests for permissions, transactional friend acceptance and username reservation, concurrent review retries, direction/derivative separation, offline queuing, crash recovery and storage failure. CI runs frontend lint, Functions lint, tests, emulator tests and the production/PWA build under Node 22 and Java 21.

This is not a production deployment or visual/native QA sign-off. The session's browser could not reach the local preview in the prior phase; simulated DOM tests do not prove responsive layouts, speech voices, service-worker behavior or native logout. The initial JS bundle is reduced through screen-level lazy loading but remains over Vite's 500 kB warning threshold. Achievement evaluation now runs when opening its screen, using the shared vocabulary/progress plus historical collections once; it no longer rereads all history after every card. Very large histories would benefit from further server aggregation.

Implementation references: [FSRS JavaScript](https://github.com/open-spaced-repetition/ts-fsrs), [Chrome Prompt API](https://developer.chrome.com/docs/ai/prompt-api), [Google Gen AI SDK](https://googleapis.github.io/js-genai/release_docs/index.html), [Firebase rules field controls](https://firebase.google.com/docs/firestore/security/rules-fields), [Firebase emulator tests](https://firebase.google.com/docs/rules/unit-tests), [Vite PWA](https://vite-pwa-org.netlify.app/guide/). Grammar spot checks used [Duden: stellen](https://www.duden.de/rechtschreibung/stellen), [setzen](https://www.duden.de/rechtschreibung/setzen), [stehen](https://www.duden.de/rechtschreibung/stehen), [helfen](https://www.duden.de/rechtschreibung/helfen) and [warten](https://www.duden.de/rechtschreibung/warten); the Spanish explanations and exercise scenes are authored for this app.
