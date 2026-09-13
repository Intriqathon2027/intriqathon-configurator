import { useSession, type ManualKey } from '../../context/SessionContext'

interface ManualCheckProps {
  /** Which manual action this box records. */
  checkKey: ManualKey
  label: string
  /** Run when the box is ticked or unticked — used to validate a wizard step. */
  onChange?: (checked: boolean) => void
}

/**
 * The acknowledgement for a manual step that has no field to fill in.
 *
 * Creating a bucket, adding a DNS record or pasting a subdomain leaves nothing
 * behind in the config, so nothing downstream could tell whether it was done —
 * the pre-deployment check included. Ticking the box is what says so, and it is
 * the reader's word, deliberately: no API call can prove the record they added
 * is the one that was asked for.
 */
export function ManualCheck({ checkKey, label, onChange }: ManualCheckProps) {
  const { isManualChecked, setManualCheck } = useSession()
  const checked = isManualChecked(checkKey)

  const toggle = (next: boolean) => {
    setManualCheck(checkKey, next)
    onChange?.(next)
  }

  return (
    <label className={`manual-check${checked ? ' manual-check--done' : ''}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={e => toggle(e.target.checked)}
      />
      <span className="manual-check__label">{label}</span>
    </label>
  )
}
