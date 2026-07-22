import { useState, useEffect } from 'react'
import { createDeployBridge } from '../services/deployBridge'

export function usePlatform() {
  const [platform, setPlatform] = useState<string>('darwin')
  
  useEffect(() => {
    createDeployBridge().getPlatform().then(setPlatform)
  }, [])
  
  return { platform, isWindows: platform === 'win32' }
}
