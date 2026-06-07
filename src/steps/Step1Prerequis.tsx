import { Server, Cpu, MemoryStick, HardDrive, Monitor, FolderOpen, Key } from 'lucide-react'
import { WizardLayout } from '../components/layout/WizardLayout'
import { FormField } from '../components/ui/FormField'
import { ExternalLinkBtn } from '../components/ui/ExternalLinkBtn'
import { useApp } from '../context/AppContext'

function HelpContent() {
  const { state } = useApp()
  const lang = state.language

  if (lang === 'en') {
    return <>
      <h3><Server size={15} /> Creating a Scaleway Instance</h3>
      <p>Log in to <strong>Scaleway Console</strong>, go to <strong>Compute &gt; Instances</strong> and click <strong>Create Instance</strong>.</p>
      <ol>
        <li>Select region (Paris or Amsterdam recommended)</li>
        <li>Choose image: <strong>Ubuntu 24.04 LTS</strong></li>
        <li>Select type: <strong>DEV1-M</strong> (4 vCPU, 16 GB RAM) or equivalent</li>
        <li>Add volume: 10 GB</li>
        <li>Create or import an SSH key to connect later</li>
        <li>Click <strong>Create Instance</strong> and wait for it to start</li>
        <li>Copy the public IPv4 address</li>
      </ol>
      <h3><Key size={15} /> Creating an SSH Key</h3>
      <p>In your terminal, run:</p>
      <p><code>ssh-keygen -t ed25519 -C "hackathon"</code></p>
      <p>Then copy the public key (<code>~/.ssh/id_ed25519.pub</code>) into Scaleway when creating the instance.</p>
    </>
  }

  return <>
    <h3><Server size={15} /> Créer une instance Scaleway</h3>
    <p>Connectez-vous à la <strong>Console Scaleway</strong>, allez dans <strong>Compute &gt; Instances</strong> et cliquez sur <strong>Créer une instance</strong>.</p>
    <ol>
      <li>Sélectionnez une région (Paris ou Amsterdam recommandé)</li>
      <li>Choisissez l'image : <strong>Ubuntu 24.04 LTS</strong></li>
      <li>Sélectionnez le type : <strong>DEV1-M</strong> (4 vCPU, 16 Go RAM) ou équivalent</li>
      <li>Ajoutez un volume : 10 Go minimum</li>
      <li>Créez ou importez une clé SSH pour vous connecter ultérieurement</li>
      <li>Cliquez sur <strong>Créer l'instance</strong> et attendez le démarrage</li>
      <li>Copiez l'adresse IPv4 publique de l'instance</li>
    </ol>
    <h3><Key size={15} /> Créer une clé SSH</h3>
    <p>Dans votre terminal, exécutez :</p>
    <p><code>ssh-keygen -t ed25519 -C "hackathon"</code></p>
    <p>Copiez ensuite la clé publique (<code>~/.ssh/id_ed25519.pub</code>) dans Scaleway lors de la création de l'instance.</p>
  </>
}

export function Step1Prerequis() {
  const { t, config, setField } = useApp()

  const openFolderDialog = async () => {
    if (window.electronAPI) {
      const path = await window.electronAPI.openFolderDialog()
      if (path) setField('DEPLOY_PATH', path)
    }
  }

  const specs = [
    { key: 'cpu', icon: <Cpu size={15} />, label: 'CPU', value: t('step1.spec.cpu') },
    { key: 'ram', icon: <MemoryStick size={15} />, label: 'RAM', value: t('step1.spec.ram') },
    { key: 'os', icon: <Monitor size={15} />, label: 'OS', value: t('step1.spec.os') },
    { key: 'storage', icon: <HardDrive size={15} />, label: 'Stockage', value: t('step1.spec.storage') },
  ]

  return (
    <WizardLayout
      title={t('step1.title')}
      stepBadge={`${t('nav.step')} 1 — ${t('step1.label')}`}
      description={t('step1.desc')}
      helpContent={<HelpContent />}
    >
      {/* External link */}
      <div className="link-buttons-row">
        <ExternalLinkBtn url="https://console.scaleway.com" label={t('step1.scaleway')} />
        <ExternalLinkBtn
          url="https://www.scaleway.com/en/docs/organizations-and-projects/how-to/create-ssh-key/"
          label={t('step1.ssh.info')}
          variant="secondary"
        />
      </div>

      {/* Instance specs card */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-title">
          <Server size={16} color="var(--color-primary)" />
          {t('step1.specs.title')}
        </div>
        <div className="spec-list">
          {specs.map(spec => (
            <div className="spec-item" key={spec.key}>
              <div className="spec-icon">{spec.icon}</div>
              <div>
                <div className="spec-label">{spec.label}</div>
                <div className="spec-value">{spec.value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Form */}
      <div className="card">
        <div className="form-section">
          <FormField
            id="domain"
            label={t('step1.domain')}
            envKey="DOMAIN"
            value={config.DOMAIN}
            onChange={v => setField('DOMAIN', v)}
            placeholder={t('step1.domain.placeholder')}
            hint={t('step1.domain.hint')}
          />
          <FormField
            id="deploy-path"
            label={t('step1.deployPath')}
            value={config.DEPLOY_PATH}
            onChange={v => setField('DEPLOY_PATH', v)}
            placeholder={t('step1.deployPath.placeholder')}
            hint={t('step1.deployPath.hint')}
            rightElement={
              <button className="btn btn-secondary" onClick={openFolderDialog} id="btn-browse-folder">
                <FolderOpen size={14} />
                {t('btn.browse')}
              </button>
            }
          />
          <FormField
            id="ipv4"
            label={t('step1.ipv4')}
            envKey="IPV4_INSTANCE"
            value={config.IPV4_INSTANCE}
            onChange={v => setField('IPV4_INSTANCE', v)}
            placeholder={t('step1.ipv4.placeholder')}
            hint={t('step1.ipv4.hint')}
          />
        </div>
      </div>
    </WizardLayout>
  )
}
