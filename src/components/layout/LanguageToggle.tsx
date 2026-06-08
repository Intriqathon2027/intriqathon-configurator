import { useApp } from '../../context/AppContext'

export function LanguageToggle() {
  const { state, dispatch, t } = useApp()
  const { language } = state

  return (
    <div className="lang-toggle">
      <button
        className={`lang-btn ${language === 'fr' ? 'active' : ''}`}
        onClick={() => dispatch({ type: 'SET_LANGUAGE', lang: 'fr' })}
        id="btn-lang-fr"
      >
        {t('lang.fr')}
      </button>
      <button
        className={`lang-btn ${language === 'en' ? 'active' : ''}`}
        onClick={() => dispatch({ type: 'SET_LANGUAGE', lang: 'en' })}
        id="btn-lang-en"
      >
        {t('lang.en')}
      </button>
    </div>
  )
}
