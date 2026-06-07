import { Database, Folder, Key } from 'lucide-react'
import { WizardLayout } from '../components/layout/WizardLayout'
import { FormField } from '../components/ui/FormField'
import { ExternalLinkBtn } from '../components/ui/ExternalLinkBtn'
import { useApp } from '../context/AppContext'

function HelpContent() {
  const { state } = useApp()
  const isEn = state.language === 'en'
  return <>
    <h3><Database size={15} /> {isEn ? 'Creating a Supabase project' : 'Créer un projet Supabase'}</h3>
    <p>{isEn ? 'Go to supabase.com, create an account and click "New Project".' : 'Allez sur supabase.com, créez un compte et cliquez sur "New Project".'}</p>
    <h3><Key size={15} /> {isEn ? 'Getting the keys' : 'Récupérer les clés'}</h3>
    <ol>
      <li>{isEn ? 'Project Settings > API' : 'Project Settings > API'}</li>
      <li>{isEn ? 'Copy the Project URL → SUPABASE_URL' : 'Copiez le Project URL → SUPABASE_URL'}</li>
      <li>{isEn ? 'Copy anon public key → SUPABASE_ANON_KEY' : 'Copiez la clé anon public → SUPABASE_ANON_KEY'}</li>
      <li>{isEn ? 'Copy service_role key → SUPABASE_SERVICE_ROLE_KEY' : 'Copiez la clé service_role → SUPABASE_SERVICE_ROLE_KEY'}</li>
    </ol>
    <h3><Folder size={15} /> {isEn ? 'Database URL (Prisma)' : 'URL de base de données (Prisma)'}</h3>
    <p>{isEn
      ? 'Project Settings > Database > Connection String > Prisma. Copy both the "Connection pooling" (DATABASE_URL) and "Direct connection" (DIRECT_URL) URLs.'
      : 'Project Settings > Database > Connection String > Prisma. Copiez l\'URL "Connection pooling" (DATABASE_URL) et l\'URL "Direct connection" (DIRECT_URL).'
    }</p>
    <h3>S3</h3>
    <p>{isEn
      ? 'Project Settings > Storage > S3 Access Keys. Generate new access keys and copy them.'
      : 'Project Settings > Storage > S3 Access Keys. Générez de nouvelles clés d\'accès et copiez-les.'
    }</p>
    <p>{isEn
      ? 'Also create the following buckets in Storage > Files: public_files (public), evaluations, submissions, users, annonces.'
      : 'Créez aussi les buckets suivants dans Storage > Files : public_files (public), evaluations, submissions, users, annonces.'
    }</p>
  </>
}

export function Step2Supabase() {
  const { t, config, setField } = useApp()

  return (
    <WizardLayout
      title={t('step2.title')}
      stepBadge={`${t('nav.step')} 2 — ${t('step2.label')}`}
      description={t('step2.desc')}
      helpContent={<HelpContent />}
    >
      <div className="link-buttons-row">
        <ExternalLinkBtn url="https://supabase.com/dashboard" label={t('step2.supabase')} />
      </div>

      <div className="card">
        <div className="form-section-title"><Database size={14} />{t('step2.section.credentials')}</div>
        <div className="form-section">
          <FormField id="supabase-url" label={t('step2.supabaseUrl')} envKey="SUPABASE_URL"
            value={config.SUPABASE_URL} onChange={v => setField('SUPABASE_URL', v)}
            placeholder="https://xxxxx.supabase.co" hint={t('step2.supabaseUrl.hint')} />
          <FormField id="supabase-anon" label={t('step2.supabaseAnonKey')} envKey="SUPABASE_ANON_KEY"
            value={config.SUPABASE_ANON_KEY} onChange={v => setField('SUPABASE_ANON_KEY', v)}
            placeholder="eyJhbGciOiJ..." hint={t('step2.supabaseAnonKey.hint')} />
          <FormField id="supabase-service" label={t('step2.supabaseServiceKey')} envKey="SUPABASE_SERVICE_ROLE_KEY"
            value={config.SUPABASE_SERVICE_ROLE_KEY} onChange={v => setField('SUPABASE_SERVICE_ROLE_KEY', v)}
            placeholder="eyJhbGciOiJ..." hint={t('step2.supabaseServiceKey.hint')} type="password" />
        </div>
      </div>

      <div className="card">
        <div className="form-section-title"><Database size={14} />{t('step2.section.database')}</div>
        <div className="form-section">
          <FormField id="database-url" label={t('step2.databaseUrl')} envKey="DATABASE_URL"
            value={config.DATABASE_URL} onChange={v => setField('DATABASE_URL', v)}
            placeholder="postgresql://postgres.xxx:[password]@aws-0-eu-west-3.pooler.supabase.com:6543/postgres"
            hint={t('step2.databaseUrl.hint')} />
          <FormField id="direct-url" label={t('step2.directUrl')} envKey="DIRECT_URL"
            value={config.DIRECT_URL} onChange={v => setField('DIRECT_URL', v)}
            placeholder="postgresql://postgres:[password]@db.xxx.supabase.co:5432/postgres"
            hint={t('step2.directUrl.hint')} />
        </div>
      </div>

      <div className="card">
        <div className="form-section-title"><Key size={14} />{t('step2.section.s3')}</div>
        <div className="form-section">
          <div className="form-row">
            <FormField id="s3-access-key" label={t('step2.s3AccessKey')} envKey="S3_ACCESS_KEY_ID"
              value={config.S3_ACCESS_KEY_ID} onChange={v => setField('S3_ACCESS_KEY_ID', v)}
              placeholder="625b..." />
            <FormField id="s3-secret" label={t('step2.s3SecretKey')} envKey="S3_SECRET_ACCESS_KEY"
              value={config.S3_SECRET_ACCESS_KEY} onChange={v => setField('S3_SECRET_ACCESS_KEY', v)}
              placeholder="5w36..." type="password" />
          </div>
        </div>
      </div>
    </WizardLayout>
  )
}
