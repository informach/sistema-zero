import { useEffect, useMemo, useRef, useState } from 'react'
import type { MoldaSceneDocument } from '../../../scene/document'
import { prepareScenePaintIndicators } from '../../../scene/paintIndicators'
import { resolveScenePaintIndicators } from '../../../state/scenePaintIndicatorsTask'

export function useScenePaintIndicators(source: MoldaSceneDocument | null) {
  const plan = useMemo(() => (source ? prepareScenePaintIndicators(source) : null), [source])
  const revision = useRef(0)
  const [settled, setSettled] = useState<{
    plan: typeof plan
    colors?: ReadonlyMap<string, readonly string[]>
    error: boolean
  } | null>(null)
  useEffect(() => {
    if (!source || !plan?.pending.length) return
    const controller = new AbortController()
    void resolveScenePaintIndicators(source, plan, ++revision.current, controller.signal).then(
      (colors) => {
        if (!controller.signal.aborted) setSettled({ plan, colors, error: false })
      },
      () => {
        if (!controller.signal.aborted) setSettled({ plan, error: true })
      },
    )
    return () => controller.abort()
  }, [source, plan])
  const current = settled?.plan === plan ? settled : null
  return {
    colors: current?.colors ?? plan?.colors,
    status:
      !plan?.pending.length || current?.colors
        ? null
        : current?.error
          ? 'Cores das peças indisponíveis.'
          : 'Conferindo as cores das peças…',
  }
}
