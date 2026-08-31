// ============================================================================
// Validation de toute donnée franchissant la frontière renderer → main.
// Le renderer est traité comme non fiable : rien n'atteint le disque, le
// réseau ou un process enfant sans passer par ici.
// ============================================================================

import path from 'node:path'

const IPV4_RE = /^(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)){3}$/
const HOSTNAME_RE = /^(?=.{1,253}$)([a-zA-Z0-9](-?[a-zA-Z0-9])*)(\.[a-zA-Z0-9](-?[a-zA-Z0-9])*)+$/

/** Accepte une IPv4 ou un nom d'hôte : rien qui puisse être pris pour une
 *  option en ligne de commande ou un séparateur shell. */
export function isValidHost(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const v = value.trim()
  if (v.length === 0 || v.length > 253) return false
  if (v.startsWith('-')) return false

  if (IPV4_RE.test(v)) return true

  // Un dernier label numérique signale une IPv4 malformée (999.1.1.1), pas un
  // nom d'hôte : sans ce garde-fou le motif hostname l'accepterait.
  const lastLabel = v.slice(v.lastIndexOf('.') + 1)
  if (/^\d+$/.test(lastLabel)) return false

  return HOSTNAME_RE.test(v)
}

/** Nom d'utilisateur POSIX. Interdit tout ce qui pourrait s'évader vers ssh. */
export function isValidUsername(value: unknown): value is string {
  return typeof value === 'string' && /^[a-z_][a-z0-9_-]{0,31}$/i.test(value)
}

/**
 * Chemin absolu sans segment de traversée.
 *
 * Le test porte sur la chaîne *reçue*, pas sur sa forme normalisée :
 * `path.normalize` résout les `..` et effacerait justement ce qu'on cherche.
 * Un chemin légitime vient d'un dialogue système et ne contient jamais de `..`.
 */
export function isSafeAbsolutePath(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0) return false
  if (value.includes('\0')) return false
  if (!path.isAbsolute(value)) return false

  const segments = value.split(/[\\/]/)
  return !segments.includes('..')
}

/** Seuls http/https peuvent atteindre shell.openExternal : `file://` et les
 *  protocoles applicatifs personnalisés sont des vecteurs d'exécution. */
export function isSafeExternalUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

export function assertHost(value: unknown): string {
  if (!isValidHost(value)) throw new ValidationError(`Adresse serveur invalide : ${String(value)}`)
  return value.trim()
}

export function assertUsername(value: unknown): string {
  if (!isValidUsername(value)) throw new ValidationError(`Nom d'utilisateur invalide : ${String(value)}`)
  return value
}

export function assertSafeAbsolutePath(value: unknown, label: string): string {
  if (!isSafeAbsolutePath(value)) throw new ValidationError(`${label} invalide : ${String(value)}`)
  return path.normalize(value as string)
}
