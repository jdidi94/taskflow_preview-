import rateLimit from 'express-rate-limit'

import { env } from '../config/env.js'

/** Skip aggressive limits in automated tests. */
function skipInTest() {
  return env.isTest
}

export const globalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.isDev ? 2000 : 600,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: skipInTest,
  message: { success: false, message: 'Too many requests, please try again later' },
})

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.isDev ? 200 : 40,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: skipInTest,
  message: { success: false, message: 'Too many auth attempts, please try again later' },
})

export const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: env.isDev ? 60 : 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: skipInTest,
  message: { success: false, message: 'Too many contact submissions, please try again later' },
})

export const checkoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.isDev ? 100 : 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: skipInTest,
  message: { success: false, message: 'Too many checkout requests, please try again later' },
})

export const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.isDev ? 300 : 80,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: skipInTest,
  message: { success: false, message: 'AI rate limit exceeded, please try again later' },
})

export const filesLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.isDev ? 300 : 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: skipInTest,
  message: { success: false, message: 'Too many file requests, please try again later' },
})
