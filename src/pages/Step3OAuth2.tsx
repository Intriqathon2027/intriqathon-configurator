import { Shield, AlertTriangle } from 'lucide-react'
import { WizardLayout } from '../components/layout/WizardLayout'
import { FormField } from '../components/ui/FormField'
import { ExternalLinkBtn } from '../components/ui/ExternalLinkBtn'
import { CopyRow } from '../components/ui/CopyBlock'
import { useApp } from '../context/AppContext'

function HelpContent() {
  const { state } = useApp()
  const isEn = state.language === 'en'
  return <>
    <h3><Shield size={15} /> Discord OAuth2</h3>
    <ol>
      <li>{isEn ? 'Go to discord.com/developers/applications' : 'Allez sur discord.com/developers/applications'}</li>
      <li>{isEn ? 'Click "New Application" and give it a name (e.g. "Hackathon_Auth")' : 'Cliquez "New Application" et donnez un nom (ex: "Hackathon_Auth")'}</li>
      <li>{isEn ? 'In General Information: copy the Application ID → DISCORD_CLIENT_ID' : 'Dans General Information : copiez l\'Application ID → DISCORD_CLIENT_ID'}</li>
      <li>{isEn ? 'In OAuth2: click "Reset Secret" and copy it → OAUTH2_DISCORD_CLIENT_SECRET' : 'Dans OAuth2 : cliquez "Reset Secret" et copiez → OAUTH2_DISCORD_CLIENT_SECRET'}</li>
      <li>{isEn ? 'In OAuth2 > Redirects: add the callback URL shown below' : 'Dans OAuth2 > Redirects : ajoutez l\'URL de callback affichée ci-dessous'}</li>
      <li>{isEn ? 'Click "Save Changes"' : 'Cliquez "Save Changes"'}</li>
    </ol>
    <div className="info-box warning" style={{ marginTop: '12px' }}>
      <AlertTriangle size={15} className="info-box-icon" />
      <div className="info-box-text">
        <strong>{isEn ? 'Warning' : 'Attention'}</strong> : {isEn
          ? 'Discord only shows the secret once. Copy it immediately!'
          : 'Discord n\'affiche le secret qu\'une seule fois. Copiez-le immédiatement !'
        }
      </div>
    </div>
    <h3><Shield size={15} /> GitHub OAuth2</h3>
    <ol>
      <li>{isEn ? 'GitHub > Settings > Developer settings > OAuth Apps' : 'GitHub > Settings > Developer settings > OAuth Apps'}</li>
      <li>{isEn ? 'Click "New OAuth App"' : 'Cliquez "New OAuth App"'}</li>
      <li>{isEn ? 'Fill in Application name, Homepage URL, and Callback URL' : 'Remplissez le nom, Homepage URL, et Callback URL'}</li>
      <li>{isEn ? 'Copy the Client ID → GITHUB_CLIENT_ID' : 'Copiez le Client ID → GITHUB_CLIENT_ID'}</li>
      <li>{isEn ? 'Generate a new secret → OAUTH2_GITHUB_CLIENT_SECRET' : 'Générez un secret → OAUTH2_GITHUB_CLIENT_SECRET'}</li>
    </ol>
    <div className="info-box warning" style={{ marginTop: '12px' }}>
      <AlertTriangle size={15} className="info-box-icon" />
      <div className="info-box-text">
        <strong>{isEn ? 'Warning' : 'Attention'}</strong> : {isEn
          ? 'GitHub also only shows the secret once!'
          : 'GitHub n\'affiche lui aussi le secret qu\'une seule fois !'
        }
      </div>
    </div>
  </>
}

export function Step3OAuth2() {
  const { t, config, setField } = useApp()
  const domain = config.DOMAIN || '<DOMAIN>'

  const discordCallback = `https://${domain}/api/auth/discord/callback`
  const githubHomepage = `https://${domain}`
  const githubCallback = `https://${domain}/api/auth/github/callback`

  return (
    <WizardLayout
      title={t('step3.title')}
      stepBadge={`${t('nav.step')} 3 — ${t('step3.label')}`}
      description={t('step3.desc')}
      helpContent={<HelpContent />}
    >
      {/* Discord */}
      <div className="card">
        <div className="form-section-title"><Shield size={14} />{t('step3.section.discord')}</div>
        <div className="link-buttons-row">
          <ExternalLinkBtn url="https://discord.com/developers/applications" label={t('step3.discord.btn')} />
        </div>
        <div style={{ marginBottom: '16px' }}>
          <CopyRow label={t('step3.discord.callback')} content={discordCallback} />
        </div>
        <div className="form-section">
          <div className="form-row">
            <FormField id="discord-client-id" label={t('step3.discordClientId')} envKey="DISCORD_CLIENT_ID"
              value={config.DISCORD_CLIENT_ID} onChange={v => setField('DISCORD_CLIENT_ID', v)}
              placeholder="1234567890123456789" />
            <FormField id="discord-secret" label={t('step3.discordSecret')} envKey="OAUTH2_DISCORD_CLIENT_SECRET"
              value={config.OAUTH2_DISCORD_CLIENT_SECRET} onChange={v => setField('OAUTH2_DISCORD_CLIENT_SECRET', v)}
              placeholder="abc123..." type="password" />
          </div>
        </div>
      </div>

      {/* GitHub */}
      <div className="card">
        <div className="form-section-title"><Shield size={14} />{t('step3.section.github')}</div>
        <div className="link-buttons-row">
          <ExternalLinkBtn url="https://github.com/settings/developers" label={t('step3.github.btn')} />
        </div>
        <div style={{ marginBottom: '16px' }}>
          <CopyRow label={t('step3.github.homepage')} content={githubHomepage} />
          <CopyRow label={t('step3.github.callback')} content={githubCallback} />
        </div>
        <div className="form-section">
          <div className="form-row">
            <FormField id="github-client-id" label={t('step3.githubClientId')} envKey="GITHUB_CLIENT_ID"
              value={config.GITHUB_CLIENT_ID} onChange={v => setField('GITHUB_CLIENT_ID', v)}
              placeholder="Iv1.abc123..." />
            <FormField id="github-secret" label={t('step3.githubSecret')} envKey="OAUTH2_GITHUB_CLIENT_SECRET"
              value={config.OAUTH2_GITHUB_CLIENT_SECRET} onChange={v => setField('OAUTH2_GITHUB_CLIENT_SECRET', v)}
              placeholder="ghp_abc123..." type="password" />
          </div>
        </div>
      </div>
    </WizardLayout>
  )
}
