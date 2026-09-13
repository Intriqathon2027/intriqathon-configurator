/**
 * Which Supabase project the wizard actually works against.
 *
 * Three distinct facts, easily confused into one:
 *
 *   - the project picked from the account's list ("use an existing project")
 *   - the project this app created ("create the project from the configurator")
 *   - the one that is *in effect*, which depends on the mode currently chosen
 *
 * Collapsing them into a single field meant a project selected in one mode
 * stayed in force after switching to the other — so the card could report
 * itself complete, and step 2 would have configured a project the user had
 * stopped intending to use.
 *
 * `SUPABASE_PROJECT_REF` is therefore **derived, never written**. Three call
 * sites used to assign it directly — the dropdown, the mode switch, and the
 * provisioning patch — each re-deriving the rule locally and each able to get
 * it wrong on its own. Guarding them one at a time fixed one ordering and left
 * the others: a provisioning run that finished after the mode had changed still
 * wrote the reference of a project the current mode does not designate.
 * Computing it in the reducer instead removes the question: no caller can put
 * the field out of step with the mode, whatever order events arrive in.
 */

export interface SupabaseProjectRefs {
  SUPABASE_PROJECT_MODE: string
  SUPABASE_PROJECT_REF: string
  SUPABASE_SELECTED_PROJECT_REF: string
  SUPABASE_CREATED_PROJECT_REF: string
}

type ModeAndSources = Pick<
  SupabaseProjectRefs,
  'SUPABASE_PROJECT_MODE' | 'SUPABASE_SELECTED_PROJECT_REF' | 'SUPABASE_CREATED_PROJECT_REF'
>

/** The reference the chosen mode designates — empty when that mode has none yet. */
export function effectiveProjectRef(refs: Partial<ModeAndSources>): string {
  return refs.SUPABASE_PROJECT_MODE === 'create'
    ? refs.SUPABASE_CREATED_PROJECT_REF ?? ''
    : refs.SUPABASE_SELECTED_PROJECT_REF ?? ''
}

/**
 * Recomputes `SUPABASE_PROJECT_REF` from the mode and the two sources. Applied
 * by the reducer to every config change, so the field is a function of the rest
 * of the config rather than something callers keep in step by hand.
 */
export function deriveProjectRef<T extends Partial<SupabaseProjectRefs>>(config: T): T {
  const ref = effectiveProjectRef(config)
  if (config.SUPABASE_PROJECT_REF === ref) return config
  return { ...config, SUPABASE_PROJECT_REF: ref }
}

/**
 * Brings a config read from disk into the split form, then derives the
 * reference in force. Configs written before the split carry only
 * `SUPABASE_PROJECT_REF`, and are recognised by both new fields being absent.
 *
 * Such a reference is adopted as a *selection*, never as a creation —
 * including when the saved mode is "create". That asymmetry is the whole
 * point: under the old code a project picked in one mode stayed in
 * `SUPABASE_PROJECT_REF` after switching to the other, so a config saved in
 * create mode very often holds a reference that was merely selected. Reading
 * it as "a project was created here" would assert something that was never
 * observed, and hand step 2 a project nobody chose to build. Read as a
 * selection it is at worst an offer the reader can decline.
 */
export function withEffectiveProjectRef<T extends Partial<SupabaseProjectRefs>>(config: T): T {
  const selected = config.SUPABASE_SELECTED_PROJECT_REF ?? ''
  const created = config.SUPABASE_CREATED_PROJECT_REF ?? ''
  const stored = config.SUPABASE_PROJECT_REF ?? ''

  const preSplit = !selected && !created

  return deriveProjectRef({
    ...config,
    SUPABASE_SELECTED_PROJECT_REF: selected || (preSplit ? stored : ''),
    SUPABASE_CREATED_PROJECT_REF: created,
  })
}
