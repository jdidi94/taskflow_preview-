/* Color utility functions for theme management */

export const hexToHsl = (hex: string): { h: number; s: number; l: number } => {
  hex = hex.replace('#', '')

  const r = parseInt(hex.substring(0, 2), 16) / 255
  const g = parseInt(hex.substring(2, 4), 16) / 255
  const b = parseInt(hex.substring(4, 6), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      case b:
        h = (r - g) / d + 4
        break
    }
    h /= 6
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  }
}

export const hslToCss = (h: number, s: number, l: number): string => `${h} ${s}% ${l}%`

export const hexToCssHsl = (hex: string): string => {
  const { h, s, l } = hexToHsl(hex)
  return hslToCss(h, s, l)
}

export const lightenColor = (hex: string, amount: number): string => {
  const { h, s, l } = hexToHsl(hex)
  return hslToCss(h, s, Math.min(100, l + amount))
}

export const darkenColor = (hex: string, amount: number): string => {
  const { h, s, l } = hexToHsl(hex)
  return hslToCss(h, s, Math.max(0, l - amount))
}

export const saturateColor = (hex: string, amount: number): string => {
  const { h, s, l } = hexToHsl(hex)
  return hslToCss(h, Math.min(100, s + amount), l)
}

export const desaturateColor = (hex: string, amount: number): string => {
  const { h, s, l } = hexToHsl(hex)
  return hslToCss(h, Math.max(0, s - amount), l)
}
