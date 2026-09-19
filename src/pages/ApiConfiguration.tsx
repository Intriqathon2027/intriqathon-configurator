import { useEffect, useRef, useState } from "react";
import {
  Database,
  Mail,
  Globe,
  Server,
  Info,
  AlertTriangle,
  Cpu,
  MemoryStick,
  HardDrive,
  Monitor,
  Copy,
} from "lucide-react";
import toast from "react-hot-toast";
import { WizardLayout } from "../components/layout/WizardLayout";
import { ServiceConfigBlock } from "../components/ui/ServiceConfigBlock";
import { FormField } from "../components/ui/FormField";
import { CopyRow, CopyChip } from "../components/ui/CopyBlock";
import { ExternalLinkBtn } from "../components/ui/ExternalLinkBtn";
import { useApp } from "../context/AppContext";
import { IconRowList, type IconRowItem } from "../components/ui/IconRowList";
import { useScalewayInstance } from "../hooks/useScalewayInstance";
import {
  SshKeySelector,
  type SshKeySelectorHandle,
} from "../components/ui/SshKeySelector";
import type { SshKeyInfo } from "../types/electron";
import { useServiceProvision } from "../hooks/useServiceProvision";
import { useSession } from "../context/SessionContext";
import { ManualCheck } from "../components/ui/ManualCheck";
import { ManualSection } from "../components/ui/ManualSection";
import { STORAGE_BUCKETS } from "../shared/supabaseBuckets";
import {
  BUCKETS_URL,
  SPACESHIP_LAUNCHPAD_URL,
  SPACESHIP_DNS_HELP_URL,
} from "../shared/apiConfigLinks";
import { isAccountComplete } from "../utils/serviceCompletion";
import type { Config } from "../context/AppContext";
import { ApiConfigurationHelpContent } from "../PagesHelpContent/ApiConfigurationHelpContent";

type Status = "idle" | "running" | "done" | "error";

export function ApiConfiguration() {
  const { t, config, setField, setFields, saveConfig, state } = useApp();
  const { isRunDone, markRunDone, isManualChecked, confirmManual } =
    useSession();
  const isEn = state.language === "en";

  // The automation pre-fills the very same fields the manual fallback edits, so
  // a partial or wrong result can always be corrected by hand afterwards.
  const applyPatch = (patch: Record<string, string>) => {
    const typed = patch as Partial<Config>;
    setFields(typed);
    // Values obtained from a provider are worth persisting immediately: they
    // may not be retrievable a second time (a secret key is revealed once).
    // The patch is passed explicitly — `saveConfig` alone would write the
    // pre-dispatch config and drop everything that was just retrieved.
    void saveConfig(typed);
  };

  const supabase = useServiceProvision("supabase", applyPatch);

  const domain = config.DOMAIN || "<DOMAIN>";
  const ipv4 = config.IPV4_INSTANCE || "<IPV4_INSTANCE>";
  const mailSubdomain = config.MAIL_SUBDOMAIN || `mail.${domain}`;

  /**
   * Spaceship's Host field takes the name *without* the domain — `@` for the
   * apex, `config` for the admin panel — which is also what its API documents
   * ("name of resource record excluding domain name part"). Pasting the full
   * hostname there creates `config.domain.fr.domain.fr`, a record that resolves
   * for nobody and looks right in the table.
   */
  const mailHost = mailSubdomain.endsWith(`.${domain}`)
    ? mailSubdomain.slice(0, -(domain.length + 1))
    : mailSubdomain;

  const dnsRecords = [
    {
      type: "TXT",
      host: `_dmarc.${mailHost}`,
      answer: "v=DMARC1;p=none;",
      ttl: "3600",
    },
    { type: "A", host: "@", answer: ipv4, ttl: "3600" },
    { type: "A", host: "config", answer: ipv4, ttl: "3600" },
  ];

  const specs: IconRowItem[] = [
    {
      key: "cpu",
      icon: <Cpu size={15} />,
      label: "CPU",
      text: t("step1.spec.cpu"),
    },
    {
      key: "ram",
      icon: <MemoryStick size={15} />,
      label: "RAM",
      text: t("step1.spec.ram"),
    },
    {
      key: "os",
      icon: <Monitor size={15} />,
      label: "OS",
      text: t("step1.spec.os"),
    },
    {
      key: "storage",
      icon: <HardDrive size={15} />,
      label: "Stockage",
      text: t("step1.spec.storage"),
    },
  ];

  // Completion checks — a block turns green once its values are all filled in,
  // whether they came from the automation or from the manual fallback fields.
  const isSupabaseComplete = !!(
    config.SUPABASE_URL &&
    config.SUPABASE_ANON_KEY &&
    config.SUPABASE_SERVICE_ROLE_KEY &&
    config.DATABASE_URL &&
    config.DIRECT_URL
  );
  const isScalewayComplete = !!config.IPV4_INSTANCE;
  const isResendComplete = !!(config.FROM_EMAIL && config.ALLOWED_EMAILS);
  const usesOtherDomainProvider = config.USE_OTHER_DOMAIN_PROVIDER === "true";

  /**
   * What the checkboxes carry, per block. These steps leave nothing in the
   * config — a bucket, a DNS record and a verified sending domain all live at
   * the provider — so the tick is the whole state, and it colours the block the
   * way a successful run does.
   */
  const supabaseManualDone =
    isManualChecked("supabase-buckets") && isSupabaseComplete;
  const spaceshipManualDone = isManualChecked("spaceship-dns");
  const resendManualDone =
    isManualChecked("resend-subdomain") && isResendComplete;

  // Supabase copies its Postgres URLs out with `[YOUR-PASSWORD]` still in them;
  // both fields offer to substitute the database password on the spot.
  const pwFill = {
    token: "[YOUR-PASSWORD]",
    label: t("apiConfig.supabase.pwFill.label"),
    inputPlaceholder: t("apiConfig.supabase.pwFill.placeholder"),
    btnLabel: t("apiConfig.supabase.pwFill.btn"),
  };

  // Not yet automated — these two still run on the manual fallback, and their
  // checkboxes are what say the work was done.
  const [spaceshipStatus] = useState<Status>("idle");
  const [resendStatus] = useState<Status>("idle");

  const {
    status: scalewayStatus,
    logs: scwLogs,
    progress: scwProgress,
    start: startScaleway,
    cancel: cancelScaleway,
  } = useScalewayInstance();

  const { selectedSshKey } = useApp();
  const sshSelectorRef = useRef<SshKeySelectorHandle>(null);

  const statusLabels = {
    done: t("apiConfig.status.done"),
    running: t("apiConfig.status.running"),
    error: t("apiConfig.status.error"),
  };

  /**
   * A run that succeeded earlier in this session keeps its block green after
   * the page is remounted — leaving step 2 and coming back resets the hooks,
   * not what happened. The config the run brought back is already persisted;
   * this only concerns how the block reads.
   */
  const supabaseStatus: Status =
    supabase.status === "idle" && isRunDone("api-supabase")
      ? "done"
      : supabase.status;
  const scwStatus: Status =
    scalewayStatus === "idle" && isRunDone("api-scaleway")
      ? "done"
      : scalewayStatus;

  useEffect(() => {
    if (supabase.status !== "done") return;
    markRunDone("api-supabase");
    // The run created and verified the five buckets: the box states a fact that
    // is now true, so it is ticked rather than left for the reader to repeat.
    confirmManual("supabase-buckets");
  }, [supabase.status]);

  useEffect(() => {
    if (scalewayStatus === "done") markRunDone("api-scaleway");
  }, [scalewayStatus]);

  const handleStartScaleway = async (
    keyToUse: SshKeyInfo | null = selectedSshKey,
  ) => {
    if (!config.SCW_SECRET_KEY || !config.SCW_DEFAULT_PROJECT_ID) {
      toast.error(
        isEn
          ? "Please provide your Scaleway Secret Key and Project ID in step 1."
          : "Veuillez renseigner votre clé secrète Scaleway et votre Project ID à l'étape 1.",
      );
      return;
    }

    if (!keyToUse) {
      sshSelectorRef.current?.openModal();
      toast(
        isEn
          ? "Please select an SSH key, then click Launch."
          : "Veuillez choisir une clé SSH, puis cliquez sur Lancer.",
      );
      return;
    }

    const res = await startScaleway({
      secretKey: config.SCW_SECRET_KEY,
      projectId: config.SCW_DEFAULT_PROJECT_ID,
      sshPublicKey: keyToUse.publicKey,
      sshKeyName: keyToUse.name || "intriqathon-key",
    });

    if (res.success && res.ipv4) {
      setField("IPV4_INSTANCE", res.ipv4);
      toast.success(
        isEn
          ? `Scaleway instance ready! IP: ${res.ipv4}`
          : `Instance Scaleway prête ! IP : ${res.ipv4}`,
      );
      if (window.electronAPI?.vaultSave) {
        await window.electronAPI.vaultSave({
          ...config,
          IPV4_INSTANCE: res.ipv4,
        });
      }
    } else if (res.error) {
      toast.error(res.error, { duration: 6000 });
    }
  };

  /**
   * What each automation needs before it can run.
   *
   * Supabase depends only on step 1. The other three form a chain — Scaleway
   * produces the IPv4 the DNS records point at, and Resend cannot verify its
   * domain until those records exist — so their buttons stay locked until the
   * value they consume is there. Locking the button never locks the manual
   * fields below it: when the chain is stuck, filling them in by hand is the
   * way forward.
   */
  const supabaseLock = !config.SUPABASE_ACCESS_TOKEN
    ? t("apiConfig.locked.supabaseToken")
    : !config.SUPABASE_DB_PASSWORD
      ? t("apiConfig.locked.supabasePassword")
      : !isAccountComplete(config, "supabase")
        ? t("apiConfig.locked.accountSupabase")
        : null;

  const scalewayLock =
    !config.SCW_SECRET_KEY || !config.SCW_DEFAULT_PROJECT_ID
      ? t("apiConfig.locked.scalewayKeys")
      : !isAccountComplete(config, "scaleway")
        ? t("apiConfig.locked.accountScaleway")
        : null;

  const spaceshipLock = !config.DOMAIN
    ? t("apiConfig.locked.needsDomain")
    : !isAccountComplete(config, "spaceship")
      ? t("apiConfig.locked.accountSpaceship")
      : !config.IPV4_INSTANCE
        ? t("apiConfig.locked.needsIpv4")
        : null;

  const resendLock = !isAccountComplete(config, "resend")
    ? t("apiConfig.locked.accountResend")
    : !config.DOMAIN
      ? t("apiConfig.locked.needsDomain")
      : !config.IPV4_INSTANCE
        ? t("apiConfig.locked.needsDns")
        : null;

  const handleStartSupabase = () => {
    if (supabaseLock) return;
    void supabase.startSupabase({
      accessToken: config.SUPABASE_ACCESS_TOKEN,
      dbPassword: config.SUPABASE_DB_PASSWORD,
      mode: config.SUPABASE_PROJECT_MODE === "create" ? "create" : "existing",
      // Present once a project has been resolved — reusing it is what stops a
      // second click from creating a second project.
      ref: config.SUPABASE_PROJECT_REF || undefined,
      projectName: config.SUPABASE_PROJECT_NAME,
      organizationSlug: config.SUPABASE_ORG_SLUG,
      regionCode: config.SUPABASE_REGION,
    });
  };

  const handleStart = (service: string) => {
    console.log(`Starting ${service} config...`);
  };

  const handleCancel = (service: string) => {
    console.log(`Cancelling ${service} config...`);
  };

  return (
    <WizardLayout
      title={t("apiConfig.title")}
      description={t("apiConfig.desc")}
      helpContent={<ApiConfigurationHelpContent />}
    >
      <div className="api-config-list">
        {/* Supabase */}
        <ServiceConfigBlock
          stepNumber={1}
          serviceName="SUPABASE"
          serviceIcon={<Database size={18} color="var(--color-primary-text)" />}
          description={t("apiConfig.supabase.desc")}
          status={supabaseStatus}
          isComplete={supabaseManualDone}
          manuallyConfirmed={supabaseManualDone}
          logs={supabase.logs}
          progress={supabase.progress}
          locked={!!supabaseLock}
          lockedReason={supabaseLock ?? undefined}
          errorMessage={supabase.error}
          onStart={handleStartSupabase}
          onCancel={supabase.cancel}
          btnStartLabel={t("apiConfig.btnStart")}
          btnRetryLabel={t("apiConfig.btnRetry")}
          btnRerunLabel={t("apiConfig.btnRerun")}
          btnCancelLabel={t("apiConfig.btnCancel")}
          statusLabels={statusLabels}
          helpAnchor="svc-supabase"
          helpHint={t("apiConfig.supabase.helpHint")}
          manualLabel={t("apiConfig.manualConfig")}
        >
          <div className="form-section">
            {/* The buckets have to exist before anything is uploaded — same
                walkthrough as the help panel, kept at hand in the card. */}
            <ManualSection
              title={t("apiConfig.supabase.buckets.title")}
              desc={t("apiConfig.supabase.buckets.desc")}
            >
              <ul className="bucket-list">
                {STORAGE_BUCKETS.map((b) => (
                  <li key={b.name}>
                    <CopyChip value={b.name} />
                    <span className="bucket-list__note">
                      {b.isPublic ? (
                        <>
                          <strong>
                            {t("apiConfig.supabase.buckets.public")}
                          </strong>{" "}
                          — {isEn ? b.en : b.fr}
                        </>
                      ) : (
                        <>
                          {t("apiConfig.supabase.buckets.private")} —{" "}
                          {isEn ? b.en : b.fr}
                        </>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="link-buttons-row">
                <ExternalLinkBtn
                  url={BUCKETS_URL}
                  label={t("apiConfig.supabase.buckets.btn")}
                />
              </div>
              {/* The buckets leave nothing in the config — without this box,
                  nothing downstream can tell they exist. */}
              <ManualCheck
                checkKey="supabase-buckets"
                label={
                  isEn
                    ? `The ${STORAGE_BUCKETS.length} buckets exist, with these exact names`
                    : `Les ${STORAGE_BUCKETS.length} buckets sont créés, avec exactement ces noms`
                }
              />
            </ManualSection>

            <ManualSection
              title={isEn ? "Connection values" : "Valeurs de connexion"}
              desc={
                isEn
                  ? "From the project: the Connect panel for the URL and the Postgres URLs, Project Settings ➔ API Keys for the keys."
                  : "Depuis le projet : le panneau Connect pour l'URL et les URLs Postgres, Project Settings ➔ API Keys pour les clés."
              }
            >
              <FormField
                id="supabase-url"
                label={t("apiConfig.supabase.url")}
                value={config.SUPABASE_URL}
                onChange={(v) => setField("SUPABASE_URL", v)}
                placeholder="https://xyz.supabase.co"
              />
              <FormField
                id="supabase-anon"
                label={t("apiConfig.supabase.anonKey")}
                value={config.SUPABASE_ANON_KEY}
                onChange={(v) => setField("SUPABASE_ANON_KEY", v)}
                placeholder="eyJhbG..."
                multiline
                rows={2}
              />
              <FormField
                id="supabase-service"
                label={t("apiConfig.supabase.serviceKey")}
                value={config.SUPABASE_SERVICE_ROLE_KEY}
                onChange={(v) => setField("SUPABASE_SERVICE_ROLE_KEY", v)}
                placeholder="eyJhbG..."
                type="password"
                multiline
                rows={2}
              />
              <FormField
                id="database-url"
                label={t("apiConfig.supabase.databaseUrl")}
                value={config.DATABASE_URL}
                onChange={(v) => setField("DATABASE_URL", v)}
                placeholder="postgresql://..."
                type="password"
                multiline
                rows={2}
                tokenFill={pwFill}
              />
              <FormField
                id="direct-url"
                label={t("apiConfig.supabase.directUrl")}
                value={config.DIRECT_URL}
                onChange={(v) => setField("DIRECT_URL", v)}
                placeholder="postgresql://..."
                type="password"
                multiline
                rows={2}
                tokenFill={pwFill}
              />
            </ManualSection>
          </div>
        </ServiceConfigBlock>

        {/* Scaleway */}
        <ServiceConfigBlock
          stepNumber={2}
          serviceName="SCALEWAY"
          serviceIcon={<Server size={18} color="var(--color-primary-text)" />}
          description={t("apiConfig.scaleway.desc")}
          status={scwStatus}
          isComplete={isScalewayComplete}
          locked={!!scalewayLock}
          lockedReason={scalewayLock ?? undefined}
          onStart={() => handleStartScaleway()}
          onCancel={cancelScaleway}
          logs={scwLogs}
          progress={scwProgress}
          btnStartLabel={t("apiConfig.btnStart")}
          btnRerunLabel={t("apiConfig.btnRerun")}
          btnCancelLabel={t("apiConfig.btnCancel")}
          statusLabels={statusLabels}
          helpAnchor="svc-scaleway"
          helpHint={t("apiConfig.scaleway.helpHint")}
          extra={
            <SshKeySelector
              ref={sshSelectorRef}
              label={
                isEn ? "Authentication SSH key" : "Clé SSH d'authentification"
              }
            />
          }
          manualLabel={t("apiConfig.manualConfig")}
        >
          <div className="form-section">
            <FormField
              id="ipv4"
              label={t("apiConfig.spaceship.ipv4")}
              value={config.IPV4_INSTANCE}
              onChange={(v) => setField("IPV4_INSTANCE", v)}
              placeholder="198.51.100.1"
            />

            <ManualSection title={t("step1.specs.title")}>
              <IconRowList items={specs} />
            </ManualSection>
          </div>
        </ServiceConfigBlock>

        {/* Spaceship — or whichever registrar holds the domain, once step 1
            says another provider will handle it */}
        <ServiceConfigBlock
          stepNumber={3}
          serviceName={
            usesOtherDomainProvider ? t("apiConfig.domainProvider.title") : "SPACESHIP"
          }
          serviceIcon={<Globe size={18} color="var(--color-primary-text)" />}
          description={t("apiConfig.spaceship.desc")}
          status={spaceshipStatus}
          manuallyConfirmed={spaceshipManualDone}
          locked={!usesOtherDomainProvider && !!spaceshipLock}
          lockedReason={spaceshipLock ?? undefined}
          manualOnly={usesOtherDomainProvider}
          onStart={() => handleStart("Spaceship")}
          onCancel={() => handleCancel("Spaceship")}
          btnStartLabel={t("apiConfig.btnStart")}
          btnCancelLabel={t("apiConfig.btnCancel")}
          statusLabels={statusLabels}
          helpAnchor="svc-spaceship"
          helpHint={t("apiConfig.spaceship.helpHint")}
          manualLabel={usesOtherDomainProvider ? undefined : t("apiConfig.manualConfig")}
        >
          <div className="form-section">
            <ManualSection
              title={t("step4.dns.title")}
              desc={t("apiConfig.spaceship.dnsPath")}
            >
              {!usesOtherDomainProvider && (
                <div className="link-buttons-row">
                  <ExternalLinkBtn
                    url={SPACESHIP_LAUNCHPAD_URL}
                    label="Launchpad"
                  />
                  <ExternalLinkBtn
                    url={SPACESHIP_DNS_HELP_URL}
                    label={isEn ? "Spaceship DNS help" : "Aide DNS Spaceship"}
                  />
                </div>
              )}
              <table className="dns-table">
                <thead>
                  <tr>
                    <th>{t("step4.dns.type")}</th>
                    <th>{t("step4.dns.host")}</th>
                    <th>{t("step4.dns.answer")}</th>
                    <th>{t("step4.dns.ttl")}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {dnsRecords.map((rec, i) => (
                    <tr key={i}>
                      <td>
                        <span className="dns-table__type">{rec.type}</span>
                      </td>
                      <td>{rec.host}</td>
                      <td>{rec.answer}</td>
                      <td>{rec.ttl}</td>
                      <td>
                        <button
                          className="btn btn-copy"
                          onClick={() =>
                            navigator.clipboard.writeText(
                              `${rec.type},${rec.host},${rec.answer},${rec.ttl}`,
                            )
                          }
                          title={
                            isEn
                              ? "Copy the whole row"
                              : "Copier la ligne entière"
                          }
                        >
                          <Copy size={11} />
                          {t("btn.copy")}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="info-box info">
                <Info size={15} className="info-box-icon" />
                <div className="info-box-text">
                  {t("apiConfig.spaceship.hostNote")}
                </div>
              </div>
              <div className="info-box warning">
                <AlertTriangle size={15} className="info-box-icon" />
                <div className="info-box-text">{t("step4.warning")}</div>
              </div>
              <ManualCheck
                checkKey="spaceship-dns"
                label={
                  isEn
                    ? "These records are added in Advanced DNS"
                    : "Ces enregistrements sont ajoutés dans Advanced DNS"
                }
              />
            </ManualSection>
          </div>
        </ServiceConfigBlock>

        {/* Resend */}
        <ServiceConfigBlock
          stepNumber={4}
          serviceName="RESEND"
          serviceIcon={<Mail size={18} color="var(--color-primary-text)" />}
          description={t("apiConfig.resend.desc")}
          status={resendStatus}
          isComplete={resendManualDone}
          manuallyConfirmed={resendManualDone}
          locked={!!resendLock}
          lockedReason={resendLock ?? undefined}
          onStart={() => handleStart("Resend")}
          onCancel={() => handleCancel("Resend")}
          btnStartLabel={t("apiConfig.btnStart")}
          btnCancelLabel={t("apiConfig.btnCancel")}
          statusLabels={statusLabels}
          helpAnchor="svc-resend"
          helpHint={t("apiConfig.resend.helpHint")}
          manualLabel={t("apiConfig.manualConfig")}
        >
          <div className="form-section">
            <ManualSection
              title={t("step4.subdomain")}
            >
              <CopyRow content={mailSubdomain} />
              <ManualCheck
                checkKey="resend-subdomain"
                label={
                  isEn
                    ? "This subdomain is added in Resend and verified"
                    : "Ce sous-domaine est ajouté dans Resend et vérifié"
                }
              />
            </ManualSection>

            <ManualSection
              title={isEn ? "Sending settings" : "Réglages d'envoi"}
            >
              <FormField
                id="from-email"
                label={t("apiConfig.supabase.fromEmail")}
                value={config.FROM_EMAIL}
                onChange={(v) => setField("FROM_EMAIL", v)}
                placeholder="Hackathon Team <onboarding@mail.domain.com>"
              />
              <FormField
                id="allowed-emails"
                label={t("apiConfig.supabase.allowedEmails")}
                value={config.ALLOWED_EMAILS}
                onChange={(v) => setField("ALLOWED_EMAILS", v)}
                placeholder="*"
              />
            </ManualSection>
          </div>
        </ServiceConfigBlock>
      </div>
    </WizardLayout>
  );
}
