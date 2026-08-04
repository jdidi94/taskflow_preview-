/** Theme-token gradients for template covers (no off-brand purple stacks). */
const CATEGORY_COVER: Record<string, string> = {
  marketing: 'from-accent/90 via-primary/55 to-primary',
  development: 'from-info/80 via-primary/60 to-primary',
  design: 'from-secondary via-accent/50 to-primary/80',
  sales: 'from-warning/70 via-primary/50 to-primary',
  support: 'from-success/70 via-primary/45 to-primary',
  operations: 'from-muted-foreground/35 via-primary/50 to-primary',
  hr: 'from-accent/60 via-info/40 to-primary',
  finance: 'from-success/50 via-warning/40 to-primary',
  general: 'from-primary/35 via-primary/65 to-primary',
  custom: 'from-muted-foreground/30 via-accent/45 to-primary',
  board: 'from-primary/40 via-primary/70 to-primary',
  space: 'from-accent/70 via-primary/50 to-primary',
  workflow: 'from-info/60 via-accent/40 to-primary',
}

export function templateCoverGradient(category?: string | null, type?: string | null): string {
  const key = (category ?? type ?? 'general').trim().toLowerCase()
  return CATEGORY_COVER[key] ?? CATEGORY_COVER.general
}
