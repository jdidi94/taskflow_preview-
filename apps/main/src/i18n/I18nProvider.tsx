import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { ar } from '@/i18n/locales/ar'
import { en } from '@/i18n/locales/en'
import { fr } from '@/i18n/locales/fr'
import type { Locale, MessageKey, MessageTree } from '@/i18n/types'

const STORAGE_KEY = 'taskflow-language'

const catalogs: Record<Locale, MessageTree> = { en, fr, ar }

function isLocale(value: string | null | undefined): value is Locale {
  return value === 'en' || value === 'fr' || value === 'ar'
}

function detectLocale(): Locale {
  if (typeof window === 'undefined') return 'en'
  const stored = localStorage.getItem(STORAGE_KEY)
  if (isLocale(stored)) return stored

  const nav = (navigator.language || 'en').toLowerCase()
  if (nav.startsWith('fr')) return 'fr'
  if (nav.startsWith('ar')) return 'ar'
  return 'en'
}

function directionFor(locale: Locale): 'ltr' | 'rtl' {
  return locale === 'ar' ? 'rtl' : 'ltr'
}

function resolveMessage(tree: MessageTree, key: MessageKey): string {
  const [ns, leaf] = key.split('.') as [keyof MessageTree, string]
  const group = tree[ns] as Record<string, string> | undefined
  return group?.[leaf] ?? key
}

function interpolate(template: string, vars?: Record<string, string | number>) {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    vars[name] !== undefined ? String(vars[name]) : `{${name}}`,
  )
}

type I18nContextValue = {
  locale: Locale
  dir: 'ltr' | 'rtl'
  isRTL: boolean
  setLocale: (locale: Locale) => void
  t: (key: MessageKey, vars?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => detectLocale())

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    localStorage.setItem(STORAGE_KEY, next)
  }, [])

  useEffect(() => {
    const dir = directionFor(locale)
    document.documentElement.lang = locale
    document.documentElement.dir = dir
    document.documentElement.setAttribute('data-text-direction', dir)
  }, [locale])

  const value = useMemo<I18nContextValue>(() => {
    const dir = directionFor(locale)
    return {
      locale,
      dir,
      isRTL: dir === 'rtl',
      setLocale,
      t: (key, vars) => interpolate(resolveMessage(catalogs[locale], key), vars),
    }
  }, [locale, setLocale])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}

export const locales: { code: Locale; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'ar', label: 'العربية' },
]
