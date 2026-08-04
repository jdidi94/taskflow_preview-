import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import { Strategy as GitHubStrategy } from 'passport-github2'
import { env } from './env.js'
import { User } from '../models/User.js'

let initialized = false

async function findOrCreateOAuthUser(input: {
  provider: 'google' | 'github'
  providerId: string
  email?: string
  name?: string
}) {
  const providerField = input.provider === 'google' ? 'googleId' : 'githubId'
  const providerFlag = input.provider

  let user =
    (await User.findOne({ [providerField]: input.providerId })) ??
    (input.email ? await User.findOne({ email: input.email }) : null)

  if (!user) {
    user = await User.create({
      name: input.name || input.email?.split('@')[0] || `${input.provider} user`,
      email: input.email || `${input.provider}-${input.providerId}@local.taskflow`,
      password: undefined,
      emailVerified: Boolean(input.email),
      [providerField]: input.providerId,
      oauthProviders: [providerFlag],
      hasOAuthProviders: true,
    })
    return user
  }

  ;(user as any)[providerField] = input.providerId
  user.hasOAuthProviders = true
  const currentProviders = new Set((user.oauthProviders ?? []) as Array<'github' | 'google'>)
  currentProviders.add(providerFlag)
  user.oauthProviders = Array.from(currentProviders) as Array<'github' | 'google'>
  if (!user.name && input.name) user.name = input.name
  if (!user.email && input.email) user.email = input.email
  if (input.email) user.emailVerified = true
  await user.save()
  return user
}

export function setupPassport(): typeof passport {
  if (initialized) return passport
  initialized = true

  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: env.GOOGLE_CLIENT_ID,
          clientSecret: env.GOOGLE_CLIENT_SECRET,
          callbackURL: env.GOOGLE_CALLBACK_URL,
        },
        async (
          _accessToken: string,
          _refreshToken: string,
          profile: any,
          done: (error: Error | null, user?: Express.User | false) => void,
        ) => {
          try {
            const email = profile.emails?.[0]?.value
            const user = await findOrCreateOAuthUser({
              provider: 'google',
              providerId: profile.id,
              email,
              name: profile.displayName,
            })
            done(null, user)
          } catch (error) {
            done(error as Error)
          }
        },
      ),
    )
  }

  if (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) {
    passport.use(
      new GitHubStrategy(
        {
          clientID: env.GITHUB_CLIENT_ID,
          clientSecret: env.GITHUB_CLIENT_SECRET,
          callbackURL: env.GITHUB_CALLBACK_URL,
          scope: ['user:email'],
        },
        async (
          _accessToken: string,
          _refreshToken: string,
          profile: any,
          done: (error: Error | null, user?: Express.User | false) => void,
        ) => {
          try {
            const primaryEmail =
              profile.emails?.find((item: any) => item.primary)?.value ?? profile.emails?.[0]?.value
            const user = await findOrCreateOAuthUser({
              provider: 'github',
              providerId: profile.id,
              email: primaryEmail,
              name: profile.displayName || profile.username,
            })
            done(null, user)
          } catch (error) {
            done(error as Error)
          }
        },
      ),
    )
  }

  return passport
}

export function getPassportStrategyStatus() {
  return {
    google: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
    github: Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET),
  }
}

