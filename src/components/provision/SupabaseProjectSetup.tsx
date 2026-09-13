import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, ArrowRight, Check, Info, Loader, Play, Wand2, X, XCircle } from 'lucide-react'
import { FormField } from '../ui/FormField'
import { useApp } from '../../context/AppContext'
import { createProvisionBridge } from '../../services/provisionBridge'
import { generateDbPassword, hasBlockingIssue, validateDbPassword } from '../../shared/dbPassword'
import { useServiceProvision } from '../../hooks/useServiceProvision'
import type { Config } from '../../context/AppContext'
import type {
  ProvisionQueryResult,
  SupabaseOrganizationSummary,
  SupabaseProjectSummary,
  SupabaseProjectVerification,
} from '../../types/provision'

/**
 * Chooses how the Supabase project comes into existence, and collects the one
 * value the Management API can never hand back: the database password.
 *
 * Whichever mode is picked, that password is what lets step 2 build
 * DATABASE_URL and DIRECT_URL on its own instead of asking the reader to
 * substitute `[YOUR-PASSWORD]` by hand.
 */

/** Long enough that the token is no longer being typed, short enough to feel instant. */
const TYPING_DEBOUNCE_MS = 700

/**
 * A personal access token is `sbp_` followed by a long hex string. Gates the
 * background fetches so a half-typed token does not fire a request per
 * keystroke into Supabase's rate limit.
 */
function looksLikeAccessToken(token: string): boolean {
  return /^sbp_[A-Za-z0-9]{20,}$/.test(token)
}

/** Regions accepted by `POST /v1/projects`; Paris first for a French event. */
const REGIONS = [
  'eu-west-3', 'eu-west-1', 'eu-west-2', 'eu-central-1', 'eu-central-2', 'eu-north-1',
  'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
  'ap-south-1', 'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1', 'ap-northeast-2', 'ap-east-1',
  'ca-central-1', 'sa-east-1',
]

export function SupabaseProjectSetup() {
  const { t, config, setField, setFields, saveConfig } = useApp()
  // Built once: the effects below run on every token or selection change, and
  // each of them minting its own bridge is both wasteful and, for anything
  // holding state, incoherent.
  const [bridge] = useState(createProvisionBridge)
  const [orgs, setOrgs] = useState<SupabaseOrganizationSummary[] | null>(null)
  const [orgError, setOrgError] = useState<string | null>(null)

  // `null` means "not fetched yet", which an empty array cannot express — and
  // the difference is what the loading indicator is derived from.
  const [projects, setProjects] = useState<SupabaseProjectSummary[] | null>(null)
  /**
   * Bumped to ask for the listing again. Clearing `projects` alone did not do
   * it: the fetching effect keys on the token, so wiping the result left it
   * with nothing to react to — and the list never came back.
   */
  const [projectsRefresh, setProjectsRefresh] = useState(0)
  const [projectsError, setProjectsError] = useState<string | null>(null)
  const [verification, setVerification] = useState<SupabaseProjectVerification | null>(null)
  /**
   * Tagged with the reference it belongs to. Listing and verifying used to
   * share one error slot, so a failure on one project could still be on screen
   * next to a success for another — including after the auto-selection of a
   * single project, which never went through the manual clearing path.
   */
  const [verifyError, setVerifyError] = useState<{ ref: string; message: string } | null>(null)

  const isCreateMode = config.SUPABASE_PROJECT_MODE === 'create'
  const typedName = config.SUPABASE_PROJECT_NAME.trim()

  /**
   * In create mode, "does this project already exist?" is answered by the
   * account's own project list, not by a flag this app wrote earlier. The
   * account is the authority: it covers a project created from the dashboard,
   * one created here before this field existed, and a config restored from a
   * vault — none of which a locally stored reference can account for.
   */
  const projectWithTypedName = projects?.find(p => p.name === typedName) ?? null
  /**
   * The project matching the name is the one this app created. Worth telling
   * apart: right after a successful creation the name is, of course, taken —
   * and pointing the reader at "use the existing project instead" would be a
   * strange thing to say about the project they just asked for.
   */
  const createdByConfigurator = !!projectWithTypedName
    && projectWithTypedName.ref === config.SUPABASE_CREATED_PROJECT_REF
  /**
   * Create mode does not verify anything: finding the name in the account's own
   * listing is the whole answer, and it points the reader at the other mode
   * rather than confirming a project they did not ask to inspect.
   */

  /**
   * Each mode looks at its own reference: the project matching the name being
   * typed, or the one picked from the dropdown. They are checked the same way,
   * but a project chosen in one mode must never be reported as a result of the
   * other.
   *
   * Only what was obtained for the reference currently on screen is shown — a
   * result carrying another ref is stale by definition, so a success and a
   * failure can never appear side by side.
   */
  const selectedRef = isCreateMode ? '' : config.SUPABASE_SELECTED_PROJECT_REF
  const currentVerification = verification?.ref === selectedRef ? verification : null
  const currentVerifyError = verifyError?.ref === selectedRef ? verifyError.message : null
  const verifying = !!selectedRef && !currentVerification && !currentVerifyError

  /**
   * Rules are enforced only when the password is being *chosen*. On an existing
   * project the user is transcribing a password they already set, so the same
   * checks are shown as advice — the shell-breaking characters still matter
   * there, since the value ends up in the same .env either way.
   */
  const passwordRules = validateDbPassword(config.SUPABASE_DB_PASSWORD)
  const passwordBlocks = isCreateMode && hasBlockingIssue(passwordRules)
  /**
   * The box exists to say what is wrong. A password that satisfies every rule
   * has nothing to report, so it says nothing — and disappearing is itself the
   * confirmation that the password is fine.
   */
  const showPasswordRules = config.SUPABASE_DB_PASSWORD.length > 0
    && passwordRules.some(rule => !rule.ok)

  /**
   * Creates the project and stops there. Keys, URLs and buckets stay with step
   * 2 — this only has to end with a project reference on file, which is what
   * stops a later run from ever creating a second project.
   */
  const provision = useServiceProvision('supabase', patch => {
    const typed = patch as Partial<Config>
    setFields(typed)
    void saveConfig(typed)
    // The account has one project more than the last listing says: ask for it
    // again. The button stays locked until the new list lands.
    setProjects(null)
    setProjectsRefresh(n => n + 1)
  })

  /**
   * Whether a project of this name is already on the account. While the listing
   * has not come back, the answer is "yes": staying locked on an unknown is what
   * stops a double-click — or a page reloaded straight after a creation — from
   * creating, and billing, a duplicate.
   */
  const projectAlreadyExists = isCreateMode
    && !!typedName
    && (projects === null || !!projectWithTypedName)

  const canCreate = !!config.SUPABASE_ACCESS_TOKEN
    && !!config.SUPABASE_ORG_SLUG
    && !!typedName
    && !passwordBlocks
    && !projectAlreadyExists

  // Records the selection only: which reference is *in force* follows from the
  // mode, and the reducer derives it.
  const selectProject = (ref: string) => {
    setField('SUPABASE_SELECTED_PROJECT_REF', ref)
  }

  /**
   * Switching mode swaps which reference is in force — by changing the mode
   * alone. The reference itself is derived from it, so the two cannot drift
   * apart the way they did when this function assigned both.
   */
  const switchMode = (mode: 'existing' | 'create') => {
    // The listing is fetched once, so the "single project, no choice to make"
    // adoption cannot live only at fetch time: arriving in existing mode by
    // switching into it has to reach the same conclusion.
    const selected = mode === 'existing'
      && !config.SUPABASE_SELECTED_PROJECT_REF
      && projects?.length === 1
      ? projects[0].ref
      : config.SUPABASE_SELECTED_PROJECT_REF

    setFields({
      SUPABASE_PROJECT_MODE: mode,
      SUPABASE_SELECTED_PROJECT_REF: selected,
    })
  }

  /** Switches to the other mode with the project already picked. */
  const adoptExistingProject = (ref: string) => {
    setFields({
      SUPABASE_PROJECT_MODE: 'existing',
      SUPABASE_SELECTED_PROJECT_REF: ref,
    })
  }

  /** An account with no project at all: the dropdown would be silently empty. */
  const hasNoProject = projects !== null && projects.length === 0

  const createProject = () => {
    void provision.startSupabase({
      accessToken: config.SUPABASE_ACCESS_TOKEN,
      dbPassword: config.SUPABASE_DB_PASSWORD,
      mode: 'create',
      // Never reused here: the button is only reachable when no project of this
      // name exists, so this call always means "create a new one".
      ref: undefined,
      projectName: config.SUPABASE_PROJECT_NAME,
      organizationSlug: config.SUPABASE_ORG_SLUG,
      regionCode: config.SUPABASE_REGION,
      stopAfterProject: true,
    })
  }

  const applyOrgs = (result: ProvisionQueryResult<SupabaseOrganizationSummary[]>) => {
    if (!result.success || !result.data) {
      setOrgError(result.error || t('accountCreation.supabase.orgs.error'))
      return
    }
    setOrgs(result.data)
    // A single organization is not a choice — pick it and move on.
    if (result.data.length === 1) {
      setField('SUPABASE_ORG_SLUG', result.data[0].slug)
    }
  }

  /**
   * `useApp()` hands back a fresh `setField` on every render, so `applyOrgs`
   * can never be a stable dependency — holding it in a ref is what keeps the
   * background fetch below from re-firing on each render.
   */
  const applyOrgsRef = useRef(applyOrgs)
  useEffect(() => {
    applyOrgsRef.current = applyOrgs
  })

  const applyProjects = (result: ProvisionQueryResult<SupabaseProjectSummary[]>) => {
    if (!result.success || !result.data) {
      setProjectsError(result.error || t('accountCreation.supabase.projects.error'))
      return
    }
    setProjectsError(null)
    setProjects(result.data)

    /**
     * A stored reference is a *claim* that a project was picked or created. The
     * account's own listing is what settles it, and a reference absent from
     * that listing names nothing: a project deleted from the dashboard, or one
     * a saved config asserts without it ever having existed.
     *
     * Until now such a claim was believed forever. It survived every reload —
     * the loader faithfully re-derived the card's state from it — so no amount
     * of correcting the logic downstream could contradict it. Dropping it here
     * is what lets a config repair itself instead of carrying the assertion
     * from run to run.
     *
     * Not while a run is in flight: a project created seconds ago may not be in
     * a listing that was already on its way.
     */
    if (provision.status !== 'running') {
      const onAccount = new Set(result.data.map(project => project.ref))
      const disproved: Partial<Config> = {}
      if (config.SUPABASE_CREATED_PROJECT_REF && !onAccount.has(config.SUPABASE_CREATED_PROJECT_REF)) {
        disproved.SUPABASE_CREATED_PROJECT_REF = ''
      }
      if (config.SUPABASE_SELECTED_PROJECT_REF && !onAccount.has(config.SUPABASE_SELECTED_PROJECT_REF)) {
        disproved.SUPABASE_SELECTED_PROJECT_REF = ''
      }
      if (Object.keys(disproved).length > 0) {
        setFields(disproved)
        // Written through as well: leaving a disproved claim in the vault would
        // bring it back, green, on the next launch.
        void saveConfig(disproved)
        return
      }
    }

    /**
     * A single project is not a choice, so the dropdown adopts it — but only in
     * the mode that owns that dropdown. The listing is fetched in create mode
     * too, where it answers a different question entirely ("is this name
     * taken?"); auto-selecting there would put a project into effect that the
     * reader never picked, and that the configurator has not created.
     */
    if (!isCreateMode && result.data.length === 1) selectProject(result.data[0].ref)
  }

  const applyVerification = (ref: string, result: ProvisionQueryResult<SupabaseProjectVerification>) => {
    if (!result.success || !result.data) {
      setVerifyError({ ref, message: result.error || t('accountCreation.supabase.verify.error') })
      return
    }
    setVerifyError(null)
    setVerification(result.data)
  }

  /**
   * The account's projects, fetched as soon as the card can ask for them —
   * on load, and again when the token changes or the mode is switched back to
   * an existing project. No button: reaching this card is itself the request.
   */
  // Trimmed once: a token pasted with trailing whitespace must not look like a
  // different value to every effect that depends on it.
  const token = config.SUPABASE_ACCESS_TOKEN.trim()

  const applyProjectsRef = useRef(applyProjects)
  const applyVerificationRef = useRef(applyVerification)
  useEffect(() => {
    applyProjectsRef.current = applyProjects
    applyVerificationRef.current = applyVerification
  })

  // Both modes need it now: one to populate the dropdown, the other to answer
  // "is a project of this name already on the account?".
  const canListProjects = looksLikeAccessToken(token)

  useEffect(() => {
    if (!canListProjects) return

    let cancelled = false
    const timer = setTimeout(() => {
      void bridge.listProjects(token).then(result => {
        if (!cancelled) applyProjectsRef.current(result)
      })
    }, TYPING_DEBOUNCE_MS)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [bridge, canListProjects, token, projectsRefresh])

  /**
   * Confirmation for whichever project is selected. Listing proves the token
   * works; this proves the configurator resolved the reference the user picked
   * and that its services answer — which is what step 2 goes on to depend on.
   */
  useEffect(() => {
    if (!looksLikeAccessToken(token) || !selectedRef) return

    let cancelled = false
    void bridge.verifyProject(token, selectedRef).then(result => {
      if (!cancelled) applyVerificationRef.current(selectedRef, result)
    })

    return () => { cancelled = true }
  }, [bridge, token, selectedRef])

  /**
   * Both indicators are derived rather than stored: "still loading" is exactly
   * "no answer yet for the inputs currently on screen", which keeps the spinner
   * honest when the selection changes mid-flight.
   */
  const loadingProjects = canListProjects && projects === null && !projectsError
  const loadingOrgs = isCreateMode && looksLikeAccessToken(token) && orgs === null && !orgError


  /**
   * Fetched in the background so the select is usually already populated by the
   * time it is looked at — but debounced, and only once the token has the shape
   * of a complete one. The token field is typed into character by character,
   * and firing a request per keystroke would send dozens of doomed calls
   * straight into Supabase's rate limit, whose 429s then look like auth
   * failures.
   */
  useEffect(() => {
    if (!isCreateMode || !looksLikeAccessToken(token)) return

    let cancelled = false
    const timer = setTimeout(() => {
      void bridge.listOrganizations(token).then(result => {
        if (!cancelled) applyOrgsRef.current(result)
      })
    }, TYPING_DEBOUNCE_MS)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [bridge, isCreateMode, token])

  /**
   * The same proof in both modes: what the API says this reference actually is.
   * In create mode it is also what tells the reader which project the locked
   * button refers to, and therefore what to change to create another one.
   */
  const verificationPanel = !selectedRef ? null : verifying ? (
    <div className="project-create-status">
      <Loader size={15} className="service-config-block__spinner" />
      <span>{t('accountCreation.supabase.verify.running')}</span>
    </div>
  ) : currentVerifyError ? (
    <div className="project-verification project-verification--failed">
      <div className="project-create-status">
        <X size={15} />
        <span>{t('accountCreation.supabase.verify.failed')}</span>
      </div>
      <p className="form-error" style={{ margin: 0 }}>{currentVerifyError}</p>
    </div>
  ) : currentVerification ? (
    <div className={`project-verification${currentVerification.ready ? ' project-verification--ok' : ''}`}>
              <div className="project-create-status project-create-status--done">
                {currentVerification.ready ? <Check size={15} /> : <AlertTriangle size={15} />}
                <span>
                  {currentVerification.ready
                    ? t('accountCreation.supabase.verify.ok')
                    : t('accountCreation.supabase.verify.partial')}
                </span>
              </div>
              <ul className="project-verification__facts">
                <li><strong>{t('accountCreation.supabase.verify.name')}</strong> {currentVerification.name}</li>
                <li><strong>{t('accountCreation.supabase.verify.ref')}</strong> <code>{currentVerification.ref}</code></li>
                {currentVerification.region && (
                  <li><strong>{t('accountCreation.supabase.verify.region')}</strong> {currentVerification.region}</li>
                )}
                <li><strong>{t('accountCreation.supabase.verify.status')}</strong> {currentVerification.status}</li>
                {currentVerification.services.length > 0 && (
                  <li>
                    <strong>{t('accountCreation.supabase.verify.services')}</strong>{' '}
                    {currentVerification.services.map(svc => `${svc.name} ${svc.healthy ? '✓' : '✕'}`).join(' · ')}
                  </li>
                )}
              </ul>
            </div>
  ) : null

  return (
    <div className="supabase-project-setup">
      <div className="form-label">{t('accountCreation.supabase.projectMode')}</div>
      <div className="radio-row">
        <label className="radio-option">
          <input
            type="radio"
            name="supabase-project-mode"
            checked={!isCreateMode}
            onChange={() => switchMode('existing')}
          />
          <span>{t('accountCreation.supabase.projectMode.existing')}</span>
        </label>
        <label className="radio-option">
          <input
            type="radio"
            name="supabase-project-mode"
            checked={isCreateMode}
            onChange={() => switchMode('create')}
          />
          <span>{t('accountCreation.supabase.projectMode.create')}</span>
        </label>
      </div>

      {!isCreateMode && (
        <>
          <div className="form-group">
            <label className="form-label" htmlFor="supabase-existing-project">
              {t('accountCreation.supabase.existingProject')}
            </label>
            <select
              id="supabase-existing-project"
              className="form-input"
              value={config.SUPABASE_SELECTED_PROJECT_REF}
              onChange={e => selectProject(e.target.value)}
            >
              <option value="">
                {loadingProjects
                  ? t('accountCreation.supabase.projects.loading')
                  : t('accountCreation.supabase.existingProject.placeholder')}
              </option>
              {(projects ?? []).map(project => (
                <option key={project.ref} value={project.ref}>
                  {project.name} — {project.ref}
                </option>
              ))}
            </select>
            {!config.SUPABASE_ACCESS_TOKEN && (
              <p className="text-muted" style={{ fontSize: 'var(--font-size-sm)', margin: '4px 0 0' }}>
                {t('accountCreation.supabase.organization.needToken')}
              </p>
            )}
            {hasNoProject && (
              <p className="text-muted" style={{ fontSize: 'var(--font-size-sm)', margin: '4px 0 0' }}>
                {t('accountCreation.supabase.projects.none')}
              </p>
            )}
          </div>

          {/* Detection runs on its own; only its outcome is shown. */}
          {verificationPanel}

          {projectsError && <p className="form-error">{projectsError}</p>}
        </>
      )}

      {isCreateMode && (
        <>
          <FormField
            id="supabase-project-name"
            label={t('accountCreation.supabase.projectName')}
            value={config.SUPABASE_PROJECT_NAME}
            onChange={v => setField('SUPABASE_PROJECT_NAME', v)}
            placeholder="intriqathon"
          />

          <div className="form-group">
            <label className="form-label" htmlFor="supabase-org">
              {t('accountCreation.supabase.organization')}
            </label>
            <select
              id="supabase-org"
              className="form-input"
              value={config.SUPABASE_ORG_SLUG}
              onChange={e => setField('SUPABASE_ORG_SLUG', e.target.value)}
            >
              <option value="">
                {loadingOrgs
                  ? t('accountCreation.supabase.orgs.loading')
                  : t('accountCreation.supabase.organization.placeholder')}
              </option>
              {(orgs ?? []).map(org => (
                <option key={org.slug} value={org.slug}>{org.name}</option>
              ))}
            </select>
            {orgError && <p className="form-error">{orgError}</p>}
            {!config.SUPABASE_ACCESS_TOKEN && (
              <p className="text-muted" style={{ fontSize: 'var(--font-size-sm)', margin: '4px 0 0' }}>
                {t('accountCreation.supabase.organization.needToken')}
              </p>
            )}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="supabase-region">
              {t('accountCreation.supabase.region')}
            </label>
            <select
              id="supabase-region"
              className="form-input"
              value={config.SUPABASE_REGION}
              onChange={e => setField('SUPABASE_REGION', e.target.value)}
            >
              {REGIONS.map(region => (
                <option key={region} value={region}>{region}</option>
              ))}
            </select>
          </div>

        </>
      )}

      <div>
        <FormField
          id="supabase-db-password"
          label={t('accountCreation.supabase.dbPassword')}
          value={config.SUPABASE_DB_PASSWORD}
          onChange={v => setField('SUPABASE_DB_PASSWORD', v)}
          placeholder={t('accountCreation.supabase.dbPassword.placeholder')}
          type="password"
          rightElement={isCreateMode && !projectWithTypedName ? (
            <button
              className="btn btn-secondary"
              onClick={() => setField('SUPABASE_DB_PASSWORD', generateDbPassword())}
              type="button"
            >
              <Wand2 size={14} />
              {t('accountCreation.supabase.dbPassword.generate')}
            </button>
          ) : undefined}
        />

        {showPasswordRules && (
          <div className={`password-rules-box${passwordBlocks ? ' password-rules-box--invalid' : ''}`}>
            <div className="password-rules-box__title">
              {t('accountCreation.supabase.dbPassword.requirements')}
            </div>
            <ul className="password-rules">
              {passwordRules.map(rule => (
                <li
                  key={rule.id}
                  className={`password-rules__item password-rules__item--${rule.ok ? 'ok' : rule.severity}`}
                >
                  {rule.ok
                    ? <Check size={13} />
                    : rule.severity === 'error' ? <X size={13} /> : <AlertTriangle size={13} />}
                  <span>{t(`accountCreation.supabase.dbPassword.rule.${rule.id}`)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {isCreateMode && (
        <>
          {/* Run it from here, so step 1 ends with a project that exists. */}
          {provision.status === 'running' ? (
            <>
              <div className="project-create-status">
                <Loader size={15} className="service-config-block__spinner" />
                <span>{t('accountCreation.supabase.creating')}</span>
              </div>
              {provision.logs.length > 0 && (
                <div className="service-config-block__terminal">
                  {provision.logs.map((line, i) => (
                    <div key={i} className="service-config-block__log-line">{line}</div>
                  ))}
                </div>
              )}
              <button className="btn btn-danger" onClick={provision.cancel} type="button">
                <XCircle size={14} />
                {t('apiConfig.btnCancel')}
              </button>
            </>
          ) : (
            <>
              {/* The project exists: the settings above stay editable, only the
                  button that would create a second one is locked — and the panel
                  says which project that lock refers to. */}
              {provision.status === 'error' && provision.error && (
                <div className="info-box warning">
                  <AlertTriangle size={15} className="info-box-icon" />
                  <div className="info-box-text">{provision.error}</div>
                </div>
              )}
              <button
                className="btn btn-primary"
                onClick={createProject}
                disabled={!canCreate}
                type="button"
              >
                <Play size={14} />
                {provision.status === 'error'
                  ? t('accountCreation.supabase.createBtn.retry')
                  : t('accountCreation.supabase.createBtn')}
              </button>
              {!canCreate && !projectAlreadyExists && (
                <p className="text-muted" style={{ fontSize: 'var(--font-size-sm)', margin: 0 }}>
                  {t('accountCreation.supabase.createBtn.missing')}
                </p>
              )}
              {createdByConfigurator && projectWithTypedName && (
                <div className="project-verification project-verification--ok">
                  <div className="project-create-status project-create-status--done">
                    <Check size={15} />
                    <span>{t('accountCreation.supabase.created')}</span>
                  </div>
                  <ul className="project-verification__facts">
                    <li><strong>{t('accountCreation.supabase.verify.name')}</strong> {projectWithTypedName.name}</li>
                    <li><strong>{t('accountCreation.supabase.verify.ref')}</strong> <code>{projectWithTypedName.ref}</code></li>
                    {projectWithTypedName.region && (
                      <li><strong>{t('accountCreation.supabase.verify.region')}</strong> {projectWithTypedName.region}</li>
                    )}
                  </ul>
                  <p className="text-muted" style={{ fontSize: 'var(--font-size-sm)', margin: 0 }}>
                    {t('accountCreation.supabase.created.next')}
                  </p>
                </div>
              )}

              {projectWithTypedName && !createdByConfigurator && (
                <div className="info-box existing-project-hint">
                  <Info size={15} className="info-box-icon" />
                  <div className="info-box-text">
                    <p style={{ margin: '0 0 8px' }}>
                      {t('accountCreation.supabase.nameTaken').replace('{name}', projectWithTypedName.name)}
                    </p>
                    <button
                      className="btn btn-secondary"
                      onClick={() => adoptExistingProject(projectWithTypedName.ref)}
                      type="button"
                    >
                      <ArrowRight size={14} />
                      {t('accountCreation.supabase.nameTaken.switch')}
                    </button>
                  </div>
                </div>
              )}

              {/* Below the button, where it reads as a consequence of pressing
                  it rather than as a banner to scroll past. */}
              <div className="info-box warning">
                <AlertTriangle size={15} className="info-box-icon" />
                <div className="info-box-text">{t('accountCreation.supabase.createWarning')}</div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
