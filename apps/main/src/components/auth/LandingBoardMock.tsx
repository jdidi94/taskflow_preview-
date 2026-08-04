import { motion } from 'framer-motion'

import { useI18n } from '@/i18n'
import type { MessageKey } from '@/i18n'

type MockTask = {
  titleKey: MessageKey
  accent: string
}

type MockColumn = {
  titleKey: MessageKey
  tasks: MockTask[]
}

const columns: MockColumn[] = [
  {
    titleKey: 'landing.mockColTodo',
    tasks: [
      { titleKey: 'landing.mockTaskBrief', accent: 'hsl(var(--primary))' },
      { titleKey: 'landing.mockTaskResearch', accent: 'hsl(var(--muted-foreground))' },
    ],
  },
  {
    titleKey: 'landing.mockColDoing',
    tasks: [
      { titleKey: 'landing.mockTaskWireframes', accent: 'hsl(var(--primary))' },
      { titleKey: 'landing.mockTaskCopy', accent: 'hsl(35 70% 45%)' },
      { titleKey: 'landing.mockTaskApi', accent: 'hsl(var(--muted-foreground))' },
    ],
  },
  {
    titleKey: 'landing.mockColDone',
    tasks: [
      { titleKey: 'landing.mockTaskKickoff', accent: 'hsl(150 45% 38%)' },
      { titleKey: 'landing.mockTaskScope', accent: 'hsl(150 45% 38%)' },
    ],
  },
]

export function LandingBoardMock() {
  const { t } = useI18n()

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
      initial={{ opacity: 0, scale: 1.03 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.95, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_40%,hsl(var(--primary)/0.14),transparent_55%),radial-gradient(ellipse_at_20%_90%,hsl(var(--muted-foreground)/0.08),transparent_45%)]" />

      <div
        className="absolute inset-y-0 end-0 flex w-full items-end justify-end pe-0 ps-6 pt-28 sm:ps-10 lg:w-[62%] lg:items-center lg:ps-0 lg:pt-16"
      >
        <div
          className="relative mb-[-8%] me-[-6%] w-[min(44rem,118%)] origin-bottom-end scale-[0.92] sm:mb-[-4%] sm:me-[-4%] sm:scale-100 lg:mb-0 lg:me-[-8%] lg:w-[min(52rem,110%)] lg:origin-center lg:scale-[1.05] lg:rotate-[-1.5deg]"
        >
          <div className="overflow-hidden rounded-s-2xl border border-border/60 border-e-0 bg-card/90 shadow-[0_24px_80px_-24px_rgb(0_0_0_/0.35)] backdrop-blur-sm">
            <div className="flex items-center justify-between gap-3 border-b border-border/50 px-4 py-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                <span className="truncate font-display text-sm font-semibold tracking-tight">
                  {t('landing.mockBoardTitle')}
                </span>
              </div>
              <div className="flex gap-1.5">
                <span className="h-2 w-8 rounded-full bg-muted" />
                <span className="h-2 w-5 rounded-full bg-muted" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 bg-muted/30 p-3 sm:gap-4 sm:p-4">
              {columns.map((column) => (
                <div
                  key={column.titleKey}
                  className="flex min-w-0 flex-col gap-2 rounded-xl border border-border/40 bg-background/80 p-2 sm:p-2.5"
                >
                  <div className="flex items-center justify-between gap-1 px-0.5">
                    <span className="truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:text-xs">
                      {t(column.titleKey)}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{column.tasks.length}</span>
                  </div>
                  {column.tasks.map((task) => (
                    <div
                      key={task.titleKey}
                      className="rounded-lg border border-border/50 bg-card px-2 py-2 shadow-sm sm:px-2.5"
                      style={{ borderInlineStartWidth: 3, borderInlineStartColor: task.accent }}
                    >
                      <p className="truncate text-[11px] font-medium leading-snug sm:text-xs">
                        {t(task.titleKey)}
                      </p>
                      <div className="mt-2 flex gap-1">
                        <span className="h-1.5 w-8 rounded-full bg-muted" />
                        <span className="h-1.5 w-4 rounded-full bg-muted" />
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
