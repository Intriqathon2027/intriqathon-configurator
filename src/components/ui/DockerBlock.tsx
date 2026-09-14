import { CommandBlock } from './CopyBlock'

/**
 * A shell command shown on its own, without an eyebrow. Kept as its own name
 * because that is what the Docker steps read as at the call sites; the block
 * itself is `CommandBlock`.
 */
export function DockerBlock({ command }: { command: string }) {
  return <CommandBlock command={command} />
}
