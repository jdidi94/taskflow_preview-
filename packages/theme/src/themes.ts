export type ThemeMode = 'light' | 'dark'
export type GradientPalette = 'orange' | 'purple' | 'green' | 'blue'

export const themes: Record<ThemeMode, Record<string, string>> = {
  light: {
    '--background': '0 0% 99%',
    '--foreground': '222.2 84% 4.9%',
    '--card': '0 0% 100%',
    '--card-foreground': '222.2 84% 4.9%',
    '--popover': '0 0% 100%',
    '--popover-foreground': '222.2 84% 4.9%',
    '--primary': '201 100% 44%',
    '--primary-foreground': '0 0% 100%',
    '--secondary': '210 40% 96%',
    '--secondary-foreground': '222.2 84% 4.9%',
    '--muted': '210 40% 92%',
    '--muted-foreground': '215.4 16.3% 46.9%',
    '--accent': '170 100% 45%',
    '--accent-foreground': '222.2 84% 4.9%',
    '--destructive': '0 84.2% 60.2%',
    '--destructive-foreground': '210 40% 98%',
    '--border': '214.3 31.8% 85%',
    '--input': '214.3 31.8% 91.4%',
    '--ring': '201 100% 44%',
    '--radius': '0.75rem',
    '--success': '142 76% 36%',
    '--warning': '38 92% 50%',
    '--error': '0 84% 60%',
    '--info': '201 100% 44%',
    '--scrollbar-track': '210 40% 96%',
    '--scrollbar-thumb': '215 20% 65%',
    '--scrollbar-thumb-hover': '215 25% 55%',
    '--scrollbar-corner': '210 40% 96%',
    '--gradient-primary': '201 100% 44%',
    '--gradient-secondary': '170 100% 45%',
    '--gradient-accent': '170 100% 45%',
    '--gradient-muted': '210 40% 96%',
  },
  dark: {
    '--background': '0 0% 10%',
    '--foreground': '0 0% 100%',
    '--card': '0 0% 10%',
    '--card-foreground': '0 0% 100%',
    '--popover': '0 0% 16%',
    '--popover-foreground': '0 0% 100%',
    '--primary': '201 100% 44%',
    '--primary-foreground': '0 0% 100%',
    '--secondary': '0 0% 16%',
    '--secondary-foreground': '0 0% 100%',
    '--muted': '0 0% 16%',
    '--muted-foreground': '215 20.2% 65.1%',
    '--accent': '170 100% 45%',
    '--accent-foreground': '0 0% 0%',
    '--destructive': '0 62.8% 30.6%',
    '--destructive-foreground': '0 0% 100%',
    '--border': '0 0% 16%',
    '--input': '0 0% 16%',
    '--ring': '201 100% 44%',
    '--radius': '0.5rem',
    '--success': '142 76% 36%',
    '--warning': '38 92% 50%',
    '--error': '0 84% 60%',
    '--info': '201 100% 44%',
    '--scrollbar-track': '0 0% 16%',
    '--scrollbar-thumb': '0 0% 30%',
    '--scrollbar-thumb-hover': '0 0% 40%',
    '--scrollbar-corner': '0 0% 16%',
    '--gradient-primary': '201 100% 44%',
    '--gradient-secondary': '170 100% 45%',
    '--gradient-accent': '0 0% 30%',
    '--gradient-muted': '0 0% 16%',
  },
}

const gradientPalettes: Record<
  GradientPalette,
  { primary: string; secondary: string; accent: string }
> = {
  orange: { primary: '0 84% 60%', secondary: '24 100% 50%', accent: '24 100% 50%' },
  purple: { primary: '270 90% 60%', secondary: '320 85% 65%', accent: '320 85% 65%' },
  green: { primary: '140 70% 25%', secondary: '142 70% 60%', accent: '142 70% 60%' },
  blue: { primary: '201 100% 44%', secondary: '190 100% 50%', accent: '190 100% 50%' },
}

export const applyGradientPalette = (
  vars: Record<string, string>,
  palette?: GradientPalette,
): void => {
  if (!palette) return
  const p = gradientPalettes[palette]
  vars['--gradient-primary'] = p.primary
  vars['--gradient-secondary'] = p.secondary
  vars['--gradient-accent'] = p.accent
}

const toHslString = (color: string): string | null => {
  if (!color) return null
  if (color.startsWith('hsl(') && color.endsWith(')')) {
    return color.slice(4, -1).trim()
  }
  if (color.startsWith('#')) {
    const hex = color.slice(1)
    let r: number
    let g: number
    let b: number
    if (hex.length === 3) {
      r = parseInt(hex[0] + hex[0], 16)
      g = parseInt(hex[1] + hex[1], 16)
      b = parseInt(hex[2] + hex[2], 16)
    } else if (hex.length === 6) {
      r = parseInt(hex.slice(0, 2), 16)
      g = parseInt(hex.slice(2, 4), 16)
      b = parseInt(hex.slice(4, 6), 16)
    } else {
      return null
    }
    return rgbToHslString(r, g, b)
  }
  if (color.startsWith('rgb(') && color.endsWith(')')) {
    const values = color.slice(4, -1).split(',').map((v) => v.trim())
    if (values.length < 3) return null
    return rgbToHslString(
      parseInt(values[0], 10),
      parseInt(values[1], 10),
      parseInt(values[2], 10),
    )
  }
  return null
}

const rgbToHslString = (r: number, g: number, b: number): string => {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0)
        break
      case gn:
        h = (bn - rn) / d + 2
        break
      case bn:
        h = (rn - gn) / d + 4
        break
    }
    h /= 6
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
}

const hslForegroundFor = (hsl: string): string => {
  try {
    const parts = hsl.split(' ').map((p) => p.replace('%', ''))
    const lightness = parseFloat(parts[2])
    return lightness > 60 ? '222.2 84% 4.9%' : '0 0% 100%'
  } catch {
    return '0 0% 100%'
  }
}

const applyScrollbarStyles = (): void => {
  const scrollbarStyles = `
    ::-webkit-scrollbar { width: 12px; height: 12px; }
    ::-webkit-scrollbar-track { background: hsl(var(--scrollbar-track)); border-radius: 6px; }
    ::-webkit-scrollbar-thumb {
      background: hsl(var(--scrollbar-thumb));
      border-radius: 6px;
      border: 2px solid hsl(var(--scrollbar-track));
    }
    ::-webkit-scrollbar-thumb:hover { background: hsl(var(--scrollbar-thumb-hover)); }
    ::-webkit-scrollbar-corner { background: hsl(var(--scrollbar-corner)); }
    * {
      scrollbar-width: thin;
      scrollbar-color: hsl(var(--scrollbar-thumb)) hsl(var(--scrollbar-track));
    }
  `
  const existing = document.getElementById('theme-scrollbar-styles')
  if (existing) existing.remove()
  const styleElement = document.createElement('style')
  styleElement.id = 'theme-scrollbar-styles'
  styleElement.textContent = scrollbarStyles
  document.head.appendChild(styleElement)
}

export const applyTheme = (
  theme: ThemeMode,
  userPrimaryColor?: string | null,
  gradientPalette?: GradientPalette,
): void => {
  const root = document.documentElement
  const themeVars = { ...themes[theme] }
  applyGradientPalette(themeVars, gradientPalette)

  if (userPrimaryColor) {
    try {
      const hsl = toHslString(userPrimaryColor)
      if (hsl) {
        themeVars['--primary'] = hsl
        themeVars['--accent'] = hsl
        themeVars['--ring'] = hsl
        const hue = parseFloat(hsl.split(' ')[0])
        const isPurple = !Number.isNaN(hue) && hue >= 240 && hue <= 320
        const fg = isPurple ? '0 0% 100%' : hslForegroundFor(hsl)
        themeVars['--primary-foreground'] = fg
        themeVars['--accent-foreground'] = fg
      }
    } catch {
      console.warn('Invalid user primary color:', userPrimaryColor)
    }
  }

  Object.entries(themeVars).forEach(([key, value]) => {
    root.style.setProperty(key, value)
  })
  root.setAttribute('data-theme', theme)
  applyScrollbarStyles()
}
