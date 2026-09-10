import pino from 'pino'

import { env } from './env.js'

const level = env.LOG_LEVEL || 'info'

export const logger = pino({
  level,
  base: { service: 'taskflow-api' },
  ...(env.isDev
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname,service',
          },
        },
      }
    : {}),
})

export type Logger = typeof logger
