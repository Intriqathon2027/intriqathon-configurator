import { describe, it, expect } from 'vitest'
import { validateDbPassword, hasBlockingIssue, generateDbPassword } from '../src/shared/dbPassword'

const ruleOk = (password: string, id: string) =>
  validateDbPassword(password).find(r => r.id === id)?.ok

describe('validateDbPassword', () => {
  it('rejects a password shorter than 12 characters', () => {
    expect(ruleOk('Short1-x', 'minLength')).toBe(false)
    expect(ruleOk('LongEnough1-x', 'minLength')).toBe(true)
  })

  it('rejects the characters a shell would eat out of the .env', () => {
    // The password lands in a .env that docker compose reads and scripts source.
    for (const bad of ['$', '`', '"', "'", '\\']) {
      expect(ruleOk(`Valid${bad}Password1`, 'noShellBreakers')).toBe(false)
    }
    expect(ruleOk('Valid-Password1x', 'noShellBreakers')).toBe(true)
  })

  it('allows URL-reserved characters, which get percent-encoded downstream', () => {
    const withUrlChars = 'Pass@word:12/34?x#y'
    expect(ruleOk(withUrlChars, 'noShellBreakers')).toBe(true)
    expect(ruleOk(withUrlChars, 'asciiOnly')).toBe(true)
    expect(hasBlockingIssue(validateDbPassword(withUrlChars))).toBe(false)
  })

  it('rejects spaces, accents and emoji', () => {
    expect(ruleOk('Mot de passe 123', 'asciiOnly')).toBe(false)
    expect(ruleOk('Motdepassé1234', 'asciiOnly')).toBe(false)
    expect(ruleOk('Password1234🎉', 'asciiOnly')).toBe(false)
  })

  it('treats variety and extra length as advice, not as blockers', () => {
    const lowercaseOnly = 'abcdefghijklm'
    expect(ruleOk(lowercaseOnly, 'variety')).toBe(false)
    expect(ruleOk(lowercaseOnly, 'recommendedLength')).toBe(false)
    expect(hasBlockingIssue(validateDbPassword(lowercaseOnly))).toBe(false)
  })

  it('reports an empty password as unusable', () => {
    expect(hasBlockingIssue(validateDbPassword(''))).toBe(true)
  })
})

describe('generateDbPassword', () => {
  it('always produces a password that passes every rule', () => {
    for (let i = 0; i < 50; i++) {
      const generated = generateDbPassword()
      const rules = validateDbPassword(generated)
      expect(hasBlockingIssue(rules)).toBe(false)
      expect(rules.every(r => r.ok)).toBe(true)
    }
  })

  it('does not repeat itself', () => {
    const seen = new Set(Array.from({ length: 20 }, () => generateDbPassword()))
    expect(seen.size).toBe(20)
  })
})
