import { useState } from 'react'
import type { ScenePaintRgba } from '../../../scene/imagePaint'
import { moldaPreferenceKey } from '../../../state/interfacePreferences'

const isColor = (value: unknown): value is ScenePaintRgba =>
  Array.isArray(value) &&
  value.length === 4 &&
  value.every((channel) => Number.isInteger(channel) && channel >= 0 && channel <= 255) &&
  value[3] === 255

export function usePaintFavorites() {
  const [key] = useState(() => moldaPreferenceKey('paint.colors'))
  const [initial] = useState(() => {
    try {
      const raw = localStorage.getItem(key)
      const value: unknown = raw === null ? [] : JSON.parse(raw)
      if (!Array.isArray(value) || value.length > 256 || !value.every(isColor))
        return { colors: [], unavailable: true }
      return {
        colors: value.filter(
          (color, index) =>
            value.findIndex((entry) => entry.every((channel, i) => channel === color[i])) === index,
        ),
        unavailable: false,
      }
    } catch {
      return { colors: [], unavailable: true }
    }
  })
  const [colors, setColors] = useState<ScenePaintRgba[]>(initial.colors)
  const [unavailable, setUnavailable] = useState(initial.unavailable)
  const remember = (color: ScenePaintRgba) => {
    if (
      colors.some((entry) => entry.every((channel, i) => channel === color[i])) ||
      colors.length >= 256
    )
      return
    const next = [...colors, color]
    setColors(next)
    try {
      localStorage.setItem(key, JSON.stringify(next))
      setUnavailable(false)
    } catch {
      setUnavailable(true)
    }
  }
  return { colors, remember, unavailable, full: colors.length >= 256 }
}
