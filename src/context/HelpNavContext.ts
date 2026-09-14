import { createContext, useContext } from 'react'

export interface HelpFocus {
  /** Anchor of the service block to scroll to and flash — without `help-`. */
  id: string
  /** Bumped on every request so repeat clicks re-trigger the flash. */
  nonce: number
}

export interface HelpNav {
  /** Opens the help panel; with an anchor, jumps to and flashes that block. */
  openHelp: (anchor?: string) => void
}

export const HelpNavContext = createContext<HelpNav>({ openHelp: () => {} })

export function useHelpNav(): HelpNav {
  return useContext(HelpNavContext)
}
