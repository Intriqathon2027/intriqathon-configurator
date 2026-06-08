import { Mail, AlertTriangle, Info } from 'lucide-react'
import { WizardLayout } from '../components/layout/WizardLayout'
import { FormField } from '../components/ui/FormField'
import { ExternalLinkBtn } from '../components/ui/ExternalLinkBtn'
import { CopyRow } from '../components/ui/CopyBlock'
import { useApp } from '../context/AppContext'

function HelpContent() {
  const { state } = useApp()
  const isEn = state.language === 'en'
  return <>
    <h3><Mail size={15} /> {isEn ? 'Creating a Resend account' : 'Créer un compte Resend'}</h3>
    <ol>
      <li>{isEn ? 'Go to resend.com and sign up' : 'Allez sur resend.com et créez un compte'}</li>
      <li>{isEn ? 'Verify your email address' : 'Vérifiez votre adresse email'}</li>
    </ol>
    <h3>{isEn ? 'Adding a domain' : 'Ajouter un domaine'}</h3>
    <ol>
      <li>{isEn ? 'In the Resend dashboard, go to Domains > Add Domain' : 'Dans le dashboard Resend, allez dans Domains > Add Domain'}</li>
      <li>{isEn ? 'Enter the subdomain: mail.<your-domain>' : 'Entrez le sous-domaine : mail.<votre-domaine>'}</li>
      <li>{isEn ? 'Add the DNS records shown by Resend to your registrar' : 'Ajoutez les entrées DNS affichées par Resend chez votre registrar'}</li>
      <li>{isEn ? 'Add the DMARC and A records shown in this step' : 'Ajoutez les entrées DMARC et A affichées dans cette étape'}</li>
      <li>{isEn ? 'In Resend > Domains, click the three dots then Restart to verify' : 'Dans Resend > Domains, cliquez les trois points puis Restart pour vérifier'}</li>
    </ol>
    <h3>{isEn ? 'Creating an API key' : 'Créer une clé API'}</h3>
    <ol>
      <li>{isEn ? 'Resend dashboard > API Keys > Create API Key' : 'Dashboard Resend > API Keys > Create API Key'}</li>
      <li>{isEn ? 'Give it a name (e.g. "Intriqathon Backend")' : 'Donnez-lui un nom (ex : "Intriqathon Backend")'}</li>
      <li>{isEn ? 'Copy the key — it is only shown once!' : 'Copiez la clé — elle n\'est affichée qu\'une seule fois !'}</li>
    </ol>
    <div className="info-box warning" style={{ marginTop: '12px' }}>
      <AlertTriangle size={15} className="info-box-icon" />
      <div className="info-box-text">
        <strong>{isEn ? 'DNS propagation' : 'Propagation DNS'}</strong> : {isEn
          ? 'DNS changes can take a few minutes to several hours. The domain must show as "Verified" in Resend before emails are sent.'
          : 'Les changements DNS peuvent prendre quelques minutes à plusieurs heures. Le domaine doit apparaître comme "Verified" dans Resend avant d\'envoyer des emails.'
        }
      </div>
    </div>
  </>
}

export function Step4Email() {
  const { t, config, setField } = useApp()
  const domain = config.DOMAIN || '<DOMAIN>'
  const ipv4 = config.IPV4_INSTANCE || '<IPV4_INSTANCE>'

  const mailSubdomain = `mail.${domain}`
  const dnsRecords = [
    { type: 'TXT', host: `_dmarc.mail.${domain}`, answer: 'v=DMARC1;p=none;', ttl: 'Auto' },
    { type: 'A', host: domain, answer: ipv4, ttl: 'Auto' },
    { type: 'A', host: `config.${domain}`, answer: ipv4, ttl: 'Auto' },
  ]

  return (
    <WizardLayout
      title={t('step4.title')}
      stepBadge={`${t('nav.step')} 4 — ${t('step4.label')}`}
      description={t('step4.desc')}
      helpContent={<HelpContent />}
    >
      <div className="link-buttons-row">
        <ExternalLinkBtn url="https://resend.com/domains" label={t('step4.resend.btn')} />
      </div>

      {/* Subdomain */}
      <div className="card">
        <div className="card-title"><Mail size={16} color="var(--color-primary)" />{t('step4.subdomain')}</div>
        <CopyRow label={t('step4.subdomain')} content={mailSubdomain} />
      </div>

      {/* DNS Table */}
      <div className="card">
        <div className="card-title"><Info size={16} color="var(--color-primary)" />{t('step4.dns.title')}</div>
        <table className="dns-table">
          <thead>
            <tr>
              <th>{t('step4.dns.type')}</th>
              <th>{t('step4.dns.host')}</th>
              <th>{t('step4.dns.answer')}</th>
              <th>{t('step4.dns.ttl')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {dnsRecords.map((rec, i) => (
              <tr key={i}>
                <td><span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{rec.type}</span></td>
                <td>{rec.host}</td>
                <td>{rec.answer}</td>
                <td>{rec.ttl}</td>
                <td>
                  <button
                    className="btn btn-copy"
                    onClick={() => navigator.clipboard.writeText(`${rec.type},${rec.host},${rec.answer},${rec.ttl}`)}
                  >
                    Copier
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="info-box warning" style={{ marginTop: '16px' }}>
          <AlertTriangle size={15} className="info-box-icon" />
          <div className="info-box-text">{t('step4.warning')}</div>
        </div>
      </div>

      {/* API Key & Email fields */}
      <div className="card">
        <div className="form-section">
          <FormField id="resend-key" label={t('step4.resendKey')} envKey="RESEND_API_KEY"
            value={config.RESEND_API_KEY} onChange={v => setField('RESEND_API_KEY', v)}
            placeholder="re_abc123..." type="password" />
          <FormField id="from-email" label={t('step4.fromEmail')} envKey="FROM_EMAIL"
            value={config.FROM_EMAIL} onChange={v => setField('FROM_EMAIL', v)}
            placeholder={`Hackathon Team <onboarding@mail.${domain}>`}
            hint={t('step4.fromEmail.hint')} />
          <FormField id="allowed-emails" label={t('step4.allowedEmails')} envKey="ALLOWED_EMAILS"
            value={config.ALLOWED_EMAILS} onChange={v => setField('ALLOWED_EMAILS', v)}
            placeholder="*"
            hint={t('step4.allowedEmails.hint')} />
        </div>
      </div>
    </WizardLayout>
  )
}
