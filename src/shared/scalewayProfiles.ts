/**
 * How big the instance is, chosen by how many people the hackathon expects.
 *
 * One list for both routes: the automation creates exactly the type named
 * here, and the manual configuration recommends exactly these specs — so what
 * is launched for the reader and what they are told to launch by hand cannot
 * drift apart.
 *
 * Reference point: 500 participants need at least 4 vCPU and 16 GB of RAM.
 * The other tiers are scaled around it.
 *
 * Every type here can be created by an Organization whose payment method is
 * validated, without identity verification (Scaleway "Organization quotas"
 * page): DEV1-M 8, DEV1-L 5, GP1-XS 1. POP2 and the larger GP1 types need a
 * verified identity, which is why there is no tier above 500. GP1-XS allows a
 * single instance at that level — enough for the one instance a hackathon
 * runs on, but an older one of that type has to be deleted before another
 * can be created. `ScalewayService` picks the root volume type from the image.
 */

export type ScalewayProfileId = '50' | '100' | '500'

export interface ScalewayProfile {
  id: ScalewayProfileId
  participants: number
  /** Scaleway `commercial_type` the automation creates. */
  commercialType: string
  vcpu: number
  ramGb: number
  /** Root volume size requested at creation. */
  storageGb: number
}

export const SCALEWAY_PROFILES: readonly ScalewayProfile[] = [
  { id: '50', participants: 50, commercialType: 'DEV1-M', vcpu: 3, ramGb: 4, storageGb: 20 },
  { id: '100', participants: 100, commercialType: 'DEV1-L', vcpu: 4, ramGb: 8, storageGb: 40 },
  { id: '500', participants: 500, commercialType: 'GP1-XS', vcpu: 4, ramGb: 16, storageGb: 40 },
]

export const DEFAULT_SCALEWAY_PROFILE: ScalewayProfileId = '100'

/** The profile saved in the config, or the default one for an empty or unknown value. */
export function scalewayProfileFor(id: string | undefined): ScalewayProfile {
  return (
    SCALEWAY_PROFILES.find(p => p.id === id) ??
    SCALEWAY_PROFILES.find(p => p.id === DEFAULT_SCALEWAY_PROFILE)!
  )
}

/** One-line label for a selector option. */
export function scalewayProfileLabel(profile: ScalewayProfile, isEn: boolean): string {
  const gb = isEn ? 'GB' : 'Go'
  const upTo = isEn ? 'Up to' : "Jusqu'à"
  return `${upTo} ${profile.participants} participants — ${profile.commercialType} · ${profile.vcpu} vCPU / ${profile.ramGb} ${gb}`
}
