# Bulk Question Import and 600-Question Test Pack Design

## Goal

Add reliable bulk question ingestion to Nani and prepare a four-contestant test
round with 12 categories and exactly 50 questions per category. Image filenames
provide answers for visual questions, while CSV supplies text trivia and accepted
answer variants.

The existing working application remains preserved on `main`. All work described
here is developed on `feature/bulk-question-import`.

## Test Round Structure

The default test round has four contestants, three active categories each, and a
total of 600 questions.

| Contestant | Categories |
| --- | --- |
| Contestant 1 | Nollywood Stars; Fruits; Hollywood Celebrities |
| Contestant 2 | Afrobeats Musicians; Groceries; Household Appliances |
| Contestant 3 | NBA Logos; Car Brands; Bible Characters |
| Contestant 4 | The Office (US); NBA Stars; Premier League Logos |

Every category contains exactly 50 questions. The 15 existing visual questions
for Nollywood Stars, Afrobeats Musicians, and The Office (US) remain part of their
respective totals, so 585 additional items are required.

## Import Workflows

### Bulk image import

Each category editor has a **Bulk add images** control accepting multiple image
files. The importer derives the proposed answer from each filename:

- remove the final extension;
- remove an optional leading sequence such as `01-`, `01_`, or `01 `;
- convert hyphens and underscores to spaces;
- collapse repeated whitespace;
- trim the result while preserving meaningful punctuation and apostrophes.

For example, `31-Larry-OBrien-Championship-Trophy.jpg` proposes the answer
`Larry OBrien Championship Trophy`. The review screen allows the host to correct
punctuation or wording before committing the import.

The review presents a thumbnail, original filename, proposed answer, and any
validation problem for every file. Nothing is persisted until the host confirms.
On confirmation, the importer writes every valid image through the existing
IndexedDB image repository and appends its corresponding question to the selected
category.

### Trivia CSV import

Each category editor also has an **Import trivia CSV** control. CSV files use this
header:

```csv
question,answer,acceptedAnswers
```

`question` and `answer` are required. `acceptedAnswers` is optional and uses a
pipe-separated list, for example `Larry O'Brien Trophy|O'Brien Trophy`. CSV rows
receive the same review-and-confirm step as images.

This path supplies Bible Characters and fills visual categories when 50 distinct,
sensible, verifiable images are unavailable. It also avoids manufacturing weak or
misleading image questions merely to reach the category quota.

## Validation and Failure Handling

The combined image and CSV import obeys the existing 50-question category limit.
Before confirmation, Nani reports:

- unsupported or unreadable image files;
- filenames that produce an empty answer;
- missing CSV headers or required values;
- answers duplicated within the incoming batch;
- answers already present in the category, compared case-insensitively after
  whitespace normalization;
- the number of items that would exceed remaining category capacity.

Invalid rows stay visible and are not imported. The host may remove or correct
them and confirm the remaining valid items. If an IndexedDB write fails during
confirmation, Nani reports the affected item and does not append a question that
references a missing image. Successfully stored items remain imported, with a
summary distinguishing successes from failures.

Existing questions are never replaced by a bulk import. Manual editing continues
to work after import.

## Component Boundaries

### Pure import utilities

A focused TypeScript module owns filename normalization, CSV parsing, duplicate
detection, capacity calculation, and conversion of reviewed candidates into
`Question` values. These functions do not access React or IndexedDB and are tested
directly.

### Review UI

A bulk-import component owns file selection, preview state, answer corrections,
validation display, cancellation, and confirmation. `QuestionEditor` invokes it
for the currently open category and receives the imported questions through its
existing category update path.

### Persistence

Image blobs continue to use the existing `saveImage` repository function and UUID
keys. Text trivia does not create image records. No answer data is added to public
display snapshots or synchronization messages.

### Test-round preset

The setup module exposes a named four-contestant test preset with the approved
category ownership. The welcome screen offers this preset separately from the
generic new-game flow so the general-purpose game builder remains available.

The preset supplies any bundled text trivia included in source data but does not
embed hundreds of binary images in the application bundle. Visual assets remain in
the external `Nani Test Run` library and are added through the bulk importer.

## Content Library

`/Users/christopherobocha/Downloads/Nani Test Run` contains one numbered folder per
category. Image filenames match their intended answers. Trivia categories or
fallbacks include a `questions.csv` file. A root manifest records category,
filename or CSV row identifier, answer, source URL, creator when available,
license or reuse note, and verification status.

The library follows these content rules:

- **Nollywood Stars, Afrobeats Musicians, Hollywood Celebrities, NBA Stars, and
  The Office (US):** prioritize clear, source-labelled portraits or character
  stills; use relevant text trivia where reliable images are unavailable.
- **Fruits, Groceries, Household Appliances, and Car Brands:** prioritize clear
  object, packaging, appliance, or logo identification with minimal visual
  ambiguity.
- **Premier League Logos:** use Premier League clubs first, then Championship and
  League One clubs to reach 50 recognizable English-football logos.
- **NBA Logos:** use the 30 current teams first, followed by traceable historical
  or alternate logos, NBA trophies, and straightforward league trivia.
- **Bible Characters:** primarily use text trivia. Clearly attributed public-domain
  artworks may be used when the depicted character is unambiguous.

Wikimedia Commons and official organization pages are preferred. Every sourced
asset must be traceable in the manifest. Non-free promotional stills are marked
accordingly and treated as test/reference material rather than represented as
freely reusable assets.

## TypeSafe-Guided Verification

The workflow follows TypeSafe's separation between deterministic code and semantic
judgment:

- code owns filename parsing, normalization, duplicate checks, capacity, storage,
  and CSV structure;
- browser search produces a bounded set of candidate assets;
- semantic review checks that a candidate visibly and contextually matches its
  proposed answer and category;
- source text and image metadata remain the evidence of record;
- uncertain, weakly sourced, or ambiguous candidates are replaced or converted to
  text trivia rather than silently accepted.

No TypeSafe API credential is required by the Nani application, and no credential
is shipped to the browser. The content-preparation process applies the skill's
selection and verification pattern outside the runtime application.

## Testing

Automated tests cover:

- filename parsing across prefixes, separators, punctuation, and multiple dots;
- empty-answer and unsupported-file rejection;
- RFC-compatible CSV quoting, required fields, accepted-answer splitting, and
  malformed input;
- within-batch and existing-category duplicate detection;
- exact enforcement of remaining capacity up to 50;
- successful multi-image persistence and question creation;
- partial storage failure without dangling image references;
- cancelling review without mutations;
- default preset ownership, category names, and 50-question validation behavior;
- continued secrecy of answers in public snapshots and sync payloads.

Final verification runs the full test suite, typecheck, lint, production build,
and a browser smoke test covering image import, CSV import, error correction,
session persistence, and public-display secrecy.

## Out of Scope

- Uploading files to a remote server or cloud account.
- Runtime TypeSafe API integration.
- Automatic facial recognition or answer inference from image pixels.
- Republishing or relicensing third-party media.
- Raising the existing 50-question category limit.
