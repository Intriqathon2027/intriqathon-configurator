import { createContext, useContext } from 'react'

export interface HelpFocus {
  /** Field id whose help section should be scrolled to and flashed. */
  id: string
  /** Bumped on every request so repeat clicks re-trigger the flash. */
  nonce: number
}

export interface HelpNav {
  /** Opens the help panel; with a field id, jumps to and flashes that section. */
  openHelp: (fieldId?: string) => void
}

export const HelpNavContext = createContext<HelpNav>({ openHelp: () => {} })

export function useHelpNav(): HelpNav {
  return useContext(HelpNavContext)
}
