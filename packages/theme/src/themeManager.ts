import { hexToCssHsl, lightenColor, darkenColor } from './colorUtils'
import { themes, type ThemeMode } from './themes'

export interface UserThemePreferences {
  mode: 'light' | 'dark' | 'system'
  primaryColor?: string
  accentColor?: string
  sidebarCollapsed?: boolean
}

export interface ThemeConfig {
  mode: ThemeMode
  primaryColor?: string
  accentColor?: string
}

export const generateThemeWithCustomColors = (
  baseTheme: ThemeMode,
  primaryColor?: string,
  accentColor?: string,
): Record<string, string> => {
  const customTheme: Record<string, string> = { ...themes[baseTheme] }

  if (primaryColor) {
    const primaryHsl = hexToCssHsl(primaryColor)
    customTheme['--primary'] = primaryHsl
    customTheme['--ring'] = primaryHsl
    customTheme['--gradient-primary'] = primaryHsl
    customTheme['--primary-lighter'] = lightenColor(primaryColor, 10)
    customTheme['--primary-darker'] = darkenColor(primaryColor, 10)
  }

  if (accentColor) {
    const accentHsl = hexToCssHsl(accentColor)
    customTheme['--accent'] = accentHsl
    customTheme['--gradient-secondary'] = accentHsl
    customTheme['--gradient-accent'] = accentHsl
  }

  return customTheme
}

export const applyCustomTheme = (config: ThemeConfig): void => {
  const { mode, primaryColor, accentColor } = config
  const root = document.documentElement
  const themeVars = generateThemeWithCustomColors(mode, primaryColor, accentColor)

  Object.entries(themeVars).forEach(([key, value]) => {
    root.style.setProperty(key, value)
  })
  root.setAttribute('data-theme', mode)
}

export const getSystemTheme = (): ThemeMode =>
  window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'

export const resolveThemeMode = (mode: 'light' | 'dark' | 'system'): ThemeMode =>
  mode === 'system' ? getSystemTheme() : mode

export const listenForSystemThemeChanges = (
  callback: (theme: ThemeMode) => void,
): (() => void) => {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  const handleChange = (e: MediaQueryListEvent) => {
    callback(e.matches ? 'dark' : 'light')
  }
  mediaQuery.addEventListener('change', handleChange)
  return () => mediaQuery.removeEventListener('change', handleChange)
}
