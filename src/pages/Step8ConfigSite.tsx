import { Globe, Settings, CheckCircle, Info } from 'lucide-react'
import { WizardLayout } from '../components/layout/WizardLayout'
import { ExternalLinkBtn } from '../components/ui/ExternalLinkBtn'
import { useApp } from '../context/AppContext'

export function Step8ConfigSite() {
  const { t, config, state } = useApp()
  const domain = config.DOMAIN || '<DOMAIN>'
  const isEn = state.language === 'en'

  return (
    <WizardLayout
      title={t('step8.title')}
      stepBadge={`${t('nav.step')} 8 — ${t('step8.label')}`}
      description={t('step8.desc')}
    >
      {/* Links */}
      <div className="card">
        <div className="card-title"><Globe size={16} color="var(--color-primary)" />{isEn ? 'Access your platforms' : 'Accéder à vos plateformes'}</div>
        <div className="link-buttons-row">
          <ExternalLinkBtn
            url={`https://config.${domain}/`}
            label={`${t('step8.config.btn')} — config.${domain}`}
            variant="primary"
          />
          <ExternalLinkBtn
            url={`https://${domain}/`}
            label={`${t('step8.site.btn')} — ${domain}`}
          />
        </div>
      </div>

      {/* Instructions */}
      <div className="card">
        <div className="card-title"><Settings size={16} color="var(--color-primary)" />{isEn ? 'Next steps' : 'Prochaines étapes'}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="info-box info">
            <CheckCircle size={15} className="info-box-icon" />
            <div className="info-box-text">
              <div className="info-box-title">{isEn ? 'Admin Panel' : 'Panneau d\'administration'}</div>
              {t('step8.tip')}
            </div>
          </div>
          <div className="info-box warning">
            <Info size={15} className="info-box-icon" />
            <div className="info-box-text">
              <div className="info-box-title">{isEn ? 'Email sending' : 'Envoi d\'emails'}</div>
              {t('step8.tip2')}
            </div>
          </div>
          <div className="info-box tip">
            <CheckCircle size={15} className="info-box-icon" />
            <div className="info-box-text">
              <div className="info-box-title">{isEn ? 'Hackathon name' : 'Nom du hackathon'}</div>
              {isEn
                ? 'Go to Settings > Text in the admin panel to set the hackathon name and create the GitHub organization.'
                : 'Allez dans Paramètres > Texte dans le panneau admin pour définir le nom du hackathon et créer l\'organisation GitHub.'
              }
            </div>
          </div>
          <div className="info-box tip">
            <CheckCircle size={15} className="info-box-icon" />
            <div className="info-box-text">
              <div className="info-box-title">{isEn ? 'Supabase security (RLS)' : 'Sécurité Supabase (RLS)'}</div>
              {isEn
                ? 'In Supabase Table Editor, enable Row Level Security (RLS) on each table for production-level security.'
                : 'Dans le Table Editor Supabase, activez la protection Row Level Security (RLS) sur chaque table pour une sécurité optimale.'
              }
            </div>
          </div>
        </div>
      </div>

      {/* Done badge */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '24px' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '10px',
          background: 'var(--color-primary-light)', color: 'var(--color-primary)',
          padding: '16px 28px', borderRadius: '12px', fontWeight: 700, fontSize: '16px',
          border: '1px solid rgba(29,180,138,0.3)'
        }}>
          <CheckCircle size={22} />
          {isEn ? 'Your hackathon infrastructure is configured!' : 'Votre infrastructure hackathon est configurée !'}
        </div>
      </div>
    </WizardLayout>
  )
}
