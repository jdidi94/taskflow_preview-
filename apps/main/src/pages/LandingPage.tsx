import { LandingFeatures } from '@/components/auth/LandingFeatures'
import { LandingFooter } from '@/components/auth/LandingFooter'
import { LandingHero } from '@/components/auth/LandingHero'

export function LandingPage() {
  return (
    <div className="bg-background text-foreground">
      <LandingHero />
      <LandingFeatures />
      <LandingFooter />
    </div>
  )
}
