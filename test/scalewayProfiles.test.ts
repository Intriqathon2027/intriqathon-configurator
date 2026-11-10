import { describe, it, expect } from 'vitest'
import {
  SCALEWAY_PROFILES,
  DEFAULT_SCALEWAY_PROFILE,
  scalewayProfileFor,
} from '../src/shared/scalewayProfiles'
import { rootVolumeFor } from '../src/electron/services/ScalewayService'

describe('scalewayProfiles', () => {
  it('offers the three participant tiers, 100 by default', () => {
    expect(SCALEWAY_PROFILES.map(p => p.participants)).toEqual([50, 100, 500])
    expect(DEFAULT_SCALEWAY_PROFILE).toBe('100')
  })

  it('falls back to the default profile for an empty or unknown value', () => {
    expect(scalewayProfileFor('').id).toBe('100')
    expect(scalewayProfileFor(undefined).id).toBe('100')
    expect(scalewayProfileFor('9999').id).toBe('100')
    // A tier that no longer exists falls back too
    expect(scalewayProfileFor('1000').id).toBe('100')
    expect(scalewayProfileFor('500').commercialType).toBe('GP1-XS')
  })

  it('gives 500 participants at least 4 vCPU and 16 GB, and never shrinks with more people', () => {
    expect(scalewayProfileFor('500').vcpu).toBeGreaterThanOrEqual(4)
    expect(scalewayProfileFor('500').ramGb).toBeGreaterThanOrEqual(16)
    for (let i = 1; i < SCALEWAY_PROFILES.length; i++) {
      expect(SCALEWAY_PROFILES[i].vcpu).toBeGreaterThanOrEqual(SCALEWAY_PROFILES[i - 1].vcpu)
      expect(SCALEWAY_PROFILES[i].ramGb).toBeGreaterThanOrEqual(SCALEWAY_PROFILES[i - 1].ramGb)
    }
  })
})

describe('rootVolumeFor', () => {
  it('follows the image flavour', () => {
    expect(rootVolumeFor('instance_sbs', 40)).toEqual({ size: 40e9, volume_type: 'sbs_volume' })
    expect(rootVolumeFor('instance_local', 20)).toEqual({ size: 20e9, volume_type: 'l_ssd' })
  })

  it('clamps a local volume into the offer constraint', () => {
    expect(rootVolumeFor('instance_local', 80, { max_size: 40e9 })?.size).toBe(40e9)
    expect(rootVolumeFor('instance_local', 5, { min_size: 20e9 })?.size).toBe(20e9)
    // Block storage is not bound by the local constraint
    expect(rootVolumeFor('instance_sbs', 80, { max_size: 40e9 })?.size).toBe(80e9)
  })

  it('asks for nothing when the flavour or the size is unknown', () => {
    expect(rootVolumeFor(undefined, 40)).toBeNull()
    expect(rootVolumeFor('instance_sbs', undefined)).toBeNull()
  })
})
