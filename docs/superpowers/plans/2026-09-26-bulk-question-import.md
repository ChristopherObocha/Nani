# Bulk Question Import and 600-Question Test Pack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add reviewed multi-file image and CSV question import, configure the four-contestant 12-category test round, and prepare 50 verified questions per category.

**Architecture:** Pure import utilities parse filenames and CSV rows into reviewed candidates without touching React or IndexedDB. A review component commits only approved candidates through the existing repository, while setup exposes a named four-contestant preset. Content is kept outside the application bundle in the `Nani Test Run` library with a source manifest.

**Tech Stack:** React 18, TypeScript 5.9, Vite, Vitest, Testing Library, IndexedDB, browser File APIs, CSV parser implemented locally without a new runtime dependency.

**Spec:** `docs/superpowers/specs/2026-09-26-bulk-question-import-design.md`

## Global Constraints

- The default test round has four contestants, three active categories each, and 600 questions.
- Every category contains exactly 50 questions.
- Existing questions are never replaced by a bulk import.
- No answer data enters public display snapshots or synchronization messages.
- Image blobs remain in IndexedDB; the application bundle does not embed hundreds of binary images.
- The existing 50-question category limit remains unchanged.
- Browser-sourced assets must have a source and reuse note in the content manifest.
- No TypeSafe API credential is shipped to the browser.

## Review Focus

- A filename containing multiple dots, Unicode punctuation, or a numeric name must produce the intended answer without losing meaningful text. Test in Task 1.
- A CSV containing commas, quoted newlines, empty optional fields, or a pipe inside a quoted field must parse predictably. Test in Task 1.
- Re-importing a file or answer must not create duplicates, even when case and whitespace differ. Test in Task 1.
- A failed image write must not leave a question pointing at a missing blob. Test in Task 2.
- Cancelling a review must leave both the category and IndexedDB unchanged. Test in Task 3.

### Task 1: Pure import parsing and validation

**Files:**
- Create: `src/import/import-types.ts`
- Create: `src/import/import-utils.ts`
- Test: `src/import/import-utils.test.ts`

**Interfaces:**
- `type ImportKind = 'image' | 'trivia'`
- `interface ImportCandidate { key:string; kind:ImportKind; file?:File; text?:string; answer:string; acceptedAnswers:string[]; error?:string }`
- `interface ImportValidation { accepted:ImportCandidate[]; rejected:ImportCandidate[]; remaining:number }`
- `normalizeFilenameAnswer(name:string):string`
- `parseTriviaCsv(csv:string):ImportCandidate[]`
- `validateImport(candidates:ImportCandidate[], existing:Question[], capacity:number):ImportValidation`

- [ ] **Step 1: Write failing tests for filename normalization.**

  Cover `01-Genevieve-Nnaji.png` → `Genevieve Nnaji`, `01. Larry_O'Brien.jpg` → `Larry O'Brien`, `two.dots.name.webp` → `two dots name`, whitespace collapse, and empty results for `001---.png`.

- [ ] **Step 2: Run the focused test and verify it fails.**

  Run `npm test -- --run src/import/import-utils.test.ts`.
  Expected: module and exported function failures because the import module does not exist.

- [ ] **Step 3: Implement filename normalization and candidate types.**

  Remove only the final extension with `/\.[^/.]+$/`, remove one leading sequence matching `/^\s*\d+[\s._-]+/`, replace `_` and `-` with spaces, collapse whitespace, and trim. Preserve apostrophes and other non-separator punctuation.

- [ ] **Step 4: Write failing tests for CSV parsing.**

  Assert a header row is required, quoted commas and newlines remain in the question, blank `acceptedAnswers` becomes `[]`, pipe-separated alternatives are trimmed, and malformed quoted input produces a rejected candidate rather than throwing from the UI boundary.

- [ ] **Step 5: Implement the local CSV parser.**

  Parse character-by-character with quoted-field support, CRLF/LF handling, escaped quotes (`""`), required `question` and `answer` headers, and a stable `key` based on row index. Return parse failures as candidates with `error`.

- [ ] **Step 6: Write failing tests for duplicate and capacity validation.**

  Assert case-insensitive whitespace-normalized duplicate detection within the incoming batch and against existing questions, rejection of empty answers, rejection beyond `capacity`, preservation of accepted candidates’ order, and `remaining` capacity.

- [ ] **Step 7: Implement `validateImport`.**

  Normalize answer comparison using lowercase and collapsed whitespace. Reject candidates with parser errors, empty answers, duplicate keys/answers, and positions beyond capacity. Return accepted and rejected arrays without mutating inputs.

- [ ] **Step 8: Run the focused tests and commit.**

  Run `npm test -- --run src/import/import-utils.test.ts`.
  Expected: all import utility tests pass.
  Commit with `git add src/import && git commit -m "feat: add bulk import parsing and validation"`.

### Task 2: Safe repository batch persistence

**Files:**
- Modify: `src/data/repository.ts`
- Test: `src/data/repository.test.ts`

**Interfaces:**
- `saveImagesBatch(items:Array<{id:string;blob:Blob}>):Promise<void>`
- `saveImagesBatch` writes all image blobs in one readwrite transaction and rejects with the failing item id when a request fails.

- [ ] **Step 1: Write a failing IndexedDB batch test.**

  Save two image blobs, load both, and assert their MIME types and sizes. Add a failure test that stubs one request error and asserts the batch promise rejects without the caller receiving successful question records.

- [ ] **Step 2: Run the focused repository test to verify the new API is absent.**

  Run `npm test -- --run src/data/repository.test.ts`.
  Expected: failure because `saveImagesBatch` is not exported.

- [ ] **Step 3: Implement the batch transaction.**

  Reuse the existing `open` and `readBlob` helpers, put `{data,type}` under each id in one transaction, reject on request or transaction error, and close the database after completion.

- [ ] **Step 4: Add rollback-safe import orchestration tests.**

  Test a helper that receives accepted image candidates, saves blobs first, and only then returns questions with their `imageId` values. A simulated save failure must return no questions for failed items and must preserve the original category object.

- [ ] **Step 5: Run repository tests and commit.**

  Run `npm test -- --run src/data/repository.test.ts`.
  Expected: all repository tests pass.
  Commit with `git add src/data/repository.ts src/data/repository.test.ts && git commit -m "feat: persist imported images in batches"`.

### Task 3: Review-and-confirm import component

**Files:**
- Create: `src/components/BulkImport.tsx`
- Modify: `src/components/QuestionEditor.tsx`
- Modify: `src/styles.css`
- Test: `src/components/BulkImport.test.tsx`

**Interfaces:**
- `BulkImportProps = { category:Category; onCommit:(questions:Question[], blobs:Array<{id:string;blob:Blob}>)=>Promise<void> }`
- `QuestionEditor` continues to receive `{category,onChange}` and adds bulk image and trivia controls without changing existing manual editing behavior.

- [ ] **Step 1: Write failing component tests for image review.**

  Render a category with one existing question, select two `File` objects through the image input, assert both inferred answers and thumbnails appear, edit one answer, cancel, and verify `onCommit` was never called.

- [ ] **Step 2: Run the focused component test to verify the component is absent.**

  Run `npm test -- --run src/components/BulkImport.test.tsx`.
  Expected: module/render failures because `BulkImport` does not exist.

- [ ] **Step 3: Implement candidate collection and review state.**

  Keep selected candidates local to the component. Create object URLs only for preview and revoke them on removal/unmount. Render per-row answer inputs, error text, remove controls, accepted/rejected counts, and a cancel button.

- [ ] **Step 4: Write failing tests for confirmation and CSV import.**

  Assert confirmation passes only valid edited candidates, image candidates receive UUIDs, CSV rows become text questions, a full category disables further selection, and an `onCommit` rejection renders an actionable error while retaining the review list.

- [ ] **Step 5: Implement confirmation and category integration.**

  On confirm, call the parent with new questions and image blobs. The parent writes blobs, appends questions, and updates the category only after persistence succeeds. Add separate `accept="image/*" multiple` and `.csv` inputs with accessible labels.

- [ ] **Step 6: Add responsive styles and accessibility checks.**

  Style the review as a compact table/grid, ensure keyboard focus reaches file inputs and buttons, provide `role="status"` for progress and `role="alert"` for failures, and preserve the current mobile single-column editor layout.

- [ ] **Step 7: Run component and full tests, then commit.**

  Run `npm test -- --run src/components/BulkImport.test.tsx src/App.test.tsx`.
  Expected: new import tests and existing host-flow test pass.
  Commit with `git add src/components src/styles.css && git commit -m "feat: add reviewed bulk question import UI"`.

### Task 4: Four-contestant preset and category ownership

**Files:**
- Modify: `src/engine/setup.ts`
- Modify: `src/engine/setup.test.ts`
- Modify: `src/components/SetupScreen.tsx`
- Modify: `src/App.tsx`
- Test: `src/components/SetupScreen.test.tsx`

**Interfaces:**
- `TEST_ROUND_CATEGORIES:ReadonlyArray<{owner:string;name:string}>`
- `createTestRound():GameSnapshot`
- `createConfiguredGame` remains backwards compatible for generic games.

- [ ] **Step 1: Write failing preset tests.**

  Assert four players named `Contestant 1` through `Contestant 4`, three active categories per player, the exact 12 category names from the spec, and 50 questions in every category after the preset content pack is applied.

- [ ] **Step 2: Implement the preset data and factory.**

  Add stable category ids derived from owner and slug, create four players with three lives, and load the checked-in text-question manifest plus image manifest references without changing generic game creation.

- [ ] **Step 3: Add the preset entry point to the welcome screen.**

  Render `New test round` beside `New game`, call `createTestRound`, and keep resume behavior unchanged. Ensure active-category counts remain equal and the setup editor can still modify names and content.

- [ ] **Step 4: Integrate bulk import commits into setup state.**

  Pass an async image-and-question commit callback from `SetupScreen` to `QuestionEditor`, save the session after a successful import, and keep the host on the setup screen with updated counts.

- [ ] **Step 5: Run preset and UI tests and commit.**

  Run `npm test -- --run src/engine/setup.test.ts src/components/SetupScreen.test.tsx src/App.test.tsx`.
  Expected: preset ownership, 50-question validation, import integration, and existing gameplay tests pass.
  Commit with `git add src/engine src/components src/App.tsx && git commit -m "feat: add four-contestant test round preset"`.

### Task 5: Prepare and verify the 600-question content library

**Files:**
- Create: `content/test-round/README.md`
- Create: `content/test-round/manifest.csv`
- Create: `content/test-round/*/questions.csv`
- Create: `content/test-round/*/images/` entries or source-preserving asset references
- Create: `scripts/verify-test-round.mjs`
- Test: `scripts/verify-test-round.test.mjs` or an equivalent Node test invoked by the script

**Interfaces:**
- `scripts/verify-test-round.mjs` accepts the content root path and exits nonzero for missing categories, duplicate answers, malformed rows, absent files, or counts other than 50.
- The external Downloads library mirrors the checked-in manifest and category layout when binary assets are prepared for local import.

- [ ] **Step 1: Define category folders and manifest schema.**

  Create the 12 exact category folders and a manifest with `category,kind,filename,row,answer,sourceUrl,creator,licenseNote,verificationStatus` columns. Document that visual files may be imported from the external Downloads library while text rows remain portable CSV.

- [ ] **Step 2: Assemble the existing 15 entries into the manifest.**

  Record the current Nollywood, Afrobeats, and The Office images with their source URLs, answer labels, and reuse notes. Do not copy external Downloads binaries into the repository.

- [ ] **Step 3: Collect additional browser-sourced candidates.**

  Use bounded searches and TypeSafe-guided selection: prefer Wikimedia Commons and official organization pages, verify each candidate against its source label, and record the source before accepting it. Use CSV trivia for insufficient or ambiguous image sets.

- [ ] **Step 4: Fill every category to exactly 50.**

  Use the approved fallback rules: NBA logos may include historical/alternate logos, trophies, and facts; Premier League Logos may continue through Championship and League One; Bible Characters are text trivia-first. Ensure accepted answers are unique after normalization.

- [ ] **Step 5: Add the verifier and failing fixtures.**

  Test missing category, 49/51 count, duplicate normalized answer, missing image, malformed CSV, and missing manifest source. Then implement the verifier and make the complete pack pass.

- [ ] **Step 6: Prepare the external import folder.**

  Download only verified assets into `/Users/christopherobocha/Downloads/Nani Test Run/<category>/`, preserving the existing files and using numbered answer-bearing filenames. Place each category's trivia CSV beside its images.

- [ ] **Step 7: Run the content verifier and commit metadata.**

  Run `node scripts/verify-test-round.mjs content/test-round`.
  Expected: 12 categories, 50 items each, 600 total, zero duplicate answers, and zero missing sources/files.
  Commit metadata and verifier changes with `git add content scripts && git commit -m "data: add verified 600-question test pack"`.

### Task 6: End-to-end verification and branch handoff

**Files:**
- Modify only files implicated by verification failures.
- Test: `src/import/import-utils.test.ts`, `src/data/repository.test.ts`, `src/components/BulkImport.test.tsx`, `src/components/SetupScreen.test.tsx`, `src/App.test.tsx`

- [ ] **Step 1: Run the complete automated suite.**

  Run `npm test -- --run` and require every existing and new test to pass.

- [ ] **Step 2: Run static and production checks.**

  Run `npm run typecheck`, `npm run lint`, and `npm run build`; require zero errors.

- [ ] **Step 3: Run the content verifier.**

  Run `node scripts/verify-test-round.mjs content/test-round`; require exactly 600 validated entries.

- [ ] **Step 4: Browser-smoke the approved workflow.**

  Start Vite, choose `New test round`, open a category, bulk-select images, correct one inferred answer, import a trivia CSV, cancel a second review, build the board, and confirm the public route never receives answers.

- [ ] **Step 5: Inspect the branch diff and commit final fixes.**

  Run `git diff main...HEAD --stat`, `git diff --check`, and `rg -n 'TODO|FIXME|placeholder|not implemented' src content scripts`. Fix any findings that represent incomplete behavior, then commit with `chore: verify bulk import test round`.

- [ ] **Step 6: Push the completed feature branch.**

  Run `git push` and report the branch, commits, verification results, and any source/licensing caveats. Do not merge to `main` without the user’s explicit request.
