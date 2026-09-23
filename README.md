# Alemán Flashcards

Personal German vocabulary practice for Spanish speakers. React/Vite web app, Firebase Authentication/Firestore/Functions, and Capacitor Android/iOS shells.

## Setup

Use Node 22 and Java 21 (for emulator tests).

```sh
npm ci
npm ci --prefix functions
```

Set the `VITE_FIREBASE_*` client configuration variables used in `src/firebase.js`. These are public Firebase client identifiers, not administrator credentials. For safe local development, use a demo project and `VITE_USE_EMULATOR=true`; Auth, Firestore and Functions then connect to local emulators on localhost/127.0.0.1. The AI backend still needs a deliberately configured model/project for an actual provider call; don't invoke it casually from an emulator.

```sh
npx firebase emulators:start --project demo-aleman
npm run dev
```

## Checks

```sh
npm run lint
npm --prefix functions run lint
npm test
npm run test:rules
npm run build
```

`test:rules` launches only the Firestore emulator using a demo project and never production. It requires Java. React interaction tests use a simulated DOM. The production build generates a web service worker and manifest; native apps use their packaged assets.

## Study and data

- Repasar: scheduled FSRS reviews, manual deck practice, typed answers and dictation.
- Contrastes: starter exercises grounded in the vocabulary's confusing meanings.
- Mis errores: recurring patterns and corrective sessions.
- Biblioteca: words, separable families, usage notes, grammar and accepted alternatives.
- Frases: bounded local/cloud AI generation, evaluation and editable saved examples.
- Perfil → Datos: private/accepted-friend sharing, optional offline cache, JSON/CSV export and vocabulary import.

For Anki, import the CSV and map `German`/`Spanish` to front/back. Add `Article`, `Plural`, `Usage`, `ExampleDE`, `ExampleES` and `Pattern` to extra fields in a custom note type. This is a vocabulary export; it does not import the app's FSRS schedule into Anki. The JSON includes review history as an archive; importing JSON restores vocabulary only and preserves the current app progress.

See [learning-platform.md](docs/learning-platform.md) for architecture, security changes, AI parameters, offline limitations, migration and release order. [vocabulary-enrichment.md](docs/vocabulary-enrichment.md) covers the original catalogue and administrator preview/apply tool. [app-review-2026-09-14.md](docs/app-review-2026-09-14.md) records the baseline review.

## Deployment

Android builds and Google Play Alpha releases use [Codemagic](docs/android-releases.md), without Android Studio. Pushes to `main` verify compilation; the signed release workflow runs manually or from an `android-v*` tag after the one-time signing and Play credentials setup.

Deployment is separate from a git merge. Configure `GEMINI_MODEL` (required), `GEMINI_LOCATION`, and daily AI limits, then follow the coordinated Functions/rules/indexes/frontend/native rollout in the release document. Existing clients are incompatible with the new identity/friendship write restrictions. Do not roll back to permissive rules.

The old `migrateWords.js` is retained as a historical script only. Use `scripts/enrich-vocabulary.mjs` for reviewed vocabulary migrations; never run the historical script against a live deck.
