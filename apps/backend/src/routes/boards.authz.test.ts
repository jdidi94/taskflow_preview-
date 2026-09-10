import request from 'supertest'
import { describe, expect, it } from 'vitest'

import { createApp } from '../app.js'

describe('boards authz', () => {
  const app = createApp()

  it('rejects unauthenticated board access', async () => {
    const res = await request(app).get('/api/boards/000000000000000000000000')
    expect(res.status).toBe(401)
    expect(res.body.success).toBe(false)
  })

  it('rejects unauthenticated task list', async () => {
    const res = await request(app).get('/api/tasks/board/000000000000000000000000')
    expect([401, 404]).toContain(res.status)
    expect(res.body.success).toBe(false)
  })
})
