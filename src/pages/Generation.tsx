import { useState } from 'react'
import { Zap, BookOpen } from 'lucide-react'
import { WizardLayout } from '../components/layout/WizardLayout'
import { DeployAutoTab } from '../components/deploy/DeployAutoTab.tsx'
import { DeployManualTab } from '../components/deploy/DeployManualTab.tsx'
import { useApp } from '../context/AppContext'

type DeployTab = 'auto' | 'manual'

export function Generation() {
  const { t } = useApp()
  const [activeTab, setActiveTab] = useState<DeployTab>('auto')

  return (
    <WizardLayout
      title={t('step6.title')}
      stepBadge={`${t('nav.step')} 6 — ${t('step6.label')}`}
      description={t('step6.desc')}
    >
      {/* Tab switcher */}
      <div className="deploy-tabs">
        <button
          className={`deploy-tab ${activeTab === 'auto' ? 'active' : ''}`}
          onClick={() => setActiveTab('auto')}
          id="tab-deploy-auto"
        >
          <Zap size={14} />
          {t('step6.tab.auto')}
        </button>
        <button
          className={`deploy-tab ${activeTab === 'manual' ? 'active' : ''}`}
          onClick={() => setActiveTab('manual')}
          id="tab-deploy-manual"
        >
          <BookOpen size={14} />
          {t('step6.tab.manual')}
        </button>
      </div>

      {/* Tab content */}
      <div className="deploy-tab-content">
        {activeTab === 'auto' ? <DeployAutoTab /> : <DeployManualTab />}
      </div>
    </WizardLayout>
  )
}
