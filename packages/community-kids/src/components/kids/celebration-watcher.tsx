'use client'

import { useEffect, useState } from 'react'
import { isLevelUp } from '@/lib/level-info'
import {
  diffDrawerSnapshots,
  isDrawerSnapshotList,
  parseToolsSnapshot,
  type StoredToolsSnapshot,
  type ToolsGain,
  toolsSnapshot,
} from '@/lib/tools-gain'
import type { StudentLevelSlug } from '@/lib/types'
import { LevelUpCelebration } from './level-up-celebration'
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

/**
 * Funde as conquistas do nível e das ferramentas em um único overlay. A revisão curta
 * chega no chrome; os ids só são buscados quando ela muda.
 */
export function CelebrationWatcher({
  levelSlug,
  toolsRevision,
  ownsStudio,
  profileKey,
}: {
  levelSlug?: string
  toolsRevision: string | null
  /** `null` = consulta desconhecida; `false` = produto não adquirido. */
  ownsStudio: boolean | null
  profileKey: string
}) {
  const [levelUp, setLevelUp] = useState<StudentLevelSlug | null>(null)
  const [toolsGain, setToolsGain] = useState<ToolsGain | null>(null)

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()

    void (async () => {
      const nextLevel = detectLevelUp(profileKey, levelSlug)
      let gain: ToolsGain | null = null
      try {
        gain = await detectToolsGain(profileKey, toolsRevision, ownsStudio, controller.signal)
      } catch {
        // Rede/JSON indisponível não interfere na comemoração de nível.
      }
      if (cancelled) return

      if (nextLevel) {
        setLevelUp(nextLevel)
        setToolsGain(gain)
      } else if (gain) {
        setToolsGain(gain)
      }
    })()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [levelSlug, ownsStudio, profileKey, toolsRevision])

  if (levelUp) {
    return (
      <LevelUpCelebration
        level={levelUp}
        tools={toolsGain}
        onClose={() => {
          setLevelUp(null)
          setToolsGain(null)
        }}
      />
    )
  }
  if (toolsGain) return <ToolsCelebration gain={toolsGain} onClose={() => setToolsGain(null)} />
  return null
}
