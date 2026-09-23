/**
 * Prisma needs `pgbouncer=true` on any URL that goes through Supabase's
 * transaction-mode pooler (port 6543), or prepared statements collide across
 * pooled connections. Session mode and direct connections (5432) must not carry
 * it. Idempotent: a URL that already has a `pgbouncer` parameter, whatever its
 * value, is left as it is.
 */

const TRANSACTION_POOLER_PORT = /:6543\//
const HAS_PGBOUNCER_PARAM = /[?&]pgbouncer=/i

export function ensurePgBouncerFlag(url: string): string {
  const trimmed = url.trim()
  if (!TRANSACTION_POOLER_PORT.test(trimmed) || HAS_PGBOUNCER_PARAM.test(trimmed)) return url
  return `${trimmed}${trimmed.includes('?') ? '&' : '?'}pgbouncer=true`
}
