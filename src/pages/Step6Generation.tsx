import { useState } from 'react'
import { Zap, BookOpen } from 'lucide-react'
import { WizardLayout } from '../components/layout/WizardLayout'
import { Step6AutoTab } from '../components/deploy/Step6AutoTab'
import { Step6ManualTab } from '../components/deploy/Step6ManualTab'
import { useApp } from '../context/AppContext'

type DeployTab = 'auto' | 'manual'

export function Step6Generation() {
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
        {activeTab === 'auto' ? <Step6AutoTab /> : <Step6ManualTab />}
      </div>
    </WizardLayout>
  )
}
