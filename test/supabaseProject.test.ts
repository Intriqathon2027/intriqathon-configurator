import { describe, it, expect } from 'vitest'
import {
  deriveProjectRef,
  effectiveProjectRef,
  withEffectiveProjectRef,
  type SupabaseProjectRefs as Refs,
} from '../src/shared/supabaseProject'

describe('effectiveProjectRef', () => {
  it('follows the mode rather than whatever was written last', () => {
    const refs = {
      SUPABASE_PROJECT_MODE: 'create',
      SUPABASE_SELECTED_PROJECT_REF: 'picked',
      SUPABASE_CREATED_PROJECT_REF: '',
    }
    // Nothing has been created yet: a project picked in the other mode must not
    // stand in for it.
    expect(effectiveProjectRef(refs)).toBe('')
    expect(effectiveProjectRef({ ...refs, SUPABASE_PROJECT_MODE: 'existing' })).toBe('picked')
  })

  it('uses the created project once there is one', () => {
    expect(effectiveProjectRef({
      SUPABASE_PROJECT_MODE: 'create',
      SUPABASE_SELECTED_PROJECT_REF: 'picked',
      SUPABASE_CREATED_PROJECT_REF: 'made',
    })).toBe('made')
  })
})

describe('withEffectiveProjectRef', () => {
  it('clears the effective ref when the chosen mode has none', () => {
    const out = withEffectiveProjectRef({
      SUPABASE_PROJECT_MODE: 'create',
      SUPABASE_PROJECT_REF: 'picked',
      SUPABASE_SELECTED_PROJECT_REF: 'picked',
      SUPABASE_CREATED_PROJECT_REF: '',
    })
    expect(out.SUPABASE_PROJECT_REF).toBe('')
    // The selection is kept, so switching back restores it.
    expect(out.SUPABASE_SELECTED_PROJECT_REF).toBe('picked')
  })

  it('keeps each mode its own reference', () => {
    const out = withEffectiveProjectRef({
      SUPABASE_PROJECT_MODE: 'existing',
      SUPABASE_PROJECT_REF: '',
      SUPABASE_SELECTED_PROJECT_REF: 'picked',
      SUPABASE_CREATED_PROJECT_REF: 'made',
    })
    expect(out.SUPABASE_PROJECT_REF).toBe('picked')
    expect(out.SUPABASE_CREATED_PROJECT_REF).toBe('made')
  })

  it('reads a pre-split reference as a selection, never as a creation', () => {
    // Older configs carry only SUPABASE_PROJECT_REF. Under the old code a
    // reference picked in one mode survived a switch to the other, so a config
    // saved in create mode most often holds one that was merely selected —
    // claiming it was created would be an assertion nothing supports.
    const inCreateMode = withEffectiveProjectRef({
      SUPABASE_PROJECT_MODE: 'create',
      SUPABASE_PROJECT_REF: 'legacy',
    })
    expect(inCreateMode.SUPABASE_CREATED_PROJECT_REF).toBe('')
    expect(inCreateMode.SUPABASE_PROJECT_REF).toBe('')
    expect(inCreateMode.SUPABASE_SELECTED_PROJECT_REF).toBe('legacy')

    const inExistingMode = withEffectiveProjectRef({
      SUPABASE_PROJECT_MODE: 'existing',
      SUPABASE_PROJECT_REF: 'legacy',
    })
    expect(inExistingMode.SUPABASE_SELECTED_PROJECT_REF).toBe('legacy')
    expect(inExistingMode.SUPABASE_PROJECT_REF).toBe('legacy')
    expect(inExistingMode.SUPABASE_CREATED_PROJECT_REF).toBe('')
  })
})

/**
 * The bug this file exists for was never a wrong rule — it was the rule being
 * restated at each of the three places that assigned `SUPABASE_PROJECT_REF`.
 * Guarding them one at a time closed one ordering and left the others, so the
 * card kept reporting a project in force that the chosen mode does not
 * designate.
 *
 * These two suites check the property rather than the paths: whatever sequence
 * of events arrives, and in whatever order, the reference in force is the one
 * the mode designates.
 */
describe('deriveProjectRef', () => {
  it('drops a reference the provisioning run reported after the mode changed', () => {
    // A creation takes minutes. The reader switched to "use an existing
    // project" while it ran, and the run came back announcing the project it
    // built. It is recorded — but the mode says the selected one is in force.
    const afterLateCreation = deriveProjectRef({
      SUPABASE_PROJECT_MODE: 'existing',
      SUPABASE_PROJECT_REF: 'picked',
      SUPABASE_SELECTED_PROJECT_REF: 'picked',
      SUPABASE_CREATED_PROJECT_REF: 'built-late',
    })
    expect(afterLateCreation.SUPABASE_PROJECT_REF).toBe('picked')
    // and switching back brings it into force without re-running anything
    expect(deriveProjectRef({ ...afterLateCreation, SUPABASE_PROJECT_MODE: 'create' })
      .SUPABASE_PROJECT_REF).toBe('built-late')
  })

  it('leaves create mode with nothing in force until something is created', () => {
    expect(deriveProjectRef({
      SUPABASE_PROJECT_MODE: 'create',
      SUPABASE_PROJECT_REF: 'picked',
      SUPABASE_SELECTED_PROJECT_REF: 'picked',
      SUPABASE_CREATED_PROJECT_REF: '',
    }).SUPABASE_PROJECT_REF).toBe('')
  })
})

describe('no sequence of events puts the reference out of step with the mode', () => {
  /**
   * The writes the app actually performs, mirrored from their call sites. None
   * of them touches `SUPABASE_PROJECT_REF`: that is the invariant being tested,
   * so any future caller that starts assigning it again fails here.
   */
  const PROJECTS = ['P1', 'P2']
  const setFields = (c: Refs, patch: Partial<Refs>) => deriveProjectRef({ ...c, ...patch })

  const actions: [string, (c: Refs) => Refs][] = [
    ['switch to existing', c => setFields(c, { SUPABASE_PROJECT_MODE: 'existing' })],
    ['switch to create', c => setFields(c, { SUPABASE_PROJECT_MODE: 'create' })],
    ['reload from the vault', c => withEffectiveProjectRef({ ...c })],
    ['a creation lands', c => setFields(c, { SUPABASE_CREATED_PROJECT_REF: 'NEW' })],
    ...PROJECTS.map(p => [
      `pick ${p}`, (c: Refs) => setFields(c, { SUPABASE_SELECTED_PROJECT_REF: p }),
    ] as [string, (c: Refs) => Refs]),
    ...PROJECTS.map(p => [
      `adopt ${p}`,
      (c: Refs) => setFields(c, { SUPABASE_PROJECT_MODE: 'existing', SUPABASE_SELECTED_PROJECT_REF: p }),
    ] as [string, (c: Refs) => Refs]),
  ]

  it('holds across every sequence of five events', () => {
    const start: Refs = {
      SUPABASE_PROJECT_MODE: 'existing',
      SUPABASE_PROJECT_REF: '',
      SUPABASE_SELECTED_PROJECT_REF: '',
      SUPABASE_CREATED_PROJECT_REF: '',
    }

    const failures: string[] = []
    const walk = (c: Refs, path: string[]) => {
      const ref = c.SUPABASE_PROJECT_REF
      const inForce = c.SUPABASE_PROJECT_MODE === 'create'
        ? c.SUPABASE_CREATED_PROJECT_REF
        : c.SUPABASE_SELECTED_PROJECT_REF
      if (ref !== inForce) {
        failures.push(`${path.join(' → ')} ⇒ ${JSON.stringify(c)}`)
        return
      }
      if (path.length === 5) return
      for (const [name, fn] of actions) walk(fn(c), [...path, name])
    }
    walk(start, [])

    expect(failures).toEqual([])
  })
})
