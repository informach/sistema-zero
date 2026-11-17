import type { JSX } from 'react'
import { lazy, Suspense, useEffect, useState } from 'react'
import type { EditableStudioProject as Project } from '../src/core/editableProject'
import type { StudioLessonProps } from '../src/studio/types'
import { PLAYGROUND_LESSON } from './initialQuery'

/**
 * A aula dentro do playground (`/aula?aula=<curso>/<aula>&bloco=<chave>`): monta o `StudioLesson`
 * com o projeto inicial, o nível, os blocos liberados e os modos do bloco de Estúdio do manifesto,
 * do mesmo jeito que a página da aula monta (`member-shell/.../studio-block.tsx`). Existe para os
 * e2e dos cursos gravados refazerem os gestos ensinados sem subir o app inteiro. Não grava nada:
 * `persistence="none"`.
 *
 * Os manifestos entram por `import.meta.glob` preguiçoso: só o da aula pedida é baixado, e nada
 * disto entra no pacote da lista inicial.
 */
const MANIFESTOS = import.meta.glob<{ default: unknown }>([
  '../../../docs/aulas-interativas/faisca/cade-todo-mundo/*.manifesto.json',
  '../../../docs/aulas-interativas/faisca/desafio-primeiro-jogo/*.manifesto.json',
])

const StudioLesson = lazy(async () => {
  const module = await import('../src/studio/StudioLesson')
  return { default: module.StudioLesson }
})

interface BlocoDeEstudio {
  key: string
  content: {
    kind: 'studio'
    initialProject: Project
    level?: StudioLessonProps['level']
    allowBlocks?: readonly string[]
    allowCategories?: readonly string[]
    allowedModes?: StudioLessonProps['allowedModes']
    allowLevelReveal?: boolean
  }
}

type Estado =
  | { fase: 'carregando' }
  | { fase: 'erro'; recado: string }
  | { fase: 'pronta'; bloco: BlocoDeEstudio }

function caminhoDoManifesto(aula: string): string | null {
  const [curso, nome] = aula.split('/')
  if (!curso || !nome) return null
  const fim = `/${curso}/${nome}.manifesto.json`
  // Aceita o nome do arquivo inteiro (`desafio-dia-1`) ou só a aula (`dia-1`, `aula-1`).
  return (
    Object.keys(MANIFESTOS).find((caminho) => caminho.endsWith(fim)) ??
    Object.keys(MANIFESTOS).find(
      (caminho) => caminho.includes(`/${curso}/`) && caminho.endsWith(`-${nome}.manifesto.json`),
    ) ??
    null
  )
}

async function carregar(aula: string, chave: string | null): Promise<Estado> {
  const caminho = caminhoDoManifesto(aula)
  const importar = caminho ? MANIFESTOS[caminho] : undefined
  if (!importar) return { fase: 'erro', recado: `Aula não encontrada: ${aula}` }
  const manifesto = (await importar()).default as { blocks?: unknown[] }
  const estudios = (manifesto.blocks ?? []).filter(
    (bloco): bloco is BlocoDeEstudio =>
      Boolean(bloco) &&
      typeof bloco === 'object' &&
      (bloco as { content?: { kind?: string } }).content?.kind === 'studio',
  )
  const bloco = chave ? estudios.find((item) => item.key === chave) : estudios[0]
  if (!bloco)
    return { fase: 'erro', recado: `Bloco de Estúdio não encontrado: ${chave ?? '(primeiro)'}` }
  return { fase: 'pronta', bloco }
}

export function LessonHarness(): JSX.Element {
  const [estado, setEstado] = useState<Estado>({ fase: 'carregando' })

  useEffect(() => {
    let vivo = true
    const pedido = PLAYGROUND_LESSON
    if (!pedido) {
      setEstado({ fase: 'erro', recado: 'Faltou ?aula=<curso>/<aula>.' })
      return
    }
    carregar(pedido.aula, pedido.bloco)
      .then((proximo) => {
        if (vivo) setEstado(proximo)
      })
      .catch((erro: unknown) => {
        if (vivo) setEstado({ fase: 'erro', recado: String(erro) })
      })
    return () => {
      vivo = false
    }
  }, [])

  if (estado.fase === 'erro') {
    return (
      <div
        role="alert"
        className="flex h-full items-center justify-center bg-sz-bg text-sm text-sz-fg"
      >
        {estado.recado}
      </div>
    )
  }
  const carregando = (
    <div
      role="status"
      className="flex h-full items-center justify-center bg-sz-bg text-sm text-sz-fg-soft"
    >
      Carregando a aula…
    </div>
  )
  if (estado.fase === 'carregando') return carregando
  const { content } = estado.bloco
  return (
    <Suspense fallback={carregando}>
      <div className="h-full" data-aula-bloco={estado.bloco.key}>
        <StudioLesson
          initialProject={content.initialProject}
          level={content.level}
          allowBlocks={content.allowBlocks}
          allowCategories={content.allowCategories}
          allowedModes={content.allowedModes}
          allowLevelReveal={content.allowLevelReveal}
          // Os mesmos cortes que a página da aula faz para o aluno.
          features={{ extensions: false, professional: false, terminal: false }}
          persistence="none"
          blockUnloadWhenDirty={false}
        />
      </div>
    </Suspense>
  )
}
