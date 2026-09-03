/**
 * Text-size preference: a multiplier applied to `--font-scale`, which every
 * typography token in index.css derives from.
 *
 * It lives outside AppContext so the Settings slider can import the bounds
 * without that file exporting non-components (fast refresh).
 */

export const FONT_SCALE_KEY = 'intriqathon-font-scale'

export const FONT_SCALE_MIN = 0.85
export const FONT_SCALE_MAX = 1.4
export const FONT_SCALE_STEP = 0.05
export const FONT_SCALE_DEFAULT = 1

export function clampFontScale(value: number): number {
  if (!Number.isFinite(value)) return FONT_SCALE_DEFAULT
  return Math.min(Math.max(value, FONT_SCALE_MIN), FONT_SCALE_MAX)
}

export function loadFontScale(): number {
  const saved = localStorage.getItem(FONT_SCALE_KEY)
  return saved ? clampFontScale(parseFloat(saved)) : FONT_SCALE_DEFAULT
}
