import { useEffect, useState } from 'react'

/** Plateforme hôte. La détection de plateforme n'a rien à voir avec le
 *  déploiement : elle ne passe plus par le pont SSH. */
export function usePlatform() {
  const [platform, setPlatform] = useState<string>('darwin')

  useEffect(() => {
    let active = true
    if (!window.electronAPI?.getPlatform) return
    void window.electronAPI.getPlatform().then((value) => {
      if (active) setPlatform(value)
    })
    return () => { active = false }
  }, [])

  return { platform, isWindows: platform === 'win32' }
}
