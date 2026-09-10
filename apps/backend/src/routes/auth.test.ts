import request from 'supertest'
import { describe, expect, it } from 'vitest'

import { createApp } from '../app.js'

const password = 'Password1!'

describe('auth register/login', () => {
  const app = createApp()
  const email = `phase7-${Date.now()}@example.com`

  it('registers a new user', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Phase Seven',
      email,
      password,
    })
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.token).toEqual(expect.any(String))
    expect(res.body.user).toMatchObject({
      email,
      name: 'Phase Seven',
    })
  })

  it('logs in with the same credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email,
      password,
    })
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.token).toEqual(expect.any(String))
    expect(res.body.user.email).toBe(email)
  })

  it('rejects invalid login', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email,
      password: 'WrongPass1!',
    })
    expect(res.status).toBeGreaterThanOrEqual(400)
    expect(res.body.success).toBe(false)
  })
})
