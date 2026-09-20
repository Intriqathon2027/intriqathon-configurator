import type { BrowserWindow } from 'electron'
import { SupabaseApiClient, SupabaseApiError } from './supabase/SupabaseApiClient'
import { Redactor } from './supabase/redact'
import {
  GRANTS_SQL,
  PUBLIC_TABLE_COUNT_SQL,
  PUBLIC_TABLES_SQL,
  REALTIME_CHECK_SQL,
  REALTIME_PUBLICATION,
  REALTIME_TABLE,
  RLS_ENABLE_SQL,
  RLS_PENDING_SQL,
  realtimeAddSql,
  withPublicSchema,
  type PendingRlsRow,
  type PublicTableCountRow,
  type RealtimeCheckRow,
} from '../../shared/supabaseSiteSetup'
import { findLegacyServiceKey } from './supabase/keys'

const SERVICE = 'supabase-site'

/**
 * How long the run will wait for a deployment's migrations to land. Prisma
 * applies them as the stack comes up, which is seconds after the deploy step
 * reports success — but the containers are still settling, and a reader who
 * moves straight on to this step arrives first.
 */
const MIGRATION_POLL_INTERVAL_MS = 4_000
const MIGRATION_TIMEOUT_MS = 2 * 60_000

/**
 * How the run gets its API client. Injectable for the tests, which exercise the
 * "already configured" and "deployment not run yet" paths — states that only a
 * live project can otherwise produce.
 */
export type SupabaseClientFactory = (opts: { accessToken: string; signal?: AbortSignal }) => SupabaseApiClient

export interface SupabaseSiteSetupRequest {
  /** Same rule as the provisioning service: passed in, never read from disk. */
  accessToken: string
  /** The project the wizard works against — `SUPABASE_PROJECT_REF`. */
  ref: string
  /**
   * A deployment ran in this session, so tables are expected and worth waiting
   * for. Without it an empty schema is reported at once instead.
   */
  awaitMigrations?: boolean
}

/**
 * The tail end of the Supabase setup: what has to be true of the project *after*
 * the deployment has migrated the database — privileges, the exposed schema,
 * Realtime on the announcements table, email confirmation off, RLS everywhere.
 *
 * Each step is written to be re-runnable: it reads the current state first and
 * only changes what is not already right, so pressing "Lancer" twice is a no-op
 * rather than a second, differently-broken configuration.
 */
export class SupabaseSiteSetupService {
  private controller: AbortController | null = null
  private redactor = new Redactor()

  private readonly createClient: SupabaseClientFactory

  constructor(createClient: SupabaseClientFactory = opts => new SupabaseApiClient(opts)) {
    this.createClient = createClient
  }

  isRunning(): boolean {
    return this.controller !== null
  }

  cancel(): void {
    this.controller?.abort()
    this.controller = null
  }

  private log(win: BrowserWindow, message: string, level: 'info' | 'done' | 'error' = 'info'): void {
    win.webContents.send('provision:log', {
      service: SERVICE,
      message: this.redactor.redact(message),
      level,
    })
  }

  private progress(win: BrowserWindow, value: number): void {
    win.webContents.send('provision:progress', { service: SERVICE, value })
  }

  private wasCancelled(): boolean {
    return this.controller?.signal.aborted ?? false
  }

  /** Between two steps — a cancel in flight must not start the next one. */
  private checkpoint(): void {
    if (this.wasCancelled()) throw new DOMException('Aborted', 'AbortError')
  }

  async start(win: BrowserWindow, req: SupabaseSiteSetupRequest): Promise<void> {
    this.cancel()
    this.controller = new AbortController()
    this.redactor = new Redactor().add(req.accessToken)

    const client = this.createClient({
      accessToken: req.accessToken,
      signal: this.controller.signal,
    })

    try {
      if (!req.ref) {
        throw new Error("Aucun projet Supabase sélectionné — renseignez la référence du projet à l'étape 1.")
      }

      this.progress(win, 5)
      const project = await client.getProject(req.ref)
      this.log(win, `Projet ${project.name} (${project.ref}) — configuration finale…`)

      // What the run could not apply. Collected rather than thrown on the spot:
      // the remaining steps are independent, and a reader is better served by
      // one report of everything that is left than by a stop at the first gap.
      const pending: string[] = []

      this.checkpoint()
      await this.awaitMigratedTables(win, client, req)

      this.checkpoint()
      await this.applyGrants(win, client, req.ref)

      this.checkpoint()
      await this.exposePublicSchema(win, client, req.ref)

      this.checkpoint()
      await this.enableRealtime(win, client, req.ref, pending)

      this.checkpoint()
      await this.disableEmailConfirmation(win, client, req.ref)

      this.checkpoint()
      await this.enableRowLevelSecurity(win, client, req.ref)

      // Fetched before the report below: a Realtime gap has nothing to do with
      // the key, and failing the run should not cost the reader the one value
      // the next screen asks for.
      this.checkpoint()
      const panelServiceKey = await this.resolvePanelServiceKey(win, client, req.ref)

      if (pending.length > 0) {
        throw new Error(
          `Configuration appliquée, sauf : ${pending.join(' ; ')}. Voir « Configuration manuelle » pour terminer.`,
        )
      }

      this.progress(win, 100)
      this.log(win, 'Configuration du site Supabase terminée.', 'done')
      win.webContents.send('provision:done', {
        service: SERVICE,
        patch: {
          SUPABASE_SITE_SETUP_AT: new Date().toISOString(),
          ...(panelServiceKey ? { SUPABASE_PANEL_SERVICE_KEY: panelServiceKey } : {}),
        },
      })
    } catch (err) {
      if (this.wasCancelled()) {
        this.log(win, 'Configuration annulée.', 'info')
        win.webContents.send('provision:cancelled', { service: SERVICE })
      } else {
        const message = err instanceof SupabaseApiError || err instanceof Error ? err.message : String(err)
        this.log(win, message, 'error')
        win.webContents.send('provision:error', { service: SERVICE, message: this.redactor.redact(message) })
      }
    } finally {
      this.controller = null
    }
  }

  /**
   * Waits for the tables the deployment creates, when one has just run.
   *
   * Every step below is about tables: the grants apply to the ones that exist
   * at the time, Realtime needs its own, RLS covers them all. Run against a
   * schema the migrations have not filled yet, the whole thing completes on an
   * empty database and reports a Realtime it could not configure — which is
   * why running it a second time, a minute later, has always been the fix.
   * This is that minute, spent inside the run instead of by the reader.
   *
   * Only when a deployment is known to have happened in this session. Without
   * one an empty schema is not a race but a step that has not been done, and
   * saying so at once beats a minute of waiting for tables nobody created.
   */
  private async awaitMigratedTables(
    win: BrowserWindow,
    client: SupabaseApiClient,
    req: SupabaseSiteSetupRequest,
  ): Promise<void> {
    const count = async (): Promise<number> => {
      const [row] = await client.runQuery<PublicTableCountRow>(req.ref, PUBLIC_TABLE_COUNT_SQL)
      return row?.public_tables ?? 0
    }

    if ((await count()) > 0) return
    if (!req.awaitMigrations) return

    this.log(
      win,
      'Schéma public encore vide — attente des tables créées par le déploiement (jusqu\'à 2 minutes)…',
    )

    const deadline = Date.now() + MIGRATION_TIMEOUT_MS
    while (Date.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, MIGRATION_POLL_INTERVAL_MS))
      this.checkpoint()

      const tables = await count()
      if (tables > 0) {
        this.log(win, `${tables} table(s) trouvée(s) — configuration du projet.`, 'done')
        return
      }
    }

    // Not an error of its own: the steps below report what they could not do,
    // and one of them names this exact situation with what to do about it.
    this.log(win, 'Toujours aucune table dans le schéma public — poursuite de la configuration.')
  }

  // ── Step 1 — the default privileges ────────────────────────────────────

  private async applyGrants(win: BrowserWindow, client: SupabaseApiClient, ref: string): Promise<void> {
    this.log(win, 'Application des privilèges sur le schéma public…')
    await client.runQuery(ref, GRANTS_SQL)
    this.log(win, 'Privilèges appliqués (anon, authenticated, service_role).', 'done')
    this.progress(win, 25)
  }

  // ── Step 2 — the Data API's exposed schemas ────────────────────────────

  private async exposePublicSchema(win: BrowserWindow, client: SupabaseApiClient, ref: string): Promise<void> {
    this.log(win, 'Vérification des schémas exposés par la Data API…')
    const current = await client.getPostgrestConfig(ref)
    const updated = withPublicSchema(current.db_schema)

    if (!updated) {
      this.log(win, `Schéma public déjà exposé (${current.db_schema}).`, 'done')
    } else {
      await client.updatePostgrestConfig(ref, { db_schema: updated })
      this.log(win, `Schémas exposés mis à jour : ${updated}.`, 'done')
    }
    this.progress(win, 45)
  }

  // ── Step 3 — Realtime on the announcements table ───────────────────────

  private async enableRealtime(
    win: BrowserWindow,
    client: SupabaseApiClient,
    ref: string,
    pending: string[],
  ): Promise<void> {
    this.log(win, `Réplication Realtime de la table ${REALTIME_TABLE}…`)
    const [check] = await client.runQuery<RealtimeCheckRow>(ref, REALTIME_CHECK_SQL)

    if (!check?.matched_table) {
      // Two very different situations hide behind "table absente", and they call
      // for opposite moves: wait for the deployment, or point the wizard at the
      // project the deployment actually migrated.
      const reason = !check || check.public_tables === 0
        ? `le schéma public est vide — le déploiement (étape 4) n'a pas encore créé les tables. Relancez cette configuration ensuite.`
        : `table ${REALTIME_TABLE} absente parmi les ${check.public_tables} tables du schéma public (${await this.listPublicTables(client, ref)}). Vérifiez que le projet sélectionné est bien celui du déploiement.`

      this.log(win, `Realtime : ${reason}`, 'error')
      pending.push(`Realtime sur ${REALTIME_TABLE} — ${reason}`)
      this.progress(win, 60)
      return
    }

    if (!check.publication_exists) {
      const reason = `publication ${REALTIME_PUBLICATION} absente de ce projet — activez le Realtime depuis le dashboard.`
      this.log(win, `Realtime : ${reason}`, 'error')
      pending.push(`Realtime sur ${REALTIME_TABLE} — ${reason}`)
      this.progress(win, 60)
      return
    }

    if (check.already_published) {
      this.log(win, `${check.matched_table} est déjà dans ${REALTIME_PUBLICATION}.`, 'done')
    } else {
      // Published under the name Postgres reports, not the one expected here.
      await client.runQuery(ref, realtimeAddSql(check.matched_table))
      this.log(win, `${check.matched_table} ajoutée à ${REALTIME_PUBLICATION}.`, 'done')
    }
    this.progress(win, 60)
  }

  /** The public tables, named in the order Postgres lists them. */
  private async listPublicTables(client: SupabaseApiClient, ref: string): Promise<string> {
    const rows = await client.runQuery<PendingRlsRow>(ref, PUBLIC_TABLES_SQL)
    return rows.map(r => r.tablename).join(', ')
  }

  // ── Step 4 — email confirmation ────────────────────────────────────────

  private async disableEmailConfirmation(win: BrowserWindow, client: SupabaseApiClient, ref: string): Promise<void> {
    this.log(win, "Désactivation de la confirmation d'email…")
    const auth = await client.getAuthConfig(ref)

    if (auth.mailer_autoconfirm) {
      this.log(win, 'Confirmation d\'email déjà désactivée.', 'done')
    } else {
      await client.updateAuthConfig(ref, { mailer_autoconfirm: true })
      this.log(win, 'Confirmation d\'email désactivée — le compte organisateur pourra se connecter.', 'done')
    }
    this.progress(win, 80)
  }

  // ── Step 5 — row level security ────────────────────────────────────────

  private async enableRowLevelSecurity(win: BrowserWindow, client: SupabaseApiClient, ref: string): Promise<void> {
    this.log(win, 'Activation de la RLS sur les tables publiques…')
    const before = await client.runQuery<PendingRlsRow>(ref, RLS_PENDING_SQL)

    if (before.length === 0) {
      this.log(win, 'RLS déjà active sur toutes les tables publiques.', 'done')
      this.progress(win, 95)
      return
    }

    await client.runQuery(ref, RLS_ENABLE_SQL)

    // Read the list back rather than trusting the DO block: a table left
    // unprotected is exactly the failure this step exists to prevent.
    const after = await client.runQuery<PendingRlsRow>(ref, RLS_PENDING_SQL)
    if (after.length > 0) {
      throw new Error(`RLS toujours inactive sur : ${after.map(r => r.tablename).join(', ')}`)
    }

    this.log(win, `RLS activée sur ${before.length} table(s) : ${before.map(r => r.tablename).join(', ')}.`, 'done')
    this.progress(win, 95)
  }

  // ── Step 6 — the key the configuration panel can actually use ──────────

  /**
   * `config.<domain>` reads the Data API from the browser with the service key
   * it is given, and Supabase rejects a `sb_secret_…` key on any request that
   * carries an Origin. So the panel needs the JWT legacy `service_role` key,
   * even though the deployed stack rightly keeps the secret one in its .env.
   * Reading it here is what lets the card offer it ready to copy instead of
   * walking the reader through the dashboard.
   *
   * A project with the legacy keys switched off gets them switched back on —
   * the same cheap repair the provisioning step performs. Anything that goes
   * wrong here is reported and swallowed: none of the five settings above
   * depend on it, and the card's manual instructions still name the dashboard
   * page. Turning a successful configuration into a failed run over an
   * auxiliary lookup would be the worse trade.
   */
  private async resolvePanelServiceKey(
    win: BrowserWindow,
    client: SupabaseApiClient,
    ref: string,
  ): Promise<string | null> {
    try {
      this.log(win, 'Récupération de la clé service_role legacy (pour le panneau de configuration)…')
      let key = findLegacyServiceKey(await client.listApiKeys(ref))

      if (!key) {
        const legacy = await client.getLegacyKeysEnabled(ref)
        if (legacy && !legacy.enabled) {
          this.log(win, 'Clés JWT legacy désactivées — réactivation…')
          await client.setLegacyKeysEnabled(ref, true)
          key = findLegacyServiceKey(await client.listApiKeys(ref))
        }
      }

      if (!key) {
        this.log(
          win,
          'Aucune clé service_role legacy sur ce projet — le panneau de configuration indiquera comment la récupérer depuis le dashboard.',
          'error',
        )
        return null
      }

      // Registered before it can reach a log line or an error message.
      this.redactor.add(key)
      this.log(win, 'Clé service_role legacy récupérée — elle sera proposée à la copie.', 'done')
      this.progress(win, 98)
      return key
    } catch (err) {
      if (this.wasCancelled()) throw err
      const message = err instanceof SupabaseApiError || err instanceof Error ? err.message : String(err)
      this.log(win, `Clé service_role legacy indisponible : ${this.redactor.redact(message)}`, 'error')
      return null
    }
  }
}
