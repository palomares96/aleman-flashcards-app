# App review — 14 September 2026

Reviewed baseline: `5b1f6b3f075d7c34000aaf6956580d8932ac8354`. This is a source-code review of the React screens, shared hooks, Firebase functions/rules/configuration and native project structure, supplemented by local build and feature checks. It is not a production database, billing, security-rules deployment or native-device audit.

## Assessment

Keep the product and the React/Firebase/Capacitor stack. A personal vocabulary library, both translation directions, a mistake-only replay, sentence practice, importable friends' decks and progress history make a useful foundation. The current weakness is that a polished interface hides an inconsistent learning/data model. Replacing the whole app would spend effort rebuilding working infrastructure before improving learning.

The strongest direction is **a German tutor for a Spanish speaker's own vocabulary**: teach which word fits a situation, practise retrieving it, and schedule it for when it is likely to be forgotten. AI is especially useful for contextual examples and feedback, while vocabulary records, progress and scheduling should stay deterministic and inspectable.

## Changes prepared in this PR

| Request | Implementation | Limit |
| --- | --- | --- |
| Show prefix verbs on revealing a base verb | Answer-only family panel with meaning and bilingual examples; existing families plus a bounded catalogue | 21 seeded base verbs / 70 derivatives; not every possible combination |
| Explain ambiguous translations | Editable Spanish usage notes, optional question hint and bilingual examples | 38 seeded notes; live vocabulary coverage unknown |
| Fix casing | Shared normalization in add/edit/import/game/sentence paths, including legacy display and migration | Phrase capitalization is preserved rather than linguistically guessed |
| Fill existing records | Authenticated owner-only background migration and admin preview/apply script with concurrency protection | Prepared and tested locally; live DB not accessed or changed |
| Avoid collateral data loss | Preserve custom learning notes, translations, progress and unrelated attributes; stop mutating prefix objects while typing | Broader concurrent editor changes still need an application-wide strategy |

The library's silent 300-word truncation was also removed so existing words and their new notes remain reachable. A paginated/cached data layer remains preferable for a very large deck. Full schema and deployment details are in [vocabulary-enrichment.md](vocabulary-enrichment.md).

## Findings to fix next

Severity reflects the repository implementation. Production impact depends on whether these rules and functions are deployed.

| Priority | Finding and evidence | Practical effect / recommended correction |
| --- | --- | --- |
| Critical before paid/public expansion | `firestore.rules` lets an owner write the entire `users/{uid}` document. `functions/index.js` trusts its `tier` field for paid AI access. | A signed-in user can grant themselves Premium in the client-accessible document. Allowlist profile fields and make entitlements server-controlled; enforce on create and update, not just update. |
| High | All signed-in users may read user documents, which contain email and other profile data (`CreateUserName.jsx`, rules). | Separate minimal discoverable profiles from private account data. A query limit does not provide field privacy. |
| High | Friend-request updates allow the receiver to modify any field; the acceptance function trusts the stored sender/receiver metadata. | Keep identities immutable and move acceptance entirely behind the server, checking status, parties and duplicate requests transactionally. |
| High | Friend import and friend-play query another user's words, but those documents are owner-only in the rules. | These features are incompatible with the checked-in rules. Define explicit sharing/accepted-friend access or a scoped server export; do not make all decks public to fix it. |
| High | `aiService.js` only detects experimental `window.ai.languageModel`; current Chrome documentation uses `LanguageModel`. Free users have no cloud fallback. | Sentence practice is unavailable on unsupported devices, and the old detector misses the current API. Add capability checks, download state, cleanup/timeouts, and a deliberately budgeted fallback or reusable offline exercises. |
| High maintenance | Functions use `@google-cloud/vertexai`; Google documents migration away from its deprecated generative SDK. Model `gemini-3.7-flash` and location `eu` are hardcoded. | Migrate to `@google/genai`, configure model/location, and verify availability in the actual project. This review did not invoke or validate the configured endpoint. |
| High learning correctness | `Game.jsx` pools base and derived answers into the base progress document. `Statistics.jsx` counts derivatives as separate playable words. | Knowing stehen can make aufstehen look learned, while statistics use a different denominator. Give every study item its own progress ID; preserve legacy aggregate history without pretending it can be split accurately. |
| High performance | After each answer, `useAchievementCheck.js` rereads words, progress, friends, sentence attempts, events and daily stats. | Read cost and latency grow with all historical activity. If the collections contain 1,000 words and 1,000 progress records, those two reads alone can fetch about 2,000 documents per answer. This is an illustrative code-path count, not a measured bill. Maintain counters incrementally and evaluate milestones at session boundaries. |
| Medium learning correctness | Smart selection uses initial counts/error rates; progress changes are written remotely but not merged into the in-memory deck. | Selection does not adapt reliably within the current session. Use a shared progress store updated atomically after each answer. |
| Medium learning correctness | Sentence practice loads stored counters but filters by `totalPlays`, a field the game does not persist; it also samples with replacement. | The "new words" filter can misclassify played words and a sentence can receive duplicates. Derive statistics from counters and sample distinct eligible items. |
| Medium reliability | Game writes are fire-and-forget; achievement checks run on a timer. | Failed/offline writes can be invisible, and achievements can race persistence. Track save state, await committed writes or queue them explicitly, and offer retry without double-counting. |
| Medium correctness | `ImportModal.jsx` lowercases its duplicate query values although German nouns are stored capitalized; queries remain case-sensitive. Backward pagination can construct `startAfter(null)`. | Duplicate detection and page navigation need regression tests. Use a normalized lexical key that also distinguishes senses and construct cursor constraints only when a cursor exists. |
| Medium scale | Sentence mode caps words and progress at 200; friend-play caps words at 50; categories are also capped without pagination. | Users may unknowingly practise or search only part of their data. Reuse one paginated/cached vocabulary service across screens. |
| Medium data quality | Most words have one Spanish string; there is no independent sense, noun plural, verb valency or reliable derived conjugation. | A one-to-one translation hides ambiguity. Evolve toward lemma → sense → study item; include plural, auxiliary, case/preposition patterns and usage register where useful. |
| Medium consistency | Daily progress snapshots are written while viewing Statistics; achievements use them for day-based activity. | History and streaks can depend on opening a screen. Record learning events independently of chart rendering and aggregate by the user's chosen local day. |
| Medium UX/reliability | Async authentication/profile reads lack a clear error/retry state; several reads either lack catches or turn failures into empty data. | Network failure can look like an empty library or an endless loading screen. Distinguish loading, empty, offline and failed states. |
| Medium privacy/reliability | Native Google sign-in authenticates both the native plugin and Firebase JS, while logout only calls the JS SDK. | Verify both native and JS sessions clear correctly on physical devices. Also test cancellation, reauthentication and app restarts. |
| Medium product truthfulness | Premium copy promises unlimited cloud use, but functions enforce 50 daily calls per function. | Show actual limits and remaining usage. Decide how failed requests count, add bounded input sizes, and expire old rate-limit records. |
| Medium maintainability | Several large components mix fetching, data transformation, state, rendering and writes. Prompts are duplicated in client and server. | Extract small domain modules and repositories; test schema/prompt contracts. The shared vocabulary module in this PR is a first step. |
| Medium startup | Baseline main JS bundle is about 972 kB minified / 265 kB gzip; this change is about 1,003 kB / 275 kB. | Lazy-load sentence practice, charts and rarely visited screens. Load vocabulary enrichment data only where appropriate if its catalogue grows. |
| Medium developer workflow | No checked-in CI workflow or project-specific README; existing migration has a hardcoded UID, logs client config and uses an unauthenticated client SDK. | Add reproducible setup and CI (build, domain tests, emulator permission tests), document deployment and retire the old migration after verifying its historical role. |

Firebase's [field-level rules guidance](https://firebase.google.com/docs/firestore/security/rules-fields) supports the entitlement/profile recommendations. [Chrome's current Prompt API documentation](https://developer.chrome.com/docs/ai/prompt-api) documents the `LanguageModel` API and desktop/hardware constraints; its foundation-model APIs do not currently support Chrome on Android/iOS. Google's [SDK migration guide](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/deprecations/genai-vertexai-sdk) covers the JavaScript migration. Pinning an old dependency does not establish that an endpoint is still supported.

The tracked `.env` inspected here contains Firebase client configuration and an emulator flag, not an observed server credential. Client Firebase API keys are shipped to browsers by design; their presence alone is not proof of database access. Review actual key restrictions, API usage and any prior alerts in Google Cloud. Protect data with correct rules and protect paid endpoints with appropriate abuse controls. No key rotation or access-policy mutation was attempted in this review.

## Most valuable product additions

| Rank | Addition | Why it is valuable | Concrete first version |
| --- | --- | --- | --- |
| 1 | Real spaced repetition | A weighted random draw has no due date or model of forgetting. A daily queue makes practice purposeful and finite. | Store due date, stability/difficulty or equivalent scheduler state, review history and Again/Hard/Good/Easy ratings per item and direction. Evaluate FSRS and validate migration on a copy of history. |
| 2 | Contrast exercises | Confusing alternatives are where dictionary flashcards fail. Knowing translations does not mean knowing when to use each. | Choose stellen/legen/setzen for a specific scene or cloze, then explain the choice. Repeat the contrast after an error. Start with the user's own confusing pairs. |
| 3 | Production and listening practice | Self-marking can overestimate recall, especially for articles and word order. | Optional type-the-answer mode, tolerances for harmless typos, explicit correction of noun case/article errors, audio replay and dictation. Keep scoring transparent and allow valid alternatives. |
| 4 | Grammar attached to vocabulary | German competence depends on combinations, not just isolated words. | Nouns with article + plural; verbs with principal parts, auxiliary and case/preposition pattern; separable verbs in main/subordinate clauses. |
| 5 | Examples from the learner's life | Personally relevant contexts make a small deck useful. | Generate/cache a few short examples in selectable settings such as Zürich, work, shopping or travel. Ground each example in the chosen sense and allow correcting/saving it. |
| 6 | A mistakes notebook | Current errors vanish into counts and session history. | Categorize errors (meaning, article, case, prefix position, conjugation), show the recurring pattern and build a short corrective session. |
| 7 | Reliable offline study and export | A phone app should work during a commute and users should be able to keep their vocabulary. | Explicit offline cache/sync status, conflict-aware queued reviews, JSON/CSV export and a documented Anki mapping. |

FSRS is an existing open implementation worth evaluating, not a claim of guaranteed outcomes for this deck; see the [maintainers' project](https://github.com/open-spaced-repetition/fsrs4anki). The ranking above is product judgment based on this app's gaps, not a measured A/B result.

I would defer more trophies, leaderboards, an unrestricted chatbot and a full visual rewrite. There is already enough gamification and UI structure to support a much better learning loop. First make the existing exercises correct, the progress meaningful and the daily session useful.

## Suggested implementation order

1. Release and verify this vocabulary-context change, run the database preview, then inspect the unmatched terms. Check the live rules; repair entitlement and sharing issues before broader use.
2. Unify the data/progress layer, separate derived study items, remove repeated full-history reads, and add reliable save/error handling.
3. Introduce a daily spaced-repetition queue and genuine sense-based contrast exercises. Migrate legacy review history conservatively.
4. Modernize AI providers with validated schemas, bounded budgets and an evaluation set of German/Spanish examples. Add audio and cached personalized exercises.

## Verification and remaining uncertainty

The baseline and changed web builds pass. Domain tests cover legacy prefix casing, reflexivity, invalid/duplicate prefixes, preservation of user metadata, derivative isolation, and idempotence over the entire seeded catalogue. The offline migration preview was exercised on synthetic records; no production apply was performed. Component interaction checks use a simulated DOM and mocked persistence without accessing personal data. Visual browser verification could not run: the browser could not reach the local preview, and a local browser download failed. Neither these checks nor the build prove Firestore rules, live AI calls or native WebView behavior.

Outstanding production work: deploy frontend/function, authenticate to the real deck, preview/apply or run the authenticated backfill, inspect unmatched words, verify current security rules, and smoke-test Android/iOS releases. There is no evidence in this session establishing the exact live vocabulary size, current cloud usage/bill, active model availability or native release status.
