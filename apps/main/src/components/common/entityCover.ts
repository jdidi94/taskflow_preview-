/** Deterministic cover gradients from entity id/name (theme-friendly, not purple-default). */
const COVERS = [
  'from-emerald-700/90 via-teal-800/80 to-slate-900/90',
  'from-sky-700/90 via-cyan-800/75 to-slate-900/90',
  'from-amber-700/85 via-orange-800/70 to-stone-900/90',
  'from-rose-800/85 via-red-900/70 to-stone-950/90',
  'from-indigo-800/85 via-slate-800/80 to-zinc-950/90',
  'from-lime-800/80 via-green-900/75 to-neutral-950/90',
  'from-fuchsia-900/80 via-violet-950/70 to-zinc-950/90',
  'from-cyan-900/85 via-blue-950/75 to-slate-950/90',
] as const

export function entityCoverGradient(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  }
  return COVERS[hash % COVERS.length]!
}
