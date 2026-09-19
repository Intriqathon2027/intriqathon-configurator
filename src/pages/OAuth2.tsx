import { Shield } from "lucide-react";
import { WizardLayout } from "../components/layout/WizardLayout";
import { FormField } from "../components/ui/FormField";
import { ServiceAccountCard } from "../components/ui/ServiceAccountCard";
import { CopyRow } from "../components/ui/CopyBlock";
import { useApp } from "../context/AppContext";
import { OAuth2HelpContent } from "../PagesHelpContent/OAuth2HelpContent";

export function OAuth2() {
  const { t, config, setField } = useApp();
  const domain = config.DOMAIN || "<DOMAIN>";

  const discordCallback = `https://${domain}/api/auth/discord/callback`;
  const githubHomepage = `https://${domain}`;
  const githubCallback = `https://${domain}/api/auth/github/callback`;

  const isDiscordComplete = !!(
    config.DISCORD_CLIENT_ID && config.OAUTH2_DISCORD_CLIENT_SECRET
  );
  const isGithubComplete = !!(
    config.GITHUB_CLIENT_ID && config.OAUTH2_GITHUB_CLIENT_SECRET
  );
  const isBotComplete = !!(
    config.CLIENT_ID &&
    config.BOT_TOKEN &&
    config.DEV_SERVER_ID &&
    config.GUILD_ID
  );

  return (
    <WizardLayout
      title={t("step3.title")}
      stepBadge={`${t("nav.step")} 3 — ${t("step3.label")}`}
      description={t("step3.desc")}
      helpContent={<OAuth2HelpContent />}
    >
      <div className="service-account-grid">
        {/* Discord */}
        <ServiceAccountCard
          serviceName={t("step3.section.discord")}
          serviceIcon={<Shield size={16} color="var(--color-primary-text)" />}
          helpAnchor="svc-discord"
          isComplete={isDiscordComplete}
        >
          <div style={{ marginBottom: "16px" }}>
            <CopyRow
              label={t("step3.discord.callback")}
              content={discordCallback}
            />
          </div>
          <div className="form-section">
            <FormField
              id="discord-client-id"
              label={t("step3.discordClientId")}
              value={config.DISCORD_CLIENT_ID}
              onChange={(v) => setField("DISCORD_CLIENT_ID", v)}
              placeholder="1234567890123456789"
            />
            <FormField
              id="discord-secret"
              label={t("step3.discordSecret")}
              value={config.OAUTH2_DISCORD_CLIENT_SECRET}
              onChange={(v) => setField("OAUTH2_DISCORD_CLIENT_SECRET", v)}
              placeholder="abc123..."
              type="password"
            />
          </div>
        </ServiceAccountCard>

        {/* Discord Bot */}
        <ServiceAccountCard
          serviceName={t("step3.section.bot")}
          serviceIcon={<Shield size={16} color="var(--color-primary-text)" />}
          helpAnchor="svc-bot"
          isComplete={isBotComplete}
        >
          <div className="form-section">
            <FormField
              id="bot-client-id"
              label={t("step3.botClientId")}
              value={config.CLIENT_ID}
              onChange={(v) => setField("CLIENT_ID", v)}
              placeholder="1234567890123456789"
            />
            <FormField
              id="bot-token"
              label={t("step3.botToken")}
              value={config.BOT_TOKEN}
              onChange={(v) => setField("BOT_TOKEN", v)}
              placeholder="MTIzNDU..."
              type="password"
            />
            <FormField
              id="dev-server-id"
              label={t("step3.devServerId")}
              value={config.DEV_SERVER_ID}
              onChange={(v) => setField("DEV_SERVER_ID", v)}
              placeholder="1234567890123456789"
            />
            <FormField
              id="guild-id"
              label={t("step3.guildId")}
              value={config.GUILD_ID}
              onChange={(v) => setField("GUILD_ID", v)}
              placeholder="1234567890123456789"
            />
          </div>
        </ServiceAccountCard>

        {/* GitHub */}
        <ServiceAccountCard
          serviceName={t("step3.section.github")}
          serviceIcon={<Shield size={16} color="var(--color-primary-text)" />}
          helpAnchor="svc-github"
          isComplete={isGithubComplete}
        >
          <div style={{ marginBottom: "16px" }}>
            <CopyRow
              label={t("step3.github.homepage")}
              content={githubHomepage}
            />
            <CopyRow
              label={t("step3.github.callback")}
              content={githubCallback}
            />
          </div>
          <div className="form-section">
            <FormField
              id="github-client-id"
              label={t("step3.githubClientId")}
              value={config.GITHUB_CLIENT_ID}
              onChange={(v) => setField("GITHUB_CLIENT_ID", v)}
              placeholder="Iv1.abc123..."
            />
            <FormField
              id="github-secret"
              label={t("step3.githubSecret")}
              value={config.OAUTH2_GITHUB_CLIENT_SECRET}
              onChange={(v) => setField("OAUTH2_GITHUB_CLIENT_SECRET", v)}
              placeholder="ghp_abc123..."
              type="password"
            />
          </div>
        </ServiceAccountCard>
      </div>
    </WizardLayout>
  );
}
