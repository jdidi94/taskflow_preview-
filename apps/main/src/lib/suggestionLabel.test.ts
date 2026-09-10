import { describe, expect, it } from 'vitest'

import { suggestionLabel } from './suggestionLabel'

describe('suggestionLabel', () => {
  it('returns trimmed strings', () => {
    expect(suggestionLabel('  hello  ')).toBe('hello')
  })

  it('coerces object suggestions to a readable label', () => {
    expect(suggestionLabel({ title: 'Ship it' })).toBe('Ship it')
    expect(suggestionLabel({ prompt: 'Add a column' })).toBe('Add a column')
    expect(suggestionLabel({ description: 'tonight only' })).toBe('tonight only')
  })

  it('returns empty for unsupported values', () => {
    expect(suggestionLabel(null)).toBe('')
    expect(suggestionLabel({})).toBe('')
  })
})
