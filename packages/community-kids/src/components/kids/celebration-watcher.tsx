'use client'

import {
  KIDS_CREATOR_CAPABILITIES,
  type KidsCreatorCapability,
  type KidsJourneyView,
} from '@sistemazero/core/journey'
import { sessionFetch as fetch } from '@sistemazero/member-shell/lib/session-fetch'
import { useEffect, useState } from 'react'
import { isLevelUp, LEVEL_ORDER } from '@/lib/level-info'
import { moldaCapabilitiesGain } from '@/lib/molda-level-gain'
import {
  diffDrawerSnapshots,
  isDrawerSnapshotList,
  parseToolsSnapshot,
  type StoredToolsSnapshot,
  type ToolsGain,
  toolsSnapshot,
} from '@/lib/tools-gain'
import type { StudentLevelSlug } from '@/lib/types'
import { LevelUpCelebration, type LevelUpTrail } from './level-up-celebration'
import { useChildOverlayState } from './platform-renovation-notice'
import { ToolsCelebration } from './tools-celebration'

interface DrawerSnapshotResponse {
  drawers: unknown
}

async function detectToolsGain(
  profileKey: string,
  revision: string | null,
  ownsStudio: boolean | null,
  signal: AbortSignal,
): Promise<ToolsGain | null> {
  // Desconhecido e sem produto são estados explícitos: nenhum deles pode apagar o
  // snapshot anterior. Sem mudança de revisão, não há payload nem trabalho adicional.
  if (ownsStudio !== true || !revision) return null

  const key = `sz:kids:tools:${profileKey}`
  let before: StoredToolsSnapshot | null
  try {
    before = parseToolsSnapshot(localStorage.getItem(key))
  } catch {
    return null
  }
  if (before?.revision === revision) return null

  const response = await fetch('/api/members/studio-unlock-drawers', {
    cache: 'no-store',
    signal,
  })
  if (!response.ok) return null
  const body: unknown = await response.json()
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null
  const drawers = (body as DrawerSnapshotResponse).drawers
  if (!isDrawerSnapshotList(drawers)) return null

  const gain = before ? diffDrawerSnapshots(before.blockIds, drawers) : null
  try {
    localStorage.setItem(key, JSON.stringify(toolsSnapshot(revision, drawers)))
  } catch {
    // A detecção de nível é independente; quota/privacidade aqui não pode engoli-la.
  }
  return gain
}

function detectLevelUp(profileKey: string, levelSlug: string | undefined): StudentLevelSlug | null {
  if (!levelSlug) return null
  try {
    const key = `sz:kids:level:${profileKey}`
    const seen = localStorage.getItem(key)
    if (
      seen &&
      LEVEL_ORDER.indexOf(seen as StudentLevelSlug) >
        LEVEL_ORDER.indexOf(levelSlug as StudentLevelSlug)
    )
      return null
    const result = isLevelUp(seen, levelSlug) ? (levelSlug as StudentLevelSlug) : null
    try {
      localStorage.setItem(key, levelSlug)
    } catch {
      // O resultado já foi detectado; falhar ao persistir não deve apagá-lo.
    }
    return result
  } catch {
    return null
  }
}

/** UI-only observation; it never grants resources or treats an unknown snapshot as empty. */
function detectMoldaGain(
  profileKey: string,
  capabilities: readonly KidsCreatorCapability[],
  ownsMolda: boolean | null,
): string | null {
  try {
    const key = `sz:kids:capabilities:${profileKey}`
    const raw = localStorage.getItem(key)
    let before: readonly KidsCreatorCapability[] | null = null
    if (raw) {
      try {
        const parsed: unknown = JSON.parse(raw)
        if (
          parsed &&
          typeof parsed === 'object' &&
          'version' in parsed &&
          parsed.version === 1 &&
          'capabilities' in parsed &&
          Array.isArray(parsed.capabilities) &&
          parsed.capabilities.length <= KIDS_CREATOR_CAPABILITIES.length &&
          parsed.capabilities.every((capability) =>
            KIDS_CREATOR_CAPABILITIES.includes(capability),
          ) &&
          new Set(parsed.capabilities).size === parsed.capabilities.length
        )
          before = parsed.capabilities
      } catch {
        /* Unknown storage version/data is a first observation, never a grant. */
      }
    }
    const current = KIDS_CREATOR_CAPABILITIES.filter(
      (capability) => before?.includes(capability) || capabilities.includes(capability),
    )
    const gain = before && ownsMolda === true ? moldaCapabilitiesGain(before, current) : null
    // These are pedagogical rights observed in a valid view, independent of the purchased product.
    try {
      localStorage.setItem(key, JSON.stringify({ version: 1, capabilities: current }))
    } catch {
      /* Privacy/quota cannot create a fake gain. */
    }
    return gain
  } catch {
    return null
  }
}

/**
 * Funde as conquistas do nível e das ferramentas em um único overlay. A revisão curta
 * chega no chrome; os ids só são buscados quando ela muda.
 */
export function CelebrationWatcher({
  journey,
  toolsRevision,
  ownsStudio,
  ownsMolda = null,
  profileKey,
}: {
  journey: KidsJourneyView | null
  toolsRevision: string | null
  /** `null` = consulta desconhecida; `false` = produto não adquirido. */
  ownsStudio: boolean | null
  /** Product ownership is distinct from pedagogical capability acquisition. */
  ownsMolda?: boolean | null
  profileKey: string
}) {
  const [levelUp, setLevelUp] = useState<StudentLevelSlug | null>(null)
  const [toolsGain, setToolsGain] = useState<ToolsGain | null>(null)
  const [moldaGain, setMoldaGain] = useState<string | null>(null)
  const { noticePending, guideOpen } = useChildOverlayState()
  const levelSlug = journey?.earned?.level
  const capabilitiesRevision = journey?.earned?.capabilities.join(',') ?? null

  useEffect(() => {
    if (noticePending || !levelSlug || capabilitiesRevision === null) return
    let cancelled = false
    const controller = new AbortController()

    void (async () => {
      const nextLevel = detectLevelUp(profileKey, levelSlug)
      const nextMolda = detectMoldaGain(
        profileKey,
        capabilitiesRevision ? (capabilitiesRevision.split(',') as KidsCreatorCapability[]) : [],
        ownsMolda,
      )
      let gain: ToolsGain | null = null
      try {
        gain = await detectToolsGain(profileKey, toolsRevision, ownsStudio, controller.signal)
      } catch {
        // Rede/JSON indisponível não interfere na comemoração de nível.
      }
      if (cancelled) return

      if (nextLevel) {
        setLevelUp(nextLevel)
        setMoldaGain(nextMolda)
        setToolsGain(gain)
      } else if (gain) {
        setToolsGain(gain)
      }
    })()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [
    levelSlug,
    capabilitiesRevision,
    ownsStudio,
    ownsMolda,
    profileKey,
    toolsRevision,
    noticePending,
  ])

  if (noticePending || guideOpen) return null

  if (levelUp) {
    return (
      <LevelUpCelebration
        level={levelUp}
        tools={toolsGain}
        molda={moldaGain}
        trail={levelUpTrail(journey, levelUp)}
        onClose={() => {
          setLevelUp(null)
          setMoldaGain(null)
          setToolsGain(null)
        }}
      />
    )
  }
  if (toolsGain) return <ToolsCelebration gain={toolsGain} onClose={() => setToolsGain(null)} />
  return null
}

/** No currículo, o que a trilha recém-aberta tem; fora dele, nada (a festa de sempre). */
function levelUpTrail(
  journey: KidsJourneyView | null,
  level: StudentLevelSlug,
): LevelUpTrail | null {
  const stages = journey?.curriculum?.stages
  if (!stages?.length) return null
  if (level === 'god')
    return {
      title: 'Lenda',
      previous: stages.at(-1)?.title ?? null,
      courses: [],
      mission: null,
      powers: 0,
      legend: true,
    }
  const index = stages.findIndex((stage) => stage.level === level)
  const stage = stages[index]
  if (!stage) return null
  return {
    title: stage.title,
    previous: stages[index - 1]?.title ?? null,
    courses: [stage.base2d.title, stage.base3d.title].filter((title): title is string => !!title),
    mission: stage.mission.title ?? null,
    powers: stage.powers.length,
    legend: false,
  }
}
