# Contributing to MermaidStudio

Thanks for taking the time to contribute! MermaidStudio is a fully client-side
Mermaid diagram editor (React 19 + Vite), and external contributions are welcome.

## Issue first

Please **open an issue before submitting a pull request** for anything that is
not a trivial bug fix:

- **Bug** → open a bug report ([template](.github/ISSUE_TEMPLATE/bug_report.yml)).
  A fix PR may reference it with `Fixes #NNN`.
- **Feature / enhancement** → open an issue describing the problem and the
  proposed scope. Wait for a maintainer's approval before starting the PR —
  this avoids wasted work on changes that may be declined or reshaped.

PRs without a linked issue (except tiny bug fixes) may be closed after review.

## Development setup

Requirements: **Node.js >= 24** and **pnpm 10**. The `packageManager` field in
`package.json` pins pnpm — if you have a newer global pnpm, it will
self-align to the pinned version inside this repository.

```bash
pnpm install
pnpm dev          # Vite dev server on :5173
```

Useful scripts:

```bash
pnpm lint            # OxLint
pnpm type-check      # tsc --noEmit
pnpm test            # Vitest (watch)
pnpm test:coverage   # CI thresholds: lines 65 / fn 64 / branches 59 / stmt 62
pnpm test:e2e        # Playwright (chromium + firefox + webkit)
```

## Conventions

- **Commits**: [Conventional Commits](https://www.conventionalcommits.org/)
  enforced by commitlint — `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`.
  Keep the header ≤ 72 characters.
- **Tests** live next to the code in `__tests__/` directories
  (`ComponentName.test.tsx` / `hookName.test.ts`).
- **Styling**: Tailwind utility classes only (no CSS modules /
  styled-components); themes via CSS variables and the `dark:` prefix.
- **Security**: all Mermaid SVG output is sanitized through DOMPurify
  (`src/utils/sanitization.ts`) before rendering — never bypass it.
- **i18n**: user-facing strings go through i18next (`src/i18n/`, `en` + `fr`).
- **State**: prefer colocated hooks under `src/hooks/` over expanding the
  `AppLayout`/`ModalProvider` prop lists.

## Pull requests

1. Branch from `main` **in your fork with a descriptive branch name**
   (not your fork's `main` — otherwise every future commit of your fork
   lands in the PR).
2. Keep one concern per PR; no unrelated formatting churn.
3. Make sure lint, type-check, tests and the CI checks pass.
4. Link the issue (`Closes #NNN` / `Fixes #NNN`) so it closes on merge.

## License

By contributing, you agree that your contributions will be licensed under
the project's license.
