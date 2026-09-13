/**
 * Log redaction.
 *
 * Every line the provisioning services emit travels to the renderer and is
 * printed in the card's terminal, where it can be screenshotted or copied. The
 * vault protects secrets at rest; this protects them on their way to the
 * screen. Anything that looks like a credential is masked before it leaves the
 * main process — patterns for the formats we know, plus the literal values we
 * were handed, which covers the ones we cannot recognise (a database password
 * can look like anything).
 */

/** Token shapes worth masking even when we never held the value ourselves. */
const PATTERNS: RegExp[] = [
  // Personal access token — sbp_<hex>
  /sbp_[A-Za-z0-9]{20,}/g,
  // New-generation keys — sb_publishable_… / sb_secret_…
  /sb_(?:publishable|secret)_[A-Za-z0-9_-]{10,}/g,
  // Legacy JWT keys (anon / service_role) and any other JWT
  /eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g,
  // Postgres URLs — the password sits in the userinfo
  /postgres(?:ql)?:\/\/[^\s"']+/g,
]

const MASK = '••••••'

export class Redactor {
  private literals: string[] = []

  /**
   * Register a value to mask wherever it appears. Short strings are ignored:
   * masking every occurrence of a three-character password would shred the
   * surrounding text without protecting anything worth protecting.
   */
  add(...secrets: (string | undefined | null)[]): this {
    for (const secret of secrets) {
      if (secret && secret.length >= 6 && !this.literals.includes(secret)) {
        this.literals.push(secret)
      }
    }
    return this
  }

  redact(line: string): string {
    let out = line
    // Longest first, so a secret that contains another is masked as one unit.
    for (const literal of [...this.literals].sort((a, b) => b.length - a.length)) {
      out = out.split(literal).join(MASK)
    }
    for (const pattern of PATTERNS) {
      out = out.replace(pattern, MASK)
    }
    return out
  }
}
