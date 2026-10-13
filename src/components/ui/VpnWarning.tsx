import { ExternalLink } from 'lucide-react'
import { WarningDialog } from './WarningDialog'

interface VpnWarningProps {
  isEn: boolean
  /** The config.<domain> address about to be opened, shown in the dialog. */
  host: string
  onCancel: () => void
  onProceed: () => void
}

/**
 * Shown every time config.<domain> is about to be opened.
 *
 * A VPN cannot be told apart reliably from here: the OS lists tunnel interfaces
 * (utun, wg, tun…) whether or not they carry traffic — macOS keeps several
 * for iCloud alone — and the exit IP is only known to a third-party lookup.
 * Guessing wrong either way is worse than asking, so the dialog is raised
 * unconditionally and the reader decides.
 */
export function VpnWarning({ isEn, host, onCancel, onProceed }: VpnWarningProps) {
  return (
    <WarningDialog
      idPrefix="vpn"
      title={isEn ? 'Turn off your VPN' : 'Désactivez votre VPN'}
      intro={isEn
        ? <>If you are using a VPN, turn it off before opening <code>{host}</code>.</>
        : <>Si vous utilisez un VPN, désactivez-le avant d'ouvrir <code>{host}</code>.</>}
      note={isEn
        ? 'A VPN can block or disrupt the connection to the admin panel. Not using one? You can open the link directly.'
        : "Un VPN peut bloquer ou perturber la connexion au panneau d'administration. Vous n'en utilisez pas ? Ouvrez directement le lien."}
      cancelLabel={isEn ? 'Cancel' : 'Annuler'}
      proceedLabel={isEn ? 'Open the link' : 'Ouvrir le lien'}
      proceedIcon={<ExternalLink size={14} />}
      onCancel={onCancel}
      onProceed={onProceed}
    />
  )
}
