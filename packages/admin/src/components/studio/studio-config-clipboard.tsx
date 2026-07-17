'use client'

import {
  BLOCK_LEVEL_OPTIONS,
  type BlockLevel,
  type IDEMode,
  normalizeBlockLevel,
} from '@sistemazero/studio'
import { Button } from '@sistemazero/ui/button'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

/**
 * Curadoria REAPROVEITÁVEL do bloco Estúdio — nível, modos, categorias sempre visíveis,
 * lista de blocos e "revelar avançado". É só a paleta/curadoria: NÃO leva projeto inicial,
 * atividade, cadeia nem vitrine (esses são específicos da aula).
 */
export interface StudioConfigSnapshot {
  level: BlockLevel
  modes: IDEMode[]
  categories: string[]
  allowReveal: boolean
  allowBlocks: string[]
}

const KEY = 'sz:admin:studio-block-config'

/** Lê a config copiada do localStorage (cliente), tolerante a lixo/versão antiga. */
function readClip(): StudioConfigSnapshot | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const v = JSON.parse(raw) as Partial<StudioConfigSnapshot>
    if (!v || typeof v !== 'object' || typeof v.level !== 'string') return null
    return {
      // O localStorage guarda config LEGADA (escala de 3) para sempre — a
      // normalização aqui é PERMANENTE, não migração one-off.
      level: normalizeBlockLevel(v.level) ?? 'iniciante-2d',
      modes: Array.isArray(v.modes) ? (v.modes as IDEMode[]) : [],
      categories: Array.isArray(v.categories)
        ? v.categories.filter((c) => typeof c === 'string')
        : [],
      allowReveal: v.allowReveal !== false,
      allowBlocks: Array.isArray(v.allowBlocks)
        ? v.allowBlocks.filter((c) => typeof c === 'string')
        : [],
    }
  } catch {
    return null
  }
}

/**
 * "Área de transferência" da configuração do bloco Estúdio: **Copiar** guarda a curadoria atual
 * no navegador; **Colar** aplica a última copiada no form. Reaproveita a mesma curadoria em todas
 * as aulas de um curso (e até entre cursos) sem reconfigurar tudo. Persiste em `localStorage` →
 * sobrevive à navegação entre aulas e vale entre abas. Sem backend.
 */
export function StudioConfigClipboard({
  current,
  onPaste,
}: {
  current: StudioConfigSnapshot
  onPaste: (snap: StudioConfigSnapshot) => void
}) {
  const [clip, setClip] = useState<StudioConfigSnapshot | null>(null)

  // localStorage é só do cliente: lê na montagem (pega o que foi copiado em OUTRA aula/aba).
  useEffect(() => {
    setClip(readClip())
  }, [])

  function copy() {
    try {
      localStorage.setItem(KEY, JSON.stringify(current))
      setClip(current)
      const n = current.allowBlocks.length
      toast.success(
        n > 0 ? `Configuração copiada (lista de ${n} bloco(s)).` : 'Configuração copiada.',
      )
    } catch {
      toast.error('Não consegui copiar a configuração.')
    }
  }

  function paste() {
    const snap = readClip()
    if (!snap) {
      toast.error('Nada copiado ainda. Copie a configuração de outra aula primeiro.')
      return
    }
    onPaste(snap)
    setClip(snap)
    toast.success('Configuração colada.')
  }

  const clipLevelLabel = clip
    ? (BLOCK_LEVEL_OPTIONS.find((o) => o.value === clip.level)?.label ?? clip.level)
    : null
  const pasteLabel = clip
    ? `Colar configuração (${clipLevelLabel}${clip.allowBlocks.length ? ` · ${clip.allowBlocks.length} blocos` : ''})`
    : 'Colar configuração'

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border border-dashed p-2.5">
      <span className="mr-auto text-muted-foreground text-xs">
        Reaproveite a curadoria (nível, modos, categorias e lista de blocos) nas outras aulas do
        curso.
      </span>
      <Button type="button" variant="outline" size="sm" onClick={copy}>
        Copiar configuração
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={paste} disabled={!clip}>
        {pasteLabel}
      </Button>
    </div>
  )
}
