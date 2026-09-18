# Copilot instructions for UmaPlanner UI

## Project overview

UmaPlanner UI is a React 19 and TypeScript single-page application built with Vite. It helps users plan three-Uma teams for Uma Musume PvP events. The current implemented scope is local event/team planning; the home page and PvP overview are still placeholders, while authentication, public statistics, sharing, cards, and Discord integration remain roadmap items documented in `README.md`.

## Build, test, and lint

Run commands from the repository root:

```bash
npm install              # install dependencies
npm run dev              # start the Vite development server
npm run build            # run TypeScript build checks and create the production bundle
npm run lint             # run Oxlint
npm test                 # run all Vitest tests once
npm run test:watch       # run Vitest in watch mode
```

Run a single test file:

```bash
npx vitest run tests/unit/PvpEventContext.test.tsx
```

Run one test by name:

```bash
npx vitest run tests/unit/PvpEventContext.test.tsx -t "persists a newly selected event"
```

The GitHub Actions workflow at `.github/workflows/tests.yml` installs with `npm ci` and uses `npm test` as the unit-test merge check.

## Architecture

The browser entry point is `index.html`, which loads `src/main.tsx`. `main.tsx` mounts the React tree, installs `BrowserRouter`, and imports global styles. `src/app/App.tsx` composes the application by placing `EventProvider` around the shared `Layout` and route tree.

`Layout` is the shared shell for all pages. It owns the navigation links and event selector, loads race entries, and makes the selected event available through `PvpEventContext`. The event selection is persisted in `localStorage`, so the planner and future pages consume the same event choice.

Routes map page wrappers in `src/pages` to feature components:

- `/` renders the current placeholder `HomePage`.
- `/overview` renders the placeholder overview feature.
- `/planner` renders `PvpPlannerPage`, which delegates to `features/pvp-planner/PvpPlanner.tsx`.

The planner has two local-data flows. Race metadata is loaded from the backend endpoint `GET ${VITE_API_BASE_URL}/races` when the `RaceDB` IndexedDB cache is empty. R2 datasets are loaded from `VITE_R2_BASE_URL` and cached in IndexedDB. Event-specific teams are stored in the `TeamDB` IndexedDB database, keyed by `event`. API base URL configuration is centralized in `src/lib/config.ts`; use it for backend requests.

`src/components/indexedDbRepository.tsx` is the shared persistence abstraction for IndexedDB. Keep database names, object-store names, key paths, and indexes consistent with the records using the repository. `src/types/RaceEntry.tsx` and `src/types/UmaEntry.tsx` define the frontend data shapes used by API responses, persistence, and UI components.

## Repository conventions

- Keep tests outside production code under `tests/`; unit tests belong in `tests/unit/` and use imports from `../../src/...`.
- Vitest runs in `jsdom`, with React Testing Library matchers and `fake-indexeddb` configured in `tests/setup.ts`.
- Use React Router from `react-router`, matching the existing imports and route composition in `src/app/App.tsx`.
- Use `useEvent()` for the selected event rather than introducing page-local selected-event state. The provider is responsible for synchronizing changes to `localStorage`.
- Treat IndexedDB as the source of local persistence for races and teams. Use `IndexedDbRepository` instead of adding ad hoc IndexedDB transactions.
- Preserve the planner’s event-keyed team model: one `EventTeam` record contains `event`, `uma1`, `uma2`, and `uma3`, with Uma IDs stored rather than whole Uma objects.
- Follow the existing async effect pattern in the planner: handle request/database failures explicitly and prevent stale asynchronous results from updating state after cleanup.
- API base URL configuration exists in `src/lib/config.ts` through `VITE_API_BASE_URL`; new API calls should use that configuration rather than adding another hardcoded backend URL.
- Keep route paths centralized in `src/app/routes.tsx` when adding or changing routes, and keep the route wrapper/feature separation used by the existing pages.
- Keep component-specific CSS in `src/styles` and import it from the component/feature that uses it; global styles are loaded by `src/main.tsx`.
- Preserve the current visual structure when styling: the navbar, route layout, race card, and planner controls are existing UI surfaces; prefer CSS changes over introducing new wrappers or changing navigation behavior.
- Use the existing design tokens in `src/styles/index.css` for colors, borders, surfaces, and responsive breakpoints. Race-specific presentation belongs in `RaceDisplay.css`, and planner/select presentation belongs in `PvpPlanner.css` or the existing `react-select` style configuration.
- Keep the race date presentation borderless and lightweight; status, day, month, and year are styled as one date treatment rather than separate boxed badges.
- Tests are intentionally kept outside `src`; when adding tests, place them in `tests/unit` and rely on the shared jsdom setup rather than adding per-file environment setup.

## Browser tooling

When browser-level inspection or end-to-end coverage is needed, use the repository Playwright MCP configuration in `.vscode/mcp.json`. Start the Vite app with `npm run dev` before using the browser tools, and use the existing routes and event-selection flow when checking the rendered UI.
