import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { applyTheme, type ThemeMode } from './themes'

interface ThemeContextType {
  theme: ThemeMode
  setTheme: (theme: ThemeMode) => void
  toggleTheme: () => void
  setUserPrimaryColor: (color: string) => void
  userPrimaryColor: string | null
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

interface ThemeProviderProps {
  children: ReactNode
  defaultTheme?: ThemeMode
  storageKey?: string
  userPrimaryColor?: string
}

export function ThemeProvider({
  children,
  defaultTheme = 'light',
  storageKey = 'taskflow-theme',
  userPrimaryColor: initialUserColor,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemeMode>(defaultTheme)
  const [userPrimaryColor, setUserPrimaryColorState] = useState<string | null>(
    initialUserColor || null,
  )

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem(storageKey) as ThemeMode | null
      const savedUserColor = localStorage.getItem('taskflow-user-primary-color')

      if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
        setThemeState(savedTheme)
        applyTheme(savedTheme, savedUserColor)
      } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        const initialTheme: ThemeMode = prefersDark ? 'dark' : 'light'
        setThemeState(initialTheme)
        applyTheme(initialTheme, savedUserColor)
      }

      if (savedUserColor) {
        setUserPrimaryColorState(savedUserColor)
      }
    } catch (error) {
      console.warn('Failed to load theme preferences:', error)
      applyTheme(defaultTheme, initialUserColor)
    }
  }, [storageKey, defaultTheme, initialUserColor])

  const setTheme = (newTheme: ThemeMode) => {
    try {
      setThemeState(newTheme)
      localStorage.setItem(storageKey, newTheme)
      applyTheme(newTheme, userPrimaryColor)
    } catch (error) {
      console.warn('Failed to save theme preference:', error)
    }
  }

  const setUserPrimaryColor = (color: string) => {
    try {
      setUserPrimaryColorState(color)
      localStorage.setItem('taskflow-user-primary-color', color)
      applyTheme(theme, color)
    } catch (error) {
      console.warn('Failed to save user primary color:', error)
    }
  }

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light')
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
        setUserPrimaryColor,
        userPrimaryColor,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={className}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '2.5rem',
        padding: '0 1rem',
        borderRadius: 'var(--radius, 0.5rem)',
        border: '1px solid hsl(var(--border))',
        background: 'hsl(var(--secondary))',
        color: 'hsl(var(--secondary-foreground))',
        cursor: 'pointer',
      }}
    >
      {theme === 'light' ? 'Dark' : 'Light'}
    </button>
  )
}
