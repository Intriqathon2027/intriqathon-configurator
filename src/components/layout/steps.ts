import { KeyRound, Settings2, ShieldCheck, Rocket, Globe } from 'lucide-react'
import type { Config } from '../../context/AppContext'

export interface Step {
  labelKey: string
  /** Icon component — rendered in the sidebar and in the page header. */
  Icon: typeof KeyRound
  /**
   * Config fields that must all be filled for the step to count as complete.
   * An empty list means the step is validated by an action instead (see
   * `actionSteps` in AppContext).
   */
  requiredFields: (keyof Config)[]
}

export const steps: Step[] = [
  {
    labelKey: 'step1.label',
    Icon: KeyRound,
    requiredFields: [
      'SUPABASE_ACCESS_TOKEN', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY',
      'RESEND_API_KEY',
      'DOMAIN', 'SPACESHIP_API_KEY', 'SPACESHIP_API_SECRET',
      'SCW_SECRET_KEY', 'SCW_DEFAULT_PROJECT_ID', 'DEPLOY_PATH',
    ],
  },
  {
    labelKey: 'step2.label',
    Icon: Settings2,
    requiredFields: [
      'SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY',
      'DATABASE_URL', 'DIRECT_URL',
      'IPV4_INSTANCE',
      'FROM_EMAIL', 'ALLOWED_EMAILS',
    ],
  },
  {
    labelKey: 'step3.label',
    Icon: ShieldCheck,
    requiredFields: [
      'DISCORD_CLIENT_ID', 'OAUTH2_DISCORD_CLIENT_SECRET',
      'GITHUB_CLIENT_ID', 'OAUTH2_GITHUB_CLIENT_SECRET',
      'CLIENT_ID', 'BOT_TOKEN', 'DEV_SERVER_ID', 'GUILD_ID',
    ],
  },
  // Validated by a successful deployment
  { labelKey: 'step4.label', Icon: Rocket, requiredFields: [] },
  // Validated by a successful Docker restart
  { labelKey: 'step5.label', Icon: Globe, requiredFields: [] },
]
