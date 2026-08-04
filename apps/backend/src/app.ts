import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import passport from 'passport'
import { env } from './config/env.js'
import { setupPassport } from './config/passport.js'
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js'
import { healthRouter } from './routes/health.routes.js'
import { meRouter } from './routes/me.routes.js'
import { authRouter } from './routes/auth.routes.js'
import { adminRouter } from './routes/admin.routes.js'
import { adminManagementRouter } from './routes/adminManagement.routes.js'
import { twoFactorAuthRouter } from './routes/twoFactorAuth.routes.js'
import { workspaceRouter } from './routes/workspace.routes.js'
import { invitationRouter } from './routes/invitation.routes.js'
import { spaceRouter } from './routes/space.routes.js'
import { boardRouter } from './routes/board.routes.js'
import { taskRouter } from './routes/task.routes.js'
import { analyticsRouter } from './routes/analytics.routes.js'
import { githubRouter } from './routes/github.routes.js'
import { integrationRouter } from './routes/integration.routes.js'
import { aiTokenRouter } from './routes/aiToken.routes.js'
import { aiRouter } from './routes/ai.routes.js'
import { chatRouter } from './routes/chat.routes.js'
import { fileRouter } from './routes/file.routes.js'
import { notificationRouter } from './routes/notification.routes.js'
import { reminderRouter } from './routes/reminder.routes.js'
import { templateRouter } from './routes/template.routes.js'
import { checkoutRouter } from './routes/checkout.routes.js'
import { userRouter } from './routes/user.routes.js'
import { quotaRouter } from './routes/quota.routes.js'

export function createApp() {
  const app = express()
  setupPassport()

  app.use(helmet())
  app.use(
    cors({
      origin: env.isDev ? true : env.corsOrigins,
      credentials: true,
    }),
  )
  app.use(express.json({ limit: '2mb' }))
  app.use(morgan(env.isDev ? 'dev' : 'combined'))
  app.use(passport.initialize())

  app.use('/api/health', healthRouter)
  app.use('/api/me', meRouter)
  app.use('/api/auth', authRouter)
  app.use('/api/admin/quotas', quotaRouter)
  app.use('/api/admin/ai-tokens', aiTokenRouter)
  app.use('/api/admin', adminRouter)
  app.use('/api/admin-management', adminManagementRouter)
  app.use('/api/2fa', twoFactorAuthRouter)
  app.use('/api/workspaces', workspaceRouter)
  app.use('/api/invitations', invitationRouter)
  app.use('/api/spaces', spaceRouter)
  app.use('/api/boards', boardRouter)
  app.use('/api/tasks', taskRouter)
  app.use('/api/analytics', analyticsRouter)
  app.use('/api/ai', aiRouter)
  app.use('/api/github', githubRouter)
  app.use('/api/integrations', integrationRouter)
  app.use('/api/checkout', checkoutRouter)
  app.use('/api/users', userRouter)
  app.use('/api/chat', chatRouter)
  app.use('/api/files', fileRouter)
  app.use('/api/notifications', notificationRouter)
  app.use('/api/reminders', reminderRouter)
  app.use('/api/templates', templateRouter)

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
