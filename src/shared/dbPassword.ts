/**
 * Rules for the Supabase database password.
 *
 * Two sources of constraint, and they matter for different reasons:
 *
 *   - Supabase itself accepts almost anything (`db_pass` is an unconstrained
 *     string in the Management API), so a weak password is accepted and then
 *     guards a database exposed on the public internet.
 *   - The password travels further than Supabase: it lands in DATABASE_URL and
 *     DIRECT_URL inside a `.env` that docker compose reads and shell scripts
 *     source. `$`, a backtick, a quote or a backslash there are expanded or
 *     swallowed long before Postgres ever sees them.
 *
 * URL-reserved characters (`@ : / ? #`) are deliberately NOT forbidden — they
 * are percent-encoded when the connection strings are built.
 */

export type RuleSeverity = 'error' | 'warning'

export interface PasswordRule {
  /** Matches a translation key suffix: `accountCreation.supabase.dbPassword.rule.<id>` */
  id: 'minLength' | 'asciiOnly' | 'noShellBreakers' | 'variety' | 'recommendedLength'
  severity: RuleSeverity
  ok: boolean
}

const MIN_LENGTH = 12
const RECOMMENDED_LENGTH = 16

/** Printable ASCII excluding space — rules out accents, emoji and whitespace at once. */
const PRINTABLE_ASCII = /^[\x21-\x7E]+$/
/** Expanded or eaten by the shell when the .env is sourced. */
const SHELL_BREAKERS = /[$`"'\\]/

function characterClasses(password: string): number {
  return [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter(re => re.test(password)).length
}

export function validateDbPassword(password: string): PasswordRule[] {
  return [
    { id: 'minLength', severity: 'error', ok: password.length >= MIN_LENGTH },
    { id: 'asciiOnly', severity: 'error', ok: PRINTABLE_ASCII.test(password) },
    { id: 'noShellBreakers', severity: 'error', ok: password.length > 0 && !SHELL_BREAKERS.test(password) },
    { id: 'variety', severity: 'warning', ok: characterClasses(password) >= 3 },
    { id: 'recommendedLength', severity: 'warning', ok: password.length >= RECOMMENDED_LENGTH },
  ]
}

/**
 * Whether the password is unfit to be *chosen*. Only blocking rules count:
 * warnings describe a weak password, not an unusable one.
 */
export function hasBlockingIssue(rules: PasswordRule[]): boolean {
  return rules.some(rule => rule.severity === 'error' && !rule.ok)
}

/**
 * Alphabets the generator draws from — free of shell breakers, and of the
 * glyphs that get misread when a password is copied by hand (0/O, 1/l/I).
 */
const LOWER = 'abcdefghijkmnopqrstuvwxyz'
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const DIGIT = '23456789'
const SYMBOL = '-_.~!*+='
const ALL = LOWER + UPPER + DIGIT + SYMBOL

function pick(alphabet: string, count: number): string[] {
  const bytes = new Uint32Array(count)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, n => alphabet[n % alphabet.length])
}

/**
 * A password that satisfies every rule, warnings included. One character is
 * drawn from each class up front rather than left to chance: at 24 characters
 * a missing class is unlikely, and "unlikely" is not a property worth shipping
 * in something that decides whether a button is enabled.
 */
export function generateDbPassword(length = 24): string {
  const required = [LOWER, UPPER, DIGIT, SYMBOL].flatMap(alphabet => pick(alphabet, 1))
  const chars = [...required, ...pick(ALL, Math.max(length, MIN_LENGTH) - required.length)]

  // Fisher-Yates with crypto randomness, so the required characters are not
  // pinned to the first four positions.
  const order = new Uint32Array(chars.length)
  crypto.getRandomValues(order)
  for (let i = chars.length - 1; i > 0; i--) {
    const j = order[i] % (i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }

  return chars.join('')
}
