import request from 'supertest'
import { describe, expect, it } from 'vitest'

import { createApp } from '../app.js'
import { getMongoStatus } from '../config/db.js'

describe('GET /api/health', () => {
  const app = createApp()

  it('returns ok when mongo is connected', async () => {
    expect(getMongoStatus()).toBe('up')
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      status: 'ok',
      version: '3.0.0',
      mongo: 'up',
    })
  })
})
