# The Floor Game Host MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local-first game host and answer-safe projector app with durable sessions, exact duel rules, and synchronized browser windows.

**Architecture:** A pure TypeScript engine owns validation, board geometry, territory blocks, duel transitions, snapshots, and public projection. React renders separate host and public routes around one authoritative host store; IndexedDB persists the full private session while BroadcastChannel and storage events carry only projected state.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Testing Library, IndexedDB, BroadcastChannel, CSS.

**Spec:** User-approved implementation brief in Codex task 01a0deff-3a8d-7070-8f8f-5cb4a2040b48.

## Global Constraints

- One laptop and browser profile; no accounts, backend, subscriptions, or networking.
- Every host mutation persists; recovery of an interrupted duel is paused with exact stored remaining milliseconds.
- Answers and accepted answers never enter public projection or synchronization payloads.
- Every starting tile has one unique category; territory blocks inherit the challenger's category after a duel.
- Use timestamp-based clocks and transfer exactly one losing tile.
- Public controls are read-only and host reset requires confirmation.

---

### Task 1: Tooling, domain types, validation, and board geometry

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `eslint.config.js`, `index.html`
- Create: `src/engine/types.ts`, `src/engine/setup.ts`, `src/engine/board.ts`
- Test: `src/engine/setup.test.ts`, `src/engine/board.test.ts`

**Interfaces:**
- Produces `GameConfig`, `Player`, `Category`, `Question`, `BoardCell`, `TerritoryBlock`, `DuelState`, `GameSnapshot`, `HostAction`.
- Produces `validateSetup`, `createBoard`, `shuffleBoard`, `swapCells`, `lockBoard`, `orthogonalNeighbors`.

- [ ] Write tests with literal expectations for three-player setup, 13 players × 3 lives, question modes, required private answers, the 50-question cap, 39-cell 6×7 connected geometry, perimeter holes, shuffle/swap/lock, and irregular adjacency.
- [ ] Run `npm test -- src/engine/setup.test.ts src/engine/board.test.ts` and confirm failures because modules are absent.
- [ ] Implement typed models, setup validation, deterministic injectable shuffle, near-square board geometry, swap and lock guards, and adjacency.
- [ ] Re-run the focused tests and refactor only while green.

### Task 2: Pure game engine and clock transitions

**Files:**
- Create: `src/engine/game.ts`, `src/engine/selectors.ts`
- Test: `src/engine/game.test.ts`

**Interfaces:**
- Consumes board/domain types.
- Produces `createGame`, `reduceHostAction`, `effectiveRemaining`, `eligibleTerritories`, `publicSnapshot`.

- [ ] Write tests for challenger randomization, opponent-only defenders, correct/pass/expiry, pause/resume, undo, transfer of one cell, lives, elimination, grid win, Roman/UK category inheritance, continue/step-down, and answer-free projection.
- [ ] Run the focused test and confirm expected missing-module failure.
- [ ] Implement immutable transitions with a single undo snapshot, timestamp-derived clock updates, connected territory blocks, streak tracking, and explicit phases.
- [ ] Re-run focused and complete engine tests; refactor while green.

### Task 3: IndexedDB persistence, recovery, and safe sync

**Files:**
- Create: `src/data/database.ts`, `src/data/repository.ts`, `src/sync/channel.ts`
- Test: `src/data/repository.test.ts`, `src/sync/channel.test.ts`

**Interfaces:**
- Produces `saveSession`, `loadSessions`, `loadSession`, `saveImage`, `loadImage`, `recoverSession`, and `createGameChannel`.

- [ ] Write fake-IndexedDB tests for state/undo/blob round-trips and paused recovery, plus transport tests proving the wire payload contains no answer fields.
- [ ] Run focused tests and confirm missing-module failures.
- [ ] Implement versioned IndexedDB stores and BroadcastChannel with localStorage storage-event fallback.
- [ ] Re-run focused tests and the full suite.

### Task 4: Host store and complete setup/editor UI

**Files:**
- Create: `src/store/HostProvider.tsx`, `src/App.tsx`, `src/components/SetupScreen.tsx`, `src/components/QuestionEditor.tsx`, `src/components/Board.tsx`, `src/styles.css`, `src/main.tsx`
- Test: `src/App.test.tsx`

**Interfaces:**
- Consumes engine/repository/channel.
- Provides a create/resume screen, player/category/question editor, image ingestion, randomized board, repeated reshuffle, click-select/click-swap, and explicit lock.

- [ ] Write an interaction test that creates two players, supplies active categories and answer-bearing questions, builds a minimal board, swaps tiles, locks it, and starts play.
- [ ] Run the test and confirm the missing UI failure.
- [ ] Implement accessible forms, inline validation, blob-backed image previews, setup navigation, responsive board, persistence after mutations, and public-window launch.
- [ ] Re-run the UI test and full suite.

### Task 5: Live host controls and public display

**Files:**
- Create: `src/components/HostGame.tsx`, `src/components/PublicDisplay.tsx`, `src/components/Clock.tsx`, `src/components/Leaderboard.tsx`
- Modify: `src/App.tsx`, `src/store/HostProvider.tsx`, `src/styles.css`
- Test: `src/game-flow.test.tsx`

**Interfaces:**
- Host presents private answer, challenger/defender selection, pause/resume/correct/pass/continue/step-down/undo/reset.
- Public route presents board, leaderboard, prompt/image, clocks, duel result, and winner only.

- [ ] Write a fake-timer UI flow test that creates a practice game, begins a duel, marks correct, applies pass penalty, pauses/resumes, completes a duel, undoes, and checks public answer secrecy.
- [ ] Run it and confirm failure for absent live UI.
- [ ] Implement host-only action controls, authoritative ticking, safe broadcasts, public receive/render, keyboard focus, confirmed reset, and winner states.
- [ ] Re-run UI and full tests; inspect narrow and projector layouts.

### Task 6: Verification and release review

**Files:**
- Modify only files implicated by discovered failures.

- [ ] Run `npm test -- --run` and record all suites/tests.
- [ ] Run `npm run lint` and `npm run typecheck` with zero errors.
- [ ] Run `npm run build` and confirm production output.
- [ ] Run a browser smoke test for host setup/gameplay and the public route/window; confirm synchronized state and absent answers.
- [ ] Run `rg -n "TODO|FIXME|placeholder|not implemented" . -g '!node_modules' -g '!dist'` and inspect `rg --files` for completeness.
- [ ] Re-read the approved brief and map each acceptance requirement to a passing test or observed browser behavior.

## Self-review

The six tasks cover all specified setup, geometry, engine, timing, transfer/category, recovery, secrecy, synchronization, controls, and UI acceptance requirements. No deferred feature or placeholder step remains. Type names and produced interfaces remain consistent across tasks; the plan intentionally omits bonuses beyond persisted streak state.
