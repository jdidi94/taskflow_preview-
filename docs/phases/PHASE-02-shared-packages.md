# Phase 2 — Shared packages (web-only)

**Status:** Done  
**Completed:** 2026-08-04

## Goal

Rebuild shared layer without React Native.

## What shipped

### `@taskflow/theme`
- Ported tokens, color utils, theme apply/manager, `ThemeProvider` / `useTheme` / `ThemeToggle`
- React 19 peer deps only
- [`variables.css`](../../packages/theme/src/variables.css) with CSS variables + Tailwind 4 mapping notes

### `@taskflow/utils`
- Ported `formatDate`, `helpers`, `validation`
- Added `zod` + starter schemas in `schemas/common.ts`

### `@taskflow/ui` (minimal kit)
- CSS-variable components (no Tailwind required yet): `Button`, `Input`, `Modal`, `Badge`, `Loading`/`Spinner`, `Alert`, `Card`
- `cn` helper via `clsx`
- Icons via `lucide-react` (web only)
- No `react-native` / `Mobile.tsx`

### `@taskflow/config`
- Shared Prettier config (`@taskflow/config/prettier`)
- ESLint 9 flat config starter (`@taskflow/config/eslint`)
- TS notes in `tsconfig.notes.md`

### Apps
- `main` and `admin` depend on theme/ui/utils
- Phase 2 demo pages prove imports + theme toggle

## Exit checks

- [x] Packages type-check independently
- [x] Main and admin import `@taskflow/ui` and `@taskflow/theme` (production build OK)
- [x] Zero React Native dependencies in these packages

## Next

→ [PHASE-03-backend-foundation.md](./PHASE-03-backend-foundation.md)
