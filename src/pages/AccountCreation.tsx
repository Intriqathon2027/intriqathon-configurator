import { useEffect, useState } from "react";
import { Database, Mail, Globe, Server, FolderOpen } from "lucide-react";
import toast from "react-hot-toast";
import { WizardLayout } from "../components/layout/WizardLayout";
import { FormField } from "../components/ui/FormField";
import { ServiceAccountCard } from "../components/ui/ServiceAccountCard";
import { useApp } from "../context/AppContext";
import { SupabaseProjectSetup } from "../components/provision/SupabaseProjectSetup";
import { CredentialWarning } from "../components/ui/CredentialWarning";
import { isAccountComplete } from "../utils/serviceCompletion";
import type { CredentialState } from "../types/credentials";
import { AccountCreationHelpContent } from "../PagesHelpContent/AccountCreationHelpContent";

export function AccountCreation() {
  const { t, config, setField, hasSavedConfig } = useApp();
  // Shared with the project picker below: while this box is already saying
  // the token is refused, the picker's own fetches fail for the very same
  // reason and have nothing to add by repeating it.
  const [supabaseTokenState, setSupabaseTokenState] = useState<CredentialState>("unknown");

  useEffect(() => {
    if (!hasSavedConfig) {
      toast(t("accountCreation.help.toast"), {
        icon: "💡",
        duration: 6000,
        id: "help-toast",
      });
    }
  }, [hasSavedConfig, t]);

  const openFolderDialog = async () => {
    if (window.electronAPI) {
      const path = await window.electronAPI.openFolderDialog();
      if (path) setField("DEPLOY_PATH", path);
    }
  };

  // Completion checks — the rule itself lives in `serviceCompletion`, where the
  // automations of steps 2 and 8 read it to decide whether they may run at all.
  const defaultMailSubdomain = `mail.${config.DOMAIN || "votredomaine.fr"}`;

  /**
   * The fields being filled in is not the same claim as the token working —
   * a project created earlier, on a token since revoked or mistyped, still
   * has every field on file. `!== "invalid"` rather than `=== "valid"`, so a
   * check still in flight or a provider that could not be reached does not
   * itself grey out a card whose fields are otherwise complete.
   */
  const isSupabaseComplete =
    isAccountComplete(config, "supabase") && supabaseTokenState !== "invalid";
  const isResendComplete = isAccountComplete(config, "resend");
  const isSpaceshipComplete = isAccountComplete(config, "spaceship");
  const isScalewayComplete = isAccountComplete(config, "scaleway");
  const usesOtherDomainProvider = config.USE_OTHER_DOMAIN_PROVIDER === "true";

  return (
    <WizardLayout
      title={t("accountCreation.title")}
      description={t("accountCreation.desc")}
      helpContent={<AccountCreationHelpContent />}
    >
      <div className="service-account-grid">
        {/* Supabase */}
        <ServiceAccountCard
          serviceName={t("accountCreation.supabase.title")}
          serviceIcon={<Database size={16} color="var(--color-primary-text)" />}
          helpAnchor="svc-supabase"
          isComplete={isSupabaseComplete}
        >
          <div className="form-section">
            <FormField
              id="supabase-pat"
              label={t("accountCreation.supabase.pat")}
              value={config.SUPABASE_ACCESS_TOKEN}
              onChange={(v) => setField("SUPABASE_ACCESS_TOKEN", v)}
              placeholder="sbp_abc123..."
              type="password"
            />

            {/* Silent while the token works. A key that is merely present is
                what colours the card; this is the provider's own verdict. */}
            <CredentialWarning
              request={
                config.SUPABASE_ACCESS_TOKEN
                  ? { service: "supabase", accessToken: config.SUPABASE_ACCESS_TOKEN }
                  : null
              }
              message={t("accountCreation.invalid.supabase")}
              onStateChange={setSupabaseTokenState}
            />

            {/* The project itself: adopted or created from here, plus the
                database password that makes step 2 fully automatic. */}
            <SupabaseProjectSetup />
          </div>
        </ServiceAccountCard>

        {/* Scaleway */}
        <ServiceAccountCard
          serviceName={t("accountCreation.scaleway.title")}
          serviceIcon={<Server size={16} color="var(--color-primary-text)" />}
          helpAnchor="svc-scaleway"
          isComplete={isScalewayComplete}
        >
          <div className="form-section">
            <FormField
              id="scw-secret-key"
              label={t("accountCreation.scaleway.secretKey")}
              value={config.SCW_SECRET_KEY}
              onChange={(v) => setField("SCW_SECRET_KEY", v)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              type="password"
            />
            <FormField
              id="scw-project-id"
              label={t("accountCreation.scaleway.projectId")}
              value={config.SCW_DEFAULT_PROJECT_ID}
              onChange={(v) => setField("SCW_DEFAULT_PROJECT_ID", v)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            />
            <FormField
              id="deploy-path"
              label={t("accountCreation.scaleway.deployPath")}
              value={config.DEPLOY_PATH}
              onChange={(v) => setField("DEPLOY_PATH", v)}
              placeholder={t("accountCreation.scaleway.deployPath.placeholder")}
              rightElement={
                <button
                  className="btn btn-secondary"
                  onClick={openFolderDialog}
                  id="btn-browse-folder"
                >
                  <FolderOpen size={14} />
                  {t("btn.browse")}
                </button>
              }
            />

            {/* The secret key only. A Project ID that does not exist is a
                different mistake, and the Scaleway run names it with the
                context that makes it fixable. */}
            <CredentialWarning
              request={
                config.SCW_SECRET_KEY
                  ? { service: "scaleway", secretKey: config.SCW_SECRET_KEY }
                  : null
              }
              message={t("accountCreation.invalid.scaleway")}
            />
          </div>
        </ServiceAccountCard>

        {/* Resend — kept ahead of the registrar card, in the order step 2
            runs them: the records to publish are Resend's to hand out. */}
        <ServiceAccountCard
          serviceName={t("accountCreation.resend.title")}
          serviceIcon={<Mail size={16} color="var(--color-primary-text)" />}
          helpAnchor="svc-resend"
          isComplete={isResendComplete}
        >
          <div className="form-section">
            <FormField
              id="resend-api-key"
              label={t("accountCreation.resend.apiKey")}
              value={config.RESEND_API_KEY}
              onChange={(v) => setField("RESEND_API_KEY", v)}
              placeholder="re_abc123..."
              type="password"
            />
            {/* Pre-filled with `mail.<domain>` as soon as the domain is known,
                and editable from here: the DNS records, the Resend domain and
                the sender address are all built from this value. */}
            <FormField
              id="mail-subdomain"
              label={t("accountCreation.resend.mailSubdomain")}
              value={config.MAIL_SUBDOMAIN}
              onChange={(v) => setField("MAIL_SUBDOMAIN", v)}
              placeholder={defaultMailSubdomain}
            />

            <CredentialWarning
              request={
                config.RESEND_API_KEY
                  ? { service: "resend", apiKey: config.RESEND_API_KEY }
                  : null
              }
              message={t("accountCreation.invalid.resend")}
            />
          </div>
        </ServiceAccountCard>

        {/* Spaceship */}
        <ServiceAccountCard
          serviceName={
            usesOtherDomainProvider
              ? t("accountCreation.domainProvider.title")
              : t("accountCreation.spaceship.title")
          }
          serviceIcon={<Globe size={16} color="var(--color-primary-text)" />}
          helpAnchor="svc-spaceship"
          isComplete={isSpaceshipComplete}
        >
          <div className="form-section">
            <FormField
              id="domain"
              label={t("accountCreation.spaceship.domain")}
              value={config.DOMAIN}
              onChange={(v) => setField("DOMAIN", v)}
              placeholder={t("accountCreation.spaceship.domain.placeholder")}
            />
            <label className="manual-check">
              <input
                type="checkbox"
                checked={usesOtherDomainProvider}
                onChange={(e) =>
                  setField(
                    "USE_OTHER_DOMAIN_PROVIDER",
                    e.target.checked ? "true" : "false",
                  )
                }
              />
              <span className="manual-check__label">
                {t("accountCreation.spaceship.otherProvider")}
              </span>
            </label>
            {!usesOtherDomainProvider && (
              <>
                <FormField
                  id="spaceship-api-key"
                  label={t("accountCreation.spaceship.apiKey")}
                  value={config.SPACESHIP_API_KEY}
                  onChange={(v) => setField("SPACESHIP_API_KEY", v)}
                  placeholder="sk_abc123..."
                />
                <FormField
                  id="spaceship-api-secret"
                  label={t("accountCreation.spaceship.apiSecret")}
                  value={config.SPACESHIP_API_SECRET}
                  onChange={(v) => setField("SPACESHIP_API_SECRET", v)}
                  placeholder="ss_xyz789..."
                  type="password"
                />
                {/* Both halves or nothing: a secret typed against a key that
                    is still half-pasted would be reported as refused. */}
                <CredentialWarning
                  request={
                    config.SPACESHIP_API_KEY && config.SPACESHIP_API_SECRET
                      ? {
                          service: "spaceship",
                          apiKey: config.SPACESHIP_API_KEY,
                          apiSecret: config.SPACESHIP_API_SECRET,
                        }
                      : null
                  }
                  message={t("accountCreation.invalid.spaceship")}
                />
              </>
            )}
          </div>
        </ServiceAccountCard>
      </div>
    </WizardLayout>
  );
}
