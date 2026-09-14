# Vocabulary context and prefix families

## What changes

After revealing a flashcard, a learning panel appears below it. For a base verb it lists its separable family, Spanish meanings and available bilingual examples. Usage notes explain distinctions such as stellen/legen/setzen and lassen/leihen/verlassen. The panel appears only after revealing the answer in either study direction; tapping the panel does not flip the card. A separate optional Spanish hint can disambiguate the question without revealing the German answer.

The initial authored catalogue has **38 usage notes, 21 base-verb families and 70 prefix derivatives**. These are common examples, not an exhaustive dictionary or an exhaustive list of every meaning. Prefixes are never freely combined to invent German words. Existing user families remain usable outside the catalogue. Matching uses German lemma and part of speech, not a guess from an ambiguous Spanish translation. A reflexive lemma may use the corresponding verb's general usage note.

## Data structure

Existing documents stay at `users/{uid}/words/{wordId}`. Firestore does not require a table DDL change. The new optional fields are additive:

```json
{
  "german": "stellen",
  "spanish": "poner / colocar",
  "type": "verb",
  "schemaVersion": 2,
  "learning": {
    "version": 1,
    "source": "catalog-v1",
    "usageEs": "Colocar algo de pie o en su posición de uso…",
    "hintEs": "",
    "exampleDe": "Ich stelle die Flasche neben den Teller.",
    "exampleEs": "Coloco la botella de pie junto al plato."
  },
  "attributes": {
    "prefixCatalogVersion": 1,
    "separablePrefixes": [
      {
        "prefix": "vor",
        "meaning": "presentar; imaginarse (sich)",
        "exampleDe": "Ich stelle dir meinen Bruder vor.",
        "exampleEs": "Te presento a mi hermano."
      }
    ]
  }
}
```

`learning.source` becomes `user` after editing a learning field. Presence of a learning object, including one deliberately cleared by the user, prevents the backfill from replacing it. A missing family is seeded when known. A nonempty legacy family is extended once with missing catalogue prefixes; existing meanings and examples take precedence. An explicit empty array is respected. `prefixCatalogVersion` prevents deleted suggestions from coming back. Neither translations nor progress documents are rewritten by the migration.

Every add/edit/import path uses the same normalizer as flashcards and sentence practice. Single verb lemmas and prefixes become lowercase (`AUF-` + `Stehen` → `aufstehen`); separators in a dictionary spelling are removed. Nouns retain their capitalization, and phrases such as `Rad fahren` and the formal pronoun `Sie` are not blindly lowercased. Derived cards carry an explicit `baseWordId`, so an underscore in a document ID no longer truncates it. A derivative does not inherit its base verb's conjugation or usage explanation.

The current historical progress model still pools derivatives with their base verb. This change preserves that model rather than attempting to guess how old answers should be split. See the app review for the proposed migration to independent progress.

## Updating existing vocabulary

After this frontend is deployed, the signed-in app runs `backfillOwnVocabulary` once per mounted session. It pages through the entire **current user's** word collection, computes changes, and rereads each candidate in a Firestore transaction before writing. Concurrent edits or deletions are respected. A failed or interrupted run can be retried; completed changes are not duplicated. The normal owner-only rules apply. No new admin endpoint or broad database permission is introduced.

The cards display catalogue enrichment immediately while persistence completes. New saves and imports persist their enrichment directly. Unmatched words stay unchanged except for safe casing repairs. The UI reports save failures and offers a retry.

For a controlled administrator run, first install the existing functions dependencies and authenticate with Google Application Default Credentials using an account authorized for this project. Do not put credentials in this repository.

```bash
npm ci --prefix functions
node scripts/enrich-vocabulary.mjs --project aleman-flashcards --uid YOUR_UID --output .migration-backups/plan.json
```

The default is a **read-only preview** of every word in that user's deck. The plan contains before/after documents, exact field patches, Firestore update timestamps and a list of words without a catalogue note. This list is the next content-review queue; it does not imply every word needs an explanation.

After reviewing the plan:

```bash
node scripts/enrich-vocabulary.mjs --project aleman-flashcards --uid YOUR_UID --apply .migration-backups/plan.json
```

Apply checks the target project/user, recomputes the permitted patch from each original record and uses a Firestore update-time precondition. Documents edited or deleted since preview are skipped and reported. Regenerate the preview for skipped records. There is no automatic rollback: the plan preserves the before values for a deliberate, conflict-aware recovery. Migration plans include private vocabulary and are gitignored.

An export can also be inspected completely offline:

```bash
node scripts/enrich-vocabulary.mjs --input words.json --output .migration-backups/preview.json
```

Input format is an array of word objects with `id`. Offline plans cannot be applied to Firestore because they lack project/user identity and update timestamps.

## Deployment and limits

The frontend and the sentence-generation prompt both changed. Publish the normal Firebase web build and the `generateSentence` function through the project's existing deployment process. Rebuild/sync the native apps through the existing Capacitor release process. No rules or indexes are changed in this PR. Existing rules still block friend-deck reads; the import serializer is ready to preserve the new fields once that separate permission issue is resolved.

This work session had GitHub access but no authenticated Firestore or Firebase deployment access. **Production was not deployed and the live database was not read or modified.** The catalogue was not matched against the unseen live deck, so its real coverage remains unknown. Finishing the content backfill requires deployment plus a signed-in session, or the administrator preview/apply flow. Reviewing the unmatched vocabulary requires the resulting export/plan.

The meaning distinctions for the user's core examples were checked against [Duden: stellen](https://www.duden.de/rechtschreibung/stellen), [setzen](https://www.duden.de/rechtschreibung/setzen) and [lassen](https://www.duden.de/rechtschreibung/lassen). Spanish explanations and examples are authored learning content; the complete catalogue has not had an independent linguist review. Sentence-practice payloads now include the note and example as context, but this does not guarantee an AI response will follow them correctly.
