# Shared TypeScript notes

Apps and packages should extend the monorepo root:

```json
{
  "extends": "../../tsconfig.base.json"
}
```

Root file: `/tsconfig.base.json` (strict, ES2022).

Path aliases (when needed) belong in each app's `vite.config.ts` + `tsconfig`, not here.
