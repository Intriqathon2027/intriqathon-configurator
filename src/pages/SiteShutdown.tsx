import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle,
  Database,
  Globe,
  Loader,
  Mail,
  RotateCcw,
  Server,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import { WizardLayout } from "../components/layout/WizardLayout";
import { ServiceAccountCard } from "../components/ui/ServiceAccountCard";
import {
  WarningDialog,
  type WarningDialogItem,
} from "../components/ui/WarningDialog";
import { ShutdownCard } from "../components/shutdown/ShutdownCard";
import { StatusBox } from "../components/shutdown/StatusBox";
import { DnsRecordList } from "../components/shutdown/DnsRecordList";
import { useApp } from "../context/AppContext";
import { useSession, type RunKey } from "../context/SessionContext";
import { useAutomationLocked } from "../context/AutomationLockContext";
import { useTeardown } from "../hooks/useTeardown";
import { buildInfraDnsRecords, type DnsRecord } from "../shared/dnsRecords";
import type {
  ScalewayBlockVolume,
  TeardownRequest,
  TeardownService,
} from "../types/teardown";
import { SiteShutdownHelpContent } from "../PagesHelpContent/SiteShutdownHelpContent";

/** How often a deletion still under way at the provider is checked again. */
const PENDING_RECHECK_MS = 15_000;

const RUN_KEYS: Record<TeardownService, RunKey> = {
  supabase: "shutdown-supabase",
  scaleway: "shutdown-scaleway",
  resend: "shutdown-resend",
  spaceship: "shutdown-spaceship",
};

/** A volume as the dialog and the card name it: its name, then its size. */
function volumeLabel(volume: ScalewayBlockVolume): string {
  const name = volume.name || volume.id;
  // Scaleway bills in decimal gigabytes.
  return volume.size ? `${name} — ${Math.round(volume.size / 1e9)} GB` : name;
}

/** What Resend asked to be published, as its run saved it. */
function parseRecords(raw: string): DnsRecord[] {
  if (!raw) return [];
  try {
    return JSON.parse(raw) as DnsRecord[];
  } catch {
    return [];
  }
}

export function SiteShutdown() {
  const { t, config } = useApp();
  const { markRunDone, clearRun, isManualChecked, setManualCheck } =
    useSession();
  const automationLocked = useAutomationLocked();
  const [confirming, setConfirming] = useState<TeardownService | null>(null);

  const usesOtherDomainProvider = config.USE_OTHER_DOMAIN_PROVIDER === "true";
  const supabaseAdopted = config.SUPABASE_PROJECT_MODE !== "create";

  /**
   * The deployment's DNS records: its own, plus whatever Resend asked for. The
   * IPv4 is only a value here — records are matched on name and type — so an
   * instance already deleted does not stop its records being found.
   */
  const dnsRecords = useMemo<DnsRecord[]>(() => {
    if (!config.DOMAIN) return [];
    const mailSubdomain = config.MAIL_SUBDOMAIN || `mail.${config.DOMAIN}`;
    return [
      ...buildInfraDnsRecords(
        config.DOMAIN,
        config.IPV4_INSTANCE || "<IPV4_INSTANCE>",
        mailSubdomain,
      ),
      ...parseRecords(config.RESEND_DNS_RECORDS),
    ];
  }, [
    config.DOMAIN,
    config.MAIL_SUBDOMAIN,
    config.IPV4_INSTANCE,
    config.RESEND_DNS_RECORDS,
  ]);

  /**
   * One entry per service that has something to point at. A service with no
   * target — no project reference, no instance, no domain — was never set up
   * through the wizard, and its card says there is nothing to delete.
   * Credentials are passed as they are: a missing one comes back from the
   * probe as an explained "cannot check", not as a silent green card.
   */
  const request = useMemo<TeardownRequest>(() => {
    const req: TeardownRequest = {};
    if (config.SUPABASE_PROJECT_REF) {
      req.supabase = {
        accessToken: config.SUPABASE_ACCESS_TOKEN,
        ref: config.SUPABASE_PROJECT_REF,
      };
    }
    if (config.SCW_SERVER_ID || config.IPV4_INSTANCE) {
      req.scaleway = {
        secretKey: config.SCW_SECRET_KEY,
        serverId: config.SCW_SERVER_ID || undefined,
        zone: config.SCW_ZONE || undefined,
        ipv4: config.IPV4_INSTANCE || undefined,
      };
    }
    if (
      config.MAIL_SUBDOMAIN &&
      (config.RESEND_DOMAIN_ID || config.RESEND_API_KEY)
    ) {
      req.resend = {
        apiKey: config.RESEND_API_KEY,
        mailSubdomain: config.MAIL_SUBDOMAIN,
        domainId: config.RESEND_DOMAIN_ID || undefined,
      };
    }
    if (!usesOtherDomainProvider && config.DOMAIN && dnsRecords.length > 0) {
      req.spaceship = {
        apiKey: config.SPACESHIP_API_KEY,
        apiSecret: config.SPACESHIP_API_SECRET,
        domain: config.DOMAIN,
        records: dnsRecords,
      };
    }
    return req;
  }, [
    config.SUPABASE_PROJECT_REF,
    config.SUPABASE_ACCESS_TOKEN,
    config.SCW_SERVER_ID,
    config.SCW_ZONE,
    config.SCW_SECRET_KEY,
    config.IPV4_INSTANCE,
    config.MAIL_SUBDOMAIN,
    config.RESEND_DOMAIN_ID,
    config.RESEND_API_KEY,
    config.DOMAIN,
    config.SPACESHIP_API_KEY,
    config.SPACESHIP_API_SECRET,
    usesOtherDomainProvider,
    dnsRecords,
  ]);

  const { states, probe, remove, removeVolumes } = useTeardown(request);

  /**
   * Block Storage volumes are only detached by the instance deletion: they
   * keep their data and their billing. Deleting them is offered as a second,
   * separate question once the instance is gone — raised on its own right
   * after, and reachable again from the card if it was turned down.
   */
  const detachedVolumes = states.scaleway?.detachedVolumes ?? [];
  const [volumesDialogOpen, setVolumesDialogOpen] = useState(false);
  const [volumesDeleting, setVolumesDeleting] = useState(false);

  const deleteVolumes = async () => {
    setVolumesDialogOpen(false);
    setVolumesDeleting(true);
    const result = await removeVolumes(detachedVolumes);
    setVolumesDeleting(false);
    if (!result) return;
    if (result.failed.length === 0) toast.success(t("shutdown.volumes.deleted"));
    else
      toast.error(
        `${t("shutdown.volumes.failed")} — ${result.failed.map((v) => `${v.name ?? v.id} (${v.error})`).join(", ")}`,
        { duration: 8000 },
      );
  };

  const manualDnsDone = isManualChecked("shutdown-dns-manual");

  /** Green: the provider says it is gone, or there was never anything there. */
  const isGone = (service: TeardownService): boolean => {
    if (service === "spaceship" && usesOtherDomainProvider)
      return manualDnsDone || !config.DOMAIN;
    if (!request[service]) return true;
    return states[service]?.status === "absent";
  };

  const gone: Record<TeardownService, boolean> = {
    supabase: isGone("supabase"),
    scaleway: isGone("scaleway"),
    resend: isGone("resend"),
    spaceship: isGone("spaceship"),
  };

  /**
   * The sidebar's tick reads the session, not this page. Only a provider
   * reporting the resource back takes a card's mark away — a check in flight
   * says nothing either way.
   */
  useEffect(() => {
    for (const service of Object.keys(RUN_KEYS) as TeardownService[]) {
      if (gone[service]) markRunDone(RUN_KEYS[service]);
      else if (
        states[service]?.status === "present" ||
        (service === "spaceship" && usesOtherDomainProvider)
      ) {
        clearRun(RUN_KEYS[service]);
      }
    }
  });

  const confirmItems: Record<TeardownService, WarningDialogItem[]> = {
    supabase: [
      {
        key: "ref",
        chip: t("shutdown.supabase.target"),
        label: states.supabase?.detail ?? config.SUPABASE_PROJECT_REF,
      },
      { key: "what", label: t("shutdown.supabase.what") },
    ],
    scaleway: [
      {
        key: "server",
        chip: t("shutdown.scaleway.target"),
        label:
          states.scaleway?.detail ??
          (config.SCW_SERVER_ID || config.IPV4_INSTANCE),
      },
      { key: "what", label: t("shutdown.scaleway.what") },
    ],
    resend: [
      {
        key: "domain",
        chip: t("shutdown.resend.target"),
        label: states.resend?.detail ?? config.MAIL_SUBDOMAIN,
      },
      { key: "what", label: t("shutdown.resend.what") },
    ],
    spaceship: [
      {
        key: "records",
        chip: t("shutdown.spaceship.target"),
        label: states.spaceship?.detail ?? config.DOMAIN,
      },
      { key: "what", label: t("shutdown.spaceship.what") },
    ],
  };

  const proceed = async () => {
    const service = confirming;
    setConfirming(null);
    if (!service) return;
    const outcome = await remove(service);
    if (outcome?.status === "absent")
      toast.success(t("shutdown.toast.deleted"));
    else if (outcome?.status === "error" && outcome.error)
      toast.error(outcome.error, { duration: 6000 });
    if (service === "scaleway" && (outcome?.detachedVolumes?.length ?? 0) > 0)
      setVolumesDialogOpen(true);
  };

  const dnsLabels = {
    type: t("step4.dns.type"),
    host: t("step4.dns.host"),
    answer: t("step4.dns.answer"),
  };

  const anyChecking = Object.values(states).some(
    (s) => s?.status === "checking",
  );

  /**
   * A deletion the provider is still carrying out finishes without anyone
   * pressing anything — so the page keeps asking until it has, rather than
   * leaving the card waiting on a "Revérifier" nobody knows to press.
   */
  const anyPending = Object.values(states).some(
    (s) => s?.status === "pending",
  );
  useEffect(() => {
    if (!anyPending || automationLocked) return;
    const timer = window.setInterval(() => void probe(), PENDING_RECHECK_MS);
    return () => window.clearInterval(timer);
  }, [anyPending, automationLocked, probe]);

  return (
    <WizardLayout
      title={t("shutdown.title")}
      description={t("shutdown.desc")}
      helpContent={<SiteShutdownHelpContent />}
    >
      <div className="shutdown-toolbar">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => void probe()}
          disabled={automationLocked || anyChecking}
          id="btn-shutdown-recheck"
        >
          <RotateCcw size={14} />
          {t("shutdown.recheck")}
        </button>
      </div>

      <div className="service-account-grid shutdown-grid">
        {/* DNS first: records pointing at a released IPv4 would send the
            domain's visitors to whoever is handed that address next. */}
        {usesOtherDomainProvider ? (
          <ServiceAccountCard
            serviceName={t("shutdown.dns.otherTitle")}
            serviceIcon={<Globe size={16} color="var(--color-primary-text)" />}
            helpAnchor="shutdown-spaceship"
            isComplete={gone.spaceship}
          >
            <div className="form-section">
              <p className="shutdown-card__what">
                {t("shutdown.dns.otherWhat")}
              </p>
              {config.DOMAIN ? (
                <>
                  <DnsRecordList records={dnsRecords} labels={dnsLabels} />
                  <label
                    className={`manual-check${manualDnsDone ? " manual-check--done" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={manualDnsDone}
                      onChange={(e) =>
                        setManualCheck("shutdown-dns-manual", e.target.checked)
                      }
                    />
                    <span className="manual-check__label">
                      {t("shutdown.dns.otherCheck")}
                    </span>
                  </label>
                </>
              ) : (
                <StatusBox tone="success" icon={<CheckCircle size={15} />}>
                  {t("shutdown.status.nothing")}
                </StatusBox>
              )}
            </div>
          </ServiceAccountCard>
        ) : (
          <ShutdownCard
            service="spaceship"
            title={t("shutdown.spaceship.title")}
            icon={<Globe size={16} color="var(--color-primary-text)" />}
            what={t("shutdown.spaceship.what")}
            target={config.DOMAIN}
            targetLabel={t("shutdown.spaceship.domain")}
            requested={!!request.spaceship}
            state={states.spaceship}
            complete={gone.spaceship}
            locked={automationLocked}
            onDelete={() => setConfirming("spaceship")}
          />
        )}

        <ShutdownCard
          service="resend"
          title={t("shutdown.resend.title")}
          icon={<Mail size={16} color="var(--color-primary-text)" />}
          what={t("shutdown.resend.what")}
          target={config.MAIL_SUBDOMAIN}
          targetLabel={t("shutdown.resend.target")}
          requested={!!request.resend}
          state={states.resend}
          complete={gone.resend}
          locked={automationLocked}
          onDelete={() => setConfirming("resend")}
        />

        <ShutdownCard
          service="scaleway"
          title={t("shutdown.scaleway.title")}
          icon={<Server size={16} color="var(--color-primary-text)" />}
          what={t("shutdown.scaleway.what")}
          target={config.IPV4_INSTANCE || config.SCW_SERVER_ID}
          targetLabel={t("shutdown.scaleway.target")}
          note={
            !config.SCW_SERVER_ID && config.IPV4_INSTANCE
              ? t("shutdown.scaleway.byIp")
              : undefined
          }
          requested={!!request.scaleway}
          state={states.scaleway}
          complete={gone.scaleway}
          locked={automationLocked}
          busy={volumesDeleting}
          onDelete={() => setConfirming("scaleway")}
          extra={
            detachedVolumes.length > 0 && (
              <div className="shutdown-card__warnings">
                <span className="shutdown-card__target-label">
                  {t("shutdown.volumes.left")}
                </span>
                <ul>
                  {detachedVolumes.map((v) => (
                    <li key={v.id}>{volumeLabel(v)}</li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => setVolumesDialogOpen(true)}
                  disabled={automationLocked}
                  id="btn-shutdown-scaleway-volumes"
                >
                  {volumesDeleting ? (
                    <Loader size={14} className="service-config-block__spinner" />
                  ) : (
                    <Trash2 size={14} />
                  )}
                  {volumesDeleting
                    ? t("shutdown.volumes.deleting")
                    : t("shutdown.volumes.btn")}
                </button>
              </div>
            )
          }
        />

        {/* Last: it holds the participants' data, and nothing above needs it. */}
        <ShutdownCard
          service="supabase"
          title={t("shutdown.supabase.title")}
          icon={<Database size={16} color="var(--color-primary-text)" />}
          what={t("shutdown.supabase.what")}
          target={config.SUPABASE_PROJECT_REF}
          targetLabel={t("shutdown.supabase.target")}
          warning={
            supabaseAdopted && !!request.supabase
              ? t("shutdown.supabase.adoptedWarning")
              : undefined
          }
          requested={!!request.supabase}
          state={states.supabase}
          complete={gone.supabase}
          locked={automationLocked}
          onDelete={() => setConfirming("supabase")}
        />
      </div>

      {confirming && (
        <WarningDialog
          title={t("shutdown.dialog.title")}
          intro={
            confirming === "supabase" && supabaseAdopted
              ? t("shutdown.supabase.adoptedWarning")
              : t("shutdown.dialog.intro")
          }
          items={confirmItems[confirming]}
          note={t("shutdown.dialog.note")}
          cancelLabel={t("shutdown.dialog.cancel")}
          proceedLabel={t("shutdown.dialog.proceed")}
          proceedIcon={<Trash2 size={14} />}
          idPrefix={`shutdown-${confirming}`}
          onCancel={() => setConfirming(null)}
          onProceed={() => void proceed()}
        />
      )}

      {volumesDialogOpen && detachedVolumes.length > 0 && (
        <WarningDialog
          title={t("shutdown.volumes.title")}
          intro={t("shutdown.volumes.intro")}
          items={detachedVolumes.map((v) => ({
            key: v.id,
            chip: t("shutdown.volumes.chip"),
            label: volumeLabel(v),
          }))}
          note={t("shutdown.volumes.note")}
          cancelLabel={t("shutdown.volumes.keep")}
          proceedLabel={t("shutdown.volumes.proceed")}
          proceedIcon={<Trash2 size={14} />}
          idPrefix="shutdown-scaleway-volumes"
          onCancel={() => setVolumesDialogOpen(false)}
          onProceed={() => void deleteVolumes()}
        />
      )}
    </WizardLayout>
  );
}
